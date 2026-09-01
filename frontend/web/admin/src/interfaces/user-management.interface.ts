export type UserGender = "male" | "female" | "other";

export interface ManagedUser {
  user_id: number;
  user_name: string;
  user_pic: string | null;
  user_birthdate: string | null;
  user_gender: UserGender;
  last_login: string | null;
  is_inactive: boolean;
  inactive_days: number | null;
  version: string;
}

export interface ManagedUsersResponse {
  message: string;
  users: ManagedUser[];
}

export interface UpdateManagedUserRequest {
  user_name: string;
  user_birthdate: string | null;
  user_gender: UserGender;
  version: string;
}

export interface UpdateManagedUserResponse {
  message: string;
  user: ManagedUser;
}

export interface DeleteManagedUserResponse {
  message: string;
}

export interface UserManagementErrorResponse {
  message: string;
  code?: "EDIT_CONFLICT";
}
