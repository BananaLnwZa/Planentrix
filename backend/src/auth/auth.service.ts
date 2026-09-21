import * as bcrypt from "bcrypt";
import { createHash, timingSafeEqual } from "crypto";
import * as jwt from "jsonwebtoken";
import { promises as fs } from "fs";
import path from "path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "../config/db";
import type { AuthRole } from "../middlewares/verifyToken";
import { validateConstraintForSave } from "../user/services/constraint-validation";

type RequestBody = Record<string, unknown>;

interface BusyDay {
  day: number;
  start: string;
  end: string;
}

interface UserIdRow extends RowDataPacket {
  user_id: number;
}

interface AdminIdRow extends RowDataPacket {
  admin_id: number;
}

interface NamedLockRow extends RowDataPacket {
  lock_acquired: number | null;
}

interface UserLoginRow extends UserIdRow {
  user_name: string;
  user_password: string;
}

interface AdminLoginRow extends AdminIdRow {
  admin_name: string;
  admin_password: string;
  role: "university_staff" | "instructor";
}

interface UserRefreshRow extends UserIdRow {
  user_name: string;
}

interface UserProfileRow extends UserIdRow {
  user_name: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: number;
  birthdate: string | null;
  gender: string;
  user_pic: string | null;
  status: string;
  last_login: Date | null;
}

interface AdminProfileRow extends AdminIdRow {
  admin_name: string;
  admin_email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  address: string | null;
  department_id: number | null;
  role: "university_staff" | "instructor";
  status: string;
}

interface DepartmentRow extends RowDataPacket {
  department_id: number;
}

interface RegistrationOptionRow extends RowDataPacket {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  department_id: number | null;
  department_code: string | null;
  department_name: string | null;
}

export interface RegistrationDepartmentOption {
  department_id: number;
  department_code: string;
  department_name: string;
}

export interface RegistrationFacultyOption {
  faculty_id: number;
  faculty_code: string;
  faculty_name: string;
  departments: RegistrationDepartmentOption[];
}

interface UserPictureRow extends RowDataPacket {
  user_pic: string | null;
}

interface AccountCandidate {
  id: number;
  username: string;
  passwordHash: string;
  role: AuthRole;
}

export interface LoginResult {
  message: string;
  role: AuthRole;
  accountId: number;
  userId?: number;
  adminId?: number;
  accessToken: string;
  refreshToken?: string;
  expiresIn: "30m" | "24h";
}

export class AuthServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly errors?: string[],
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export const getRegistrationOptions = async (): Promise<{
  faculties: RegistrationFacultyOption[];
}> => {
  const [rows] = await db.query<RegistrationOptionRow[]>(
    `SELECT f.faculty_id, f.faculty_code, f.faculty_name,
            d.department_id, d.department_code, d.department_name
     FROM faculties f
     LEFT JOIN departments d
       ON d.faculty_id = f.faculty_id
      AND d.is_active = 1
     WHERE f.is_active = 1
     ORDER BY f.faculty_name ASC, d.department_name ASC`,
  );

  const faculties = new Map<number, RegistrationFacultyOption>();
  for (const row of rows) {
    const faculty = faculties.get(row.faculty_id) ?? {
      faculty_id: row.faculty_id,
      faculty_code: row.faculty_code,
      faculty_name: row.faculty_name,
      departments: [],
    };

    if (
      row.department_id !== null &&
      row.department_code !== null &&
      row.department_name !== null
    ) {
      faculty.departments.push({
        department_id: row.department_id,
        department_code: row.department_code,
        department_name: row.department_name,
      });
    }

    faculties.set(row.faculty_id, faculty);
  }

  return { faculties: [...faculties.values()] };
};

const asBody = (input: unknown): RequestBody => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AuthServiceError("Request body must be an object", 400);
  }
  return input as RequestBody;
};

const optionalString = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  return typeof value === "string" ? value.trim() : null;
};

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AuthServiceError(`${field} is required`, 400);
  }
  return value;
};

const optionalInteger = (value: unknown, field: string): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new AuthServiceError(`${field} must be an integer`, 400);
  }
  return parsed;
};

const parseBusyDays = (value: unknown): BusyDay[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new AuthServiceError("busy_days must be an array", 400);
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AuthServiceError(`busy_days[${index}] is invalid`, 400);
    }
    const busyDay = item as RequestBody;
    const day = optionalInteger(busyDay.day, `busy_days[${index}].day`);
    const start = requiredString(
      busyDay.start,
      `busy_days[${index}].start`,
    );
    const end = requiredString(busyDay.end, `busy_days[${index}].end`);

    if (day === null || day < 1 || day > 7) {
      throw new AuthServiceError(
        `busy_days[${index}].day must be between 1 and 7`,
        400,
      );
    }

    return { day, start, end };
  });
};

const usernamePattern = /^(?=.*[A-Za-z])[A-Za-z0-9]{3,}$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*[\W_]).{8,}$/;
const emailPattern = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const phonePattern = /^[0-9]{10}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const firstAdminLockName = "planentrix:first-admin-bootstrap";

const isLoopbackAddress = (address: string | undefined): boolean =>
  address === "127.0.0.1" ||
  address === "::1" ||
  address === "::ffff:127.0.0.1";

const verifyBootstrapAccess = (
  providedSecret: string | undefined,
  remoteAddress: string | undefined,
): void => {
  if (
    process.env.NODE_ENV !== "production" &&
    isLoopbackAddress(remoteAddress)
  ) {
    return;
  }

  const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!configuredSecret || configuredSecret.length < 32) {
    throw new AuthServiceError(
      "First-admin bootstrap is not configured",
      503,
    );
  }

  const configuredDigest = createHash("sha256").update(configuredSecret).digest();
  const providedDigest = createHash("sha256")
    .update(providedSecret ?? "")
    .digest();

  if (!providedSecret || !timingSafeEqual(configuredDigest, providedDigest)) {
    throw new AuthServiceError("Invalid bootstrap secret", 401);
  }
};

const timeToSeconds = (value: string): number => {
  const [hour, minute, second = 0] = value.split(":").map(Number);
  return hour * 3600 + minute * 60 + second;
};

const jwtSecret = (): string => {
  if (!process.env.JWT_SECRET) {
    throw new AuthServiceError("Server configuration error", 500);
  }
  return process.env.JWT_SECRET;
};

const normalizeLogin = (input: unknown) => {
  const body = asBody(input);
  const username = requiredString(
    body.username ?? body.user_name ?? body.admin_name,
    "username",
  ).trim();
  const password = requiredString(
    body.password ?? body.user_password ?? body.admin_password,
    "password",
  );
  const platform = body.platform === "mobile" ? "mobile" : "web";
  const role = body.role;

  if (
    role !== undefined &&
    role !== "user" &&
    role !== "instructor" &&
    role !== "university_staff"
  ) {
    throw new AuthServiceError("Invalid role", 400);
  }

  return { username, password, platform, role: role as AuthRole | undefined };
};

const loadLoginCandidates = async (
  username: string,
  role?: AuthRole,
): Promise<AccountCandidate[]> => {
  const candidates: AccountCandidate[] = [];

  if (!role || role === "user") {
    const [rows] = await db.query<UserLoginRow[]>(
      `SELECT user_id, user_name, user_password
       FROM user
       WHERE BINARY user_name = ?
         AND status = 'active'
       LIMIT 1`,
      [username],
    );
    if (rows[0]) {
      candidates.push({
        id: rows[0].user_id,
        username: rows[0].user_name,
        passwordHash: rows[0].user_password,
        role: "user",
      });
    }
  }

  if (!role || role === "university_staff" || role === "instructor") {
    const [rows] = await db.query<AdminLoginRow[]>(
      `SELECT admin_id, admin_name, admin_password, role
       FROM admin
       WHERE BINARY admin_name = ?
         AND status = 'active'
       LIMIT 1`,
      [username],
    );
    const accountRole = rows[0]?.role;
    if (rows[0] && (!role || role === accountRole)) {
      candidates.push({
        id: rows[0].admin_id,
        username: rows[0].admin_name,
        passwordHash: rows[0].admin_password,
        role: accountRole,
      });
    }
  }

  return candidates;
};

export const authenticate = async (input: unknown): Promise<LoginResult> => {
  const credentials = normalizeLogin(input);
  const candidates = await loadLoginCandidates(
    credentials.username,
    credentials.role,
  );

  let account: AccountCandidate | undefined;
  for (const candidate of candidates) {
    if (await bcrypt.compare(credentials.password, candidate.passwordHash)) {
      account = candidate;
      break;
    }
  }

  if (!account) {
    throw new AuthServiceError("Invalid username or password", 400);
  }

  const expiresIn =
    credentials.platform === "mobile" && account.role === "user"
      ? "30m"
      : "24h";
  const accessToken = jwt.sign(
    { id: account.id, username: account.username, role: account.role },
    jwtSecret(),
    { expiresIn },
  );

  const result: LoginResult = {
    message: "Login successful",
    role: account.role,
    accountId: account.id,
    accessToken,
    expiresIn,
    ...(account.role === "user" ? { userId: account.id } : { adminId: account.id }),
  };

  if (account.role === "user") {
    if (credentials.platform === "mobile") {
      const refreshToken = jwt.sign(
        { id: account.id, username: account.username, role: "user" },
        jwtSecret(),
        { expiresIn: "30d" },
      );
      const refreshExpiresAt = new Date();
      refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

      await db.query(
        `UPDATE user
         SET refresh_token = ?, refresh_token_expires_at = ?, last_login = NOW()
         WHERE user_id = ?`,
        [refreshToken, refreshExpiresAt, account.id],
      );
      result.refreshToken = refreshToken;
    } else {
      await db.query("UPDATE user SET last_login = NOW() WHERE user_id = ?", [
        account.id,
      ]);
    }
  } else {
    await db.query("UPDATE admin SET last_login = NOW() WHERE admin_id = ?", [
      account.id,
    ]);
  }

  return result;
};

export const registerUser = async (input: unknown): Promise<void> => {
  const body = asBody(input);
  if (body.role && body.role !== "user") {
    throw new AuthServiceError("Public registration is only available for users", 403);
  }

  const userName = requiredString(body.user_name ?? body.username, "user_name").trim();
  const userPassword = requiredString(
    body.user_password ?? body.password,
    "user_password",
  );
  const firstName = requiredString(body.first_name, "first_name").trim();
  const lastName = requiredString(body.last_name, "last_name").trim();
  const email = requiredString(body.email, "email").trim();
  const departmentId = optionalInteger(body.department_id, "department_id");
  const birthdate = optionalString(body.user_birthdate ?? body.birthdate);
  const gender = optionalString(body.user_gender ?? body.gender) ?? "unspecified";
  const dayOff = optionalInteger(body.day_off, "day_off");
  const continuousDuration = optionalInteger(
    body.continuous_working_duration,
    "continuous_working_duration",
  );
  const breakDuration = optionalInteger(body.break, "break");
  const startTime = optionalString(body.start_time);
  const endTime = optionalString(body.end_time);
  const busyDays = parseBusyDays(body.busy_days);

  if (departmentId === null || departmentId <= 0) {
    throw new AuthServiceError("department_id is required", 400);
  }

  if (!usernamePattern.test(userName)) {
    throw new AuthServiceError(
      "Username must contain at least one letter and only alphanumeric characters, min 3 chars",
      400,
    );
  }
  if (!passwordPattern.test(userPassword)) {
    throw new AuthServiceError(
      "Password must be 8+ chars, include at least one letter & one special character",
      400,
    );
  }
  if (!emailPattern.test(email)) {
    throw new AuthServiceError("Invalid email address", 400);
  }
  if (!["male", "female", "other", "unspecified"].includes(gender)) {
    throw new AuthServiceError("Invalid gender value", 400);
  }
  if (
    continuousDuration === null ||
    breakDuration === null ||
    !startTime ||
    !endTime
  ) {
    throw new AuthServiceError(
      "Study duration, break, start time, and end time are required",
      400,
    );
  }
  for (const [field, value] of [
    ["start_time", startTime],
    ["end_time", endTime],
  ] as const) {
    if (value && !timePattern.test(value)) {
      throw new AuthServiceError(
        `${field} must be in HH:mm or HH:mm:ss format`,
        400,
      );
    }
  }
  for (const [index, busyDay] of busyDays.entries()) {
    if (!timePattern.test(busyDay.start) || !timePattern.test(busyDay.end)) {
      throw new AuthServiceError(
        `busy_days[${index}] start and end times must be in HH:mm or HH:mm:ss format`,
        400,
      );
    }
    if (timeToSeconds(busyDay.start) >= timeToSeconds(busyDay.end)) {
      throw new AuthServiceError(
        `busy_days[${index}] start time must be before end time`,
        400,
      );
    }
  }

  const constraintErrors = validateConstraintForSave({
    dayOff,
    continuousWorkingDuration: continuousDuration,
    breakDuration,
    startTime,
    endTime,
    busyDays,
  });
  if (constraintErrors.length > 0) {
    throw new AuthServiceError("Validation failed", 400, constraintErrors);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [departments] = await connection.query<DepartmentRow[]>(
      `SELECT department_id
       FROM departments
       WHERE department_id = ? AND is_active = 1
       LIMIT 1`,
      [departmentId],
    );
    if (!departments[0]) {
      throw new AuthServiceError("Department not found or inactive", 400);
    }

    const [existingUsers] = await connection.query<UserIdRow[]>(
      `SELECT user_id
       FROM user
       WHERE BINARY user_name = ? OR email = ?
       LIMIT 1`,
      [userName, email],
    );
    const [existingAdmins] = await connection.query<AdminIdRow[]>(
      `SELECT admin_id
       FROM admin
       WHERE BINARY admin_name = ? OR admin_email = ?
       LIMIT 1`,
      [userName, email],
    );
    if (existingUsers.length > 0 || existingAdmins.length > 0) {
      throw new AuthServiceError("Username already exists", 400);
    }

    const passwordHash = await bcrypt.hash(userPassword, 10);
    const [userResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO user
        (user_name, user_password, first_name, last_name, email, department_id,
         birthdate, gender, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        userName,
        passwordHash,
        firstName,
        lastName,
        email,
        departmentId,
        birthdate,
        gender,
      ],
    );
    const [constraintResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO user_constraints
        (user_id, day_off, continuous_working_minutes, break_minutes,
         available_start_time, available_end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userResult.insertId,
        dayOff,
        continuousDuration,
        breakDuration,
        startTime,
        endTime,
      ],
    );

    for (const busyDay of busyDays) {
      await connection.query(
        `INSERT INTO recurring_busy
          (constraint_id, day_of_week, start_time, end_time)
         VALUES (?, ?, ?, ?)`,
        [constraintResult.insertId, busyDay.day, busyDay.start, busyDay.end],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const registerAdmin = async (
  input: unknown,
): Promise<"university_staff" | "instructor"> => {
  const body = asBody(input);
  if (
    body.role &&
    body.role !== "university_staff" &&
    body.role !== "instructor"
  ) {
    throw new AuthServiceError("Invalid account role", 400);
  }
  const accountRole =
    body.role === "instructor" ? "instructor" : "university_staff";

  const adminName = requiredString(
    body.admin_name ?? body.username,
    "admin_name",
  ).trim();
  const adminEmail = requiredString(body.admin_email, "admin_email").trim();
  const adminPassword = requiredString(
    body.admin_password ?? body.password,
    "admin_password",
  );
  const firstName = requiredString(body.first_name, "first_name").trim();
  const lastName = requiredString(body.last_name, "last_name").trim();
  const phoneNumber = optionalString(body.phone_number ?? body.phone);
  const address = optionalString(body.address);
  let departmentId = optionalInteger(body.department_id, "department_id");
  const departmentCode = optionalString(body.major);

  if (!usernamePattern.test(adminName)) {
    throw new AuthServiceError(
      "Username must contain at least one letter and only alphanumeric characters, min 3 chars",
      400,
    );
  }
  if (!emailPattern.test(adminEmail)) {
    throw new AuthServiceError("Invalid email address", 400);
  }
  if (phoneNumber && !phonePattern.test(phoneNumber)) {
    throw new AuthServiceError("Phone number must be 10 digits", 400);
  }
  if (!passwordPattern.test(adminPassword)) {
    throw new AuthServiceError(
      "Password must be 8+ chars, include at least one letter & one special character",
      400,
    );
  }

  if (departmentId === null && departmentCode) {
    const [departments] = await db.query<DepartmentRow[]>(
      `SELECT department_id
       FROM departments
       WHERE department_code = ? AND is_active = 1
       LIMIT 1`,
      [departmentCode],
    );
    departmentId = departments[0]?.department_id ?? null;
  }
  if (accountRole === "instructor" && departmentId === null) {
    throw new AuthServiceError(
      "A valid department is required for instructor accounts",
      400,
    );
  }
  if (departmentId !== null) {
    const [departments] = await db.query<DepartmentRow[]>(
      `SELECT department_id
       FROM departments
       WHERE department_id = ? AND is_active = 1
       LIMIT 1`,
      [departmentId],
    );
    if (!departments[0]) {
      throw new AuthServiceError("Department not found or inactive", 400);
    }
  }

  const [existingAdmins] = await db.query<AdminIdRow[]>(
    `SELECT admin_id
     FROM admin
     WHERE BINARY admin_name = ? OR admin_email = ?
     LIMIT 1`,
    [adminName, adminEmail],
  );
  const [existingUsers] = await db.query<UserIdRow[]>(
    `SELECT user_id
     FROM user
     WHERE BINARY user_name = ? OR email = ?
     LIMIT 1`,
    [adminName, adminEmail],
  );
  if (existingAdmins.length > 0 || existingUsers.length > 0) {
    throw new AuthServiceError("Username or email already exists", 400);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await db.query(
    `INSERT INTO admin
      (admin_name, admin_email, admin_password, first_name, last_name, phone,
       address, department_id, role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminName,
      adminEmail,
      passwordHash,
      firstName,
      lastName,
      phoneNumber,
      address,
      departmentId,
      accountRole,
    ],
  );
  return accountRole;
};

export const bootstrapFirstAdmin = async (
  input: unknown,
  providedSecret: string | undefined,
  remoteAddress: string | undefined,
): Promise<void> => {
  verifyBootstrapAccess(providedSecret, remoteAddress);

  const body = asBody(input);
  if (body.role !== undefined && body.role !== "university_staff") {
    throw new AuthServiceError(
      'The bootstrap endpoint only accepts role "university_staff"',
      400,
    );
  }

  const connection = await db.getConnection();
  let lockAcquired = false;

  try {
    const [lockRows] = await connection.query<NamedLockRow[]>(
      "SELECT GET_LOCK(?, 5) AS lock_acquired",
      [firstAdminLockName],
    );
    lockAcquired = Number(lockRows[0]?.lock_acquired) === 1;
    if (!lockAcquired) {
      throw new AuthServiceError(
        "First-admin bootstrap is temporarily busy; try again",
        503,
      );
    }

    const [existingAdmins] = await connection.query<AdminIdRow[]>(
      `SELECT admin_id
       FROM admin
       WHERE role = 'university_staff'
       LIMIT 1`,
    );
    if (existingAdmins.length > 0) {
      throw new AuthServiceError(
        "An administrator already exists; use /auth/admin/register",
        409,
      );
    }

    await registerAdmin({ ...body, role: "university_staff" });
  } finally {
    if (lockAcquired) {
      try {
        await connection.query("SELECT RELEASE_LOCK(?)", [firstAdminLockName]);
      } catch (error) {
        console.error("Unable to release first-admin bootstrap lock:", error);
      }
    }
    connection.release();
  }
};

export const refreshUserAccessToken = async (
  input: unknown,
): Promise<{ accessToken: string; expiresIn: "30m" }> => {
  const body = asBody(input);
  const refreshToken = requiredString(body.refreshToken, "refreshToken");

  try {
    const decoded = jwt.verify(refreshToken, jwtSecret());
    if (
      typeof decoded === "string" ||
      !Number.isSafeInteger(decoded.id) ||
      decoded.role !== "user"
    ) {
      throw new Error("Invalid refresh token payload");
    }

    const [rows] = await db.query<UserRefreshRow[]>(
      `SELECT user_id, user_name
       FROM user
       WHERE user_id = ?
         AND refresh_token = ?
         AND refresh_token_expires_at > NOW()
       LIMIT 1`,
      [decoded.id, refreshToken],
    );
    if (!rows[0]) throw new Error("Refresh token not found");

    const accessToken = jwt.sign(
      { id: rows[0].user_id, username: rows[0].user_name, role: "user" },
      jwtSecret(),
      { expiresIn: "30m" },
    );
    return { accessToken, expiresIn: "30m" };
  } catch {
    throw new AuthServiceError("Invalid or expired refresh token", 403);
  }
};

export const logoutAccount = async (
  id: number,
  role: AuthRole,
): Promise<string> => {
  if (role === "user") {
    await db.query(
      `UPDATE user
       SET refresh_token = NULL, refresh_token_expires_at = NULL
       WHERE user_id = ?`,
      [id],
    );
  }
  return "Logged out successfully";
};

export const getAccountProfile = async (id: number, role: AuthRole) => {
  if (role === "university_staff" || role === "instructor") {
    const [rows] = await db.query<AdminProfileRow[]>(
      `SELECT admin_id, admin_name, admin_email, first_name, last_name,
              phone AS phone_number, address, department_id, role, status
       FROM admin
       WHERE admin_id = ? AND status = 'active'
       LIMIT 1`,
      [id],
    );
    const account = rows[0];
    const accountRole = account?.role;
    if (!account || accountRole !== role) {
      throw new AuthServiceError("Account not found or inactive", 404);
    }
    return role === "instructor"
      ? {
          message: "Instructor profile retrieved successfully",
          instructor: account,
        }
      : {
          message: "University staff profile retrieved successfully",
          admin: account,
        };
  }

  if (role === "user") {
    const [rows] = await db.query<UserProfileRow[]>(
      `SELECT user_id, user_name, first_name, last_name, email, department_id,
              birthdate, gender, user_pic, status, last_login
       FROM user
       WHERE user_id = ? AND status = 'active'
       LIMIT 1`,
      [id],
    );
    if (!rows[0]) throw new AuthServiceError("User not found", 404);
    return { message: "User profile retrieved successfully", user: rows[0] };
  }

  throw new AuthServiceError("Unsupported account role", 403);
};

export const deleteUserAccount = async (id: number): Promise<void> => {
  const connection = await db.getConnection();
  let userPic: string | null = null;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<UserPictureRow[]>(
      "SELECT user_pic FROM user WHERE user_id = ? LIMIT 1",
      [id],
    );
    if (!rows[0]) throw new AuthServiceError("User not found", 404);
    userPic = rows[0].user_pic;

    await connection.query(
      `DELETE psh FROM part_score_history psh
       INNER JOIN exam_score_history esh
         ON esh.exam_score_history_id = psh.exam_score_history_id
       INNER JOIN schedule_time st
         ON st.schedule_time_id = esh.schedule_time_id
       WHERE st.user_id = ?`,
      [id],
    );
    await connection.query(
      `DELETE esh FROM exam_score_history esh
       INNER JOIN schedule_time st
         ON st.schedule_time_id = esh.schedule_time_id
       WHERE st.user_id = ?`,
      [id],
    );
    await connection.query(
      `DELETE sc FROM score sc
       INNER JOIN workloads w ON w.workload_id = sc.workload_id
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       WHERE st.user_id = ?`,
      [id],
    );
    await connection.query(
      `DELETE w FROM workloads w
       INNER JOIN schedule_time st ON st.schedule_time_id = w.schedule_time_id
       WHERE st.user_id = ?`,
      [id],
    );
    await connection.query(
      `DELETE study FROM study_time study
       INNER JOIN schedule_time st
         ON st.schedule_time_id = study.schedule_time_id
       WHERE st.user_id = ?`,
      [id],
    );
    await connection.query("DELETE FROM schedule_time WHERE user_id = ?", [id]);
    await connection.query("DELETE FROM terms WHERE user_id = ?", [id]);
    await connection.query("DELETE FROM user_constraints WHERE user_id = ?", [id]);
    await connection.query("DELETE FROM user WHERE user_id = ?", [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (userPic) {
    const imagePath = path.join(__dirname, "../uploads", path.basename(userPic));
    try {
      await fs.unlink(imagePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Unable to delete profile image:", error);
      }
    }
  }
};
