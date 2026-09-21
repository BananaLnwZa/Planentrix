import { redirect } from "next/navigation";
import { getSharedLoginUrl } from "@/services/auth-navigation";

export default function AdminLoginPage() {
  redirect(getSharedLoginUrl());
}
