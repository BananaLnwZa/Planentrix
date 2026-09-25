export type ProfileGender = "male" | "female" | "other";
export type StoredProfileGender = ProfileGender | "unspecified";

export interface UserProfile {
  user_id: number;
  user_name: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  user_pic?: string | null;
  user_pic_url: string | null;
  user_birthdate: string | null;
  user_gender: StoredProfileGender | null;
  academic_year?: string | number | null;
  department_id?: number | null;
  department_code?: string | null;
  department_name?: string | null;
  faculty_id?: number | null;
  faculty_code?: string | null;
  faculty_name?: string | null;
  student_term_id?: number | null;
  year_level?: number | null;
  semester_no?: number | null;
  student_term_status?: string | null;
  account_status?: string | null;
  account_created_at?: string | null;
  last_login?: string | null;
}

export interface UpdateUserProfileRequest {
  user_name: string;
  user_birthdate?: string;
  user_gender?: ProfileGender;
}

export interface UpdateUserProfileResponse {
  message: string;
  user: UserProfile;
}

export interface UpdateAvatarResponse {
  message: string;
  image_url: string;
}

export interface BusyTime {
  day: number;
  start: string;
  end: string;
}

export interface UserConstraint {
  constraint_id: number;
  user_id: number;
  day_off: number | null;
  continuous_working_duration: number | null;
  break: number | null;
  start_time: string | null;
  end_time: string | null;
  busy_days: BusyTime[];
}

export interface UpdateConstraintRequest {
  day_off: number | null;
  continuous_working_duration: number | null;
  break: number | null;
  start_time: string | null;
  end_time: string | null;
  busy_days: BusyTime[];
}

export interface UpdateConstraintResponse {
  message: string;
  constraint: UserConstraint;
}
