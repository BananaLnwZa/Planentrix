export type ProfileGender = "male" | "female" | "other";

export interface UserProfile {
  user_id: number;
  user_name: string;
  user_pic?: string | null;
  user_pic_url: string | null;
  user_birthdate: string | null;
  user_gender: ProfileGender | null;
  academic_year?: string | number | null;
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
  time_preference: number | null;
  busy_days: BusyTime[];
}

export interface UpdateConstraintRequest {
  day_off: number | null;
  continuous_working_duration: number | null;
  break: number | null;
  start_time: string | null;
  end_time: string | null;
  time_preference: number | null;
  busy_days: BusyTime[];
}

export interface UpdateConstraintResponse {
  message: string;
  constraint: UserConstraint;
}

export interface CurrentTerm {
  term_id: number;
  year_level: string | number;
  term: string | number;
  academic_year: string | number;
  start_midterm?: string | null;
  end_midterm?: string | null;
  start_final?: string | null;
  end_final?: string | null;
  term_status: number;
}

export interface CurrentTermResponse {
  message: string;
  data: CurrentTerm;
}
