import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminProfile } from "@/interfaces/auth.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";
import { getSharedLoginUrl } from "@/services/auth-navigation";

type StaffRole = "university_staff" | "instructor";

const requireStaffSession = async (
  expectedRole: StaffRole,
): Promise<AdminProfile> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    redirect(getSharedLoginUrl());
  }

  const response = await fetch(`${apiConfig.baseURL}${apiEndpoints.auth.profile}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if ([401, 403, 404].includes(response.status)) {
    redirect(getSharedLoginUrl());
  }

  if (!response.ok) {
    throw new Error("Unable to verify the staff session.");
  }

  const data = (await response.json()) as {
    admin?: AdminProfile;
    instructor?: AdminProfile;
  };
  const profile =
    expectedRole === "instructor" ? data.instructor : data.admin;
  if (!profile || profile.role !== expectedRole) {
    redirect(getSharedLoginUrl());
  }
  return profile;
};

export const requireAdminSession = (): Promise<AdminProfile> =>
  requireStaffSession("university_staff");

export const requireInstructorSession = (): Promise<AdminProfile> =>
  requireStaffSession("instructor");
