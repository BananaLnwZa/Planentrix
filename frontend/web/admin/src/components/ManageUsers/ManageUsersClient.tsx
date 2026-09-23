"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LoaderCircle,
  Presentation,
  RefreshCw,
  X,
} from "lucide-react";
import type {
  ManagedAccountActivity,
  ManagedInstructor,
  ManagedUser,
  UpdateManagedInstructorRequest,
  UpdateManagedUserRequest,
  UserDepartmentFilterOption,
  UserFacultyFilterOption,
} from "@/interfaces/user-management.interface";
import {
  UserEditConflictError,
  userManagementService,
} from "@/services/user-management.service";
import DeleteUserModal from "./DeleteUserModal";
import DeleteInstructorModal from "./DeleteInstructorModal";
import EditInstructorModal from "./EditInstructorModal";
import EditUserModal from "./EditUserModal";
import InstructorTable from "./InstructorTable";
import UserFilters, { type AccountTab, type UserFilter } from "./UserFilters";
import UserSummaryCards from "./UserSummaryCards";
import UserTable from "./UserTable";

const PAGE_SIZE = 12;

const accountSortPriority = (account: ManagedAccountActivity) => {
  if (account.last_login && account.is_inactive) return 0;
  if (account.last_login) return 1;
  return 2;
};

const lastLoginTimestamp = (account: ManagedAccountActivity) => {
  if (!account.last_login) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(account.last_login);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

const compareAccountPriority = (
  first: ManagedAccountActivity,
  second: ManagedAccountActivity,
) => {
  const priorityDifference =
    accountSortPriority(first) - accountSortPriority(second);
  if (priorityDifference !== 0) return priorityDifference;
  return lastLoginTimestamp(second) - lastLoginTimestamp(first);
};

const sortUsers = (users: ManagedUser[]) =>
  [...users].sort(
    (first, second) =>
      compareAccountPriority(first, second) || first.user_id - second.user_id,
  );

const sortInstructors = (instructors: ManagedInstructor[]) =>
  [...instructors].sort(
    (first, second) =>
      compareAccountPriority(first, second) || first.admin_id - second.admin_id,
  );

const matchesActivityFilter = (
  account: ManagedAccountActivity,
  filter: UserFilter,
) =>
  filter === "all" ||
  (filter === "inactive" && account.is_inactive) ||
  (filter === "active" && !account.is_inactive);

export default function ManageUsersClient() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [instructors, setInstructors] = useState<ManagedInstructor[]>([]);
  const [faculties, setFaculties] = useState<UserFacultyFilterOption[]>([]);
  const [departments, setDepartments] = useState<UserDepartmentFilterOption[]>([]);
  const [accountTab, setAccountTab] = useState<AccountTab>("student");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [editingInstructor, setEditingInstructor] =
    useState<ManagedInstructor | null>(null);
  const [deletingInstructor, setDeletingInstructor] =
    useState<ManagedInstructor | null>(null);

  const applyResponse = useCallback(
    (response: Awaited<ReturnType<typeof userManagementService.getUsers>>) => {
      setUsers(sortUsers(response.users));
      setInstructors(sortInstructors(response.instructors));
      setFaculties(response.faculties);
      setDepartments(response.departments);
    },
    [],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      applyResponse(await userManagementService.getUsers());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
      );
    } finally {
      setLoading(false);
    }
  }, [applyResponse]);

  useEffect(() => {
    let active = true;

    userManagementService
      .getUsers()
      .then((response) => {
        if (active) applyResponse(response);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyResponse]);

  const yearLevels = useMemo(() => {
    const available = [
      ...new Set(
        users
          .map((user) => user.year_level)
          .filter((year): year is number => year !== null),
      ),
    ].sort((first, second) => first - second);
    return available.length > 0 ? available : [1, 2, 3, 4];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const searchable = [
        user.user_name,
        user.first_name,
        user.last_name,
        `${user.first_name} ${user.last_name}`,
        user.email,
        user.faculty_name,
        user.faculty_code,
        user.department_name,
        user.department_code,
      ]
        .join(" ")
        .toLocaleLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesFaculty =
        !facultyId || user.faculty_id === Number(facultyId);
      const matchesDepartment =
        !departmentId || user.department_id === Number(departmentId);
      const matchesYear = !yearLevel || user.year_level === Number(yearLevel);
      return (
        matchesSearch &&
        matchesActivityFilter(user, filter) &&
        matchesFaculty &&
        matchesDepartment &&
        matchesYear
      );
    });
  }, [departmentId, facultyId, filter, search, users, yearLevel]);

  const filteredInstructors = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return instructors.filter((instructor) => {
      const searchable = [
        instructor.admin_name,
        instructor.first_name,
        instructor.last_name,
        `${instructor.first_name} ${instructor.last_name}`,
        instructor.admin_email,
        instructor.phone ?? "",
        instructor.faculty_name ?? "",
        instructor.faculty_code ?? "",
        instructor.department_name ?? "",
        instructor.department_code ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase();
      const matchesSearch =
        !query || searchable.includes(query);
      const matchesFaculty =
        !facultyId || instructor.faculty_id === Number(facultyId);
      const matchesDepartment =
        !departmentId || instructor.department_id === Number(departmentId);
      return (
        matchesSearch &&
        matchesActivityFilter(instructor, filter) &&
        matchesFaculty &&
        matchesDepartment
      );
    });
  }, [departmentId, facultyId, filter, instructors, search]);

  const currentAccounts = accountTab === "student" ? users : instructors;
  const filteredCount =
    accountTab === "student" ? filteredUsers.length : filteredInstructors.length;
  const pageCount = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visibleUsers = filteredUsers.slice(start, start + PAGE_SIZE);
  const visibleInstructors = filteredInstructors.slice(start, start + PAGE_SIZE);

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
    setFacultyId("");
    setDepartmentId("");
    setYearLevel("");
    setPage(1);
  };

  const changeTab = (tab: AccountTab) => {
    setAccountTab(tab);
    resetFilters();
  };

  const handleUpdate = async (data: UpdateManagedUserRequest) => {
    if (!editingUser) return;
    try {
      const response = await userManagementService.updateUser(
        editingUser.user_id,
        data,
      );
      setUsers((current) =>
        sortUsers(
          current.map((user) =>
            user.user_id === response.user.user_id ? response.user : user,
          ),
        ),
      );
      setEditingUser(null);
      setNotice(`บันทึกข้อมูลของ ${response.user.user_name} แล้ว`);
    } catch (updateError) {
      if (updateError instanceof UserEditConflictError) {
        await loadUsers();
        throw new Error(`${updateError.message} ระบบโหลดรายการล่าสุดให้แล้ว`);
      }
      throw updateError;
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    await userManagementService.deleteUser(deletingUser.user_id);
    setUsers((current) =>
      current.filter((user) => user.user_id !== deletingUser.user_id),
    );
    setNotice(`ลบบัญชี ${deletingUser.user_name} เรียบร้อยแล้ว`);
    setDeletingUser(null);
  };

  const handleInstructorUpdate = async (
    data: UpdateManagedInstructorRequest,
  ) => {
    if (!editingInstructor) return;
    try {
      const response = await userManagementService.updateInstructor(
        editingInstructor.admin_id,
        data,
      );
      setInstructors((current) =>
        sortInstructors(
          current.map((instructor) =>
            instructor.admin_id === response.instructor.admin_id
              ? response.instructor
              : instructor,
          ),
        ),
      );
      setEditingInstructor(null);
      setNotice(`บันทึกข้อมูลของ ${response.instructor.admin_name} แล้ว`);
    } catch (updateError) {
      if (updateError instanceof UserEditConflictError) {
        await loadUsers();
        throw new Error(`${updateError.message} ระบบโหลดรายการล่าสุดให้แล้ว`);
      }
      throw updateError;
    }
  };

  const handleInstructorDelete = async () => {
    if (!deletingInstructor) return;
    await userManagementService.deleteInstructor(deletingInstructor.admin_id);
    setInstructors((current) =>
      current.filter(
        (instructor) => instructor.admin_id !== deletingInstructor.admin_id,
      ),
    );
    setNotice(`ลบบัญชี ${deletingInstructor.admin_name} เรียบร้อยแล้ว`);
    setDeletingInstructor(null);
  };

  return (
    <>
      <div className="mt-7 flex w-full max-w-md rounded-2xl border border-[#dce8ec] bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => changeTab("student")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            accountTab === "student"
              ? "bg-[#e8f6fa] text-[#397d95]"
              : "text-[#71838b] hover:bg-[#f4f8f9]"
          }`}
        >
          <GraduationCap size={17} /> นักศึกษา
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">{users.length}</span>
        </button>
        <button
          type="button"
          onClick={() => changeTab("instructor")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            accountTab === "instructor"
              ? "bg-[#f0eef9] text-[#6f639f]"
              : "text-[#71838b] hover:bg-[#f4f8f9]"
          }`}
        >
          <Presentation size={17} /> อาจารย์
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">{instructors.length}</span>
        </button>
      </div>

      <div className="mt-5">
        <UserSummaryCards
          accounts={currentAccounts}
          accountLabel={accountTab === "student" ? "นักศึกษา" : "อาจารย์"}
        />
      </div>

      {notice && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#cce9dc] bg-[#f0fbf6] px-4 py-3 text-sm text-[#39785f]" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ"><X size={17} /></button>
        </div>
      )}

      <section className="mt-5 overflow-hidden rounded-[24px] border border-[#e1eaed] bg-white shadow-[0_12px_34px_rgba(55,88,102,0.07)]" aria-label="รายชื่อผู้ใช้งาน">
        <UserFilters
          accountTab={accountTab}
          search={search}
          filter={filter}
          facultyId={facultyId}
          departmentId={departmentId}
          yearLevel={yearLevel}
          resultCount={filteredCount}
          faculties={faculties}
          departments={departments}
          yearLevels={yearLevels}
          onSearchChange={(value) => { setSearch(value); setPage(1); }}
          onFilterChange={(value) => { setFilter(value); setPage(1); }}
          onFacultyChange={(value) => { setFacultyId(value); setDepartmentId(""); setPage(1); }}
          onDepartmentChange={(value) => { setDepartmentId(value); setPage(1); }}
          onYearLevelChange={(value) => { setYearLevel(value); setPage(1); }}
          onClear={resetFilters}
        />

        {loading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-[#66808b]">
            <LoaderCircle className="animate-spin text-[#559ab3]" size={30} />
            <p className="text-sm">กำลังโหลดรายชื่อผู้ใช้...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-5 text-center">
            <span className="rounded-full bg-[#fff0ec] p-4 text-[#cb6b53]"><AlertCircle size={27} /></span>
            <p className="mt-4 font-medium text-[#465d67]">โหลดข้อมูลไม่สำเร็จ</p>
            <p className="mt-1 max-w-md text-sm text-[#82939a]">{error}</p>
            <button type="button" onClick={() => void loadUsers()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#4d94ad] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#40839a]">
              <RefreshCw size={16} /> ลองอีกครั้ง
            </button>
          </div>
        ) : (
          <>
            {accountTab === "student" ? (
              <UserTable users={visibleUsers} onEdit={setEditingUser} onDelete={setDeletingUser} />
            ) : (
              <InstructorTable
                instructors={visibleInstructors}
                onEdit={setEditingInstructor}
                onDelete={setDeletingInstructor}
              />
            )}
            {filteredCount > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-[#e8eef1] px-4 py-3 sm:px-5">
                <p className="text-xs text-[#82929a]">หน้า {safePage.toLocaleString("th-TH")} จาก {pageCount.toLocaleString("th-TH")}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} aria-label="หน้าก่อนหน้า" className="rounded-xl border border-[#dce6e9] p-2 text-[#5c737d] transition hover:bg-[#f0f6f8] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={safePage === pageCount} aria-label="หน้าถัดไป" className="rounded-xl border border-[#dce6e9] p-2 text-[#5c737d] transition hover:bg-[#f0f6f8] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {editingUser && (
        <EditUserModal
          key={editingUser.user_id}
          user={editingUser}
          faculties={faculties}
          departments={departments}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdate}
        />
      )}
      {deletingUser && <DeleteUserModal key={deletingUser.user_id} user={deletingUser} onClose={() => setDeletingUser(null)} onConfirm={handleDelete} />}
      {editingInstructor && (
        <EditInstructorModal
          key={editingInstructor.admin_id}
          instructor={editingInstructor}
          departments={departments}
          faculties={faculties}
          onClose={() => setEditingInstructor(null)}
          onSave={handleInstructorUpdate}
        />
      )}
      {deletingInstructor && (
        <DeleteInstructorModal
          key={deletingInstructor.admin_id}
          instructor={deletingInstructor}
          onClose={() => setDeletingInstructor(null)}
          onConfirm={handleInstructorDelete}
        />
      )}
    </>
  );
}
