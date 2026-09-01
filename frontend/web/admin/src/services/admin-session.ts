import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminProfile } from "@/interfaces/auth.interface";
import { apiConfig, apiEndpoints } from "@/services/api.config";

export async function requireAdminSession(): Promise<AdminProfile> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("adminAccessToken")?.value;

  if (!accessToken) {
    redirect("/LogIn");
  }

  const response = await fetch(`${apiConfig.baseURL}${apiEndpoints.auth.profile}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if ([401, 403, 404].includes(response.status)) {
    redirect("/LogIn");
  }

  if (!response.ok) {
    throw new Error("Unable to verify the administrator session.");
  }

  const data = (await response.json()) as { admin: AdminProfile };
  return data.admin;
}
