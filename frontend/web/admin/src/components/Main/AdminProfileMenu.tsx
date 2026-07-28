"use client";

import {
  BadgeCheck,
  Hash,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminProfile } from "@/interfaces/auth.interface";
import adminAuthService from "@/services/auth.service";
import AdminLogoutButton from "./AdminLogoutButton";

interface AdminProfileMenuProps {
  adminName: string;
  adminId?: string;
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "ไม่ได้ระบุ";
}

export default function AdminProfileMenu({
  adminName,
  adminId,
}: AdminProfileMenuProps) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    adminAuthService
      .getProfile()
      .then((response) => {
        if (isActive) {
          setProfile(response.admin);
          setProfileError(null);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setProfileError(
            error instanceof Error
              ? error.message
              : "ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const resolvedName = profile?.admin_name || adminName;
  const resolvedId = profile?.admin_id
    ? String(profile.admin_id)
    : adminId;
  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "ไม่ได้ระบุ";

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-full py-1 pr-2 text-[#2b3e47] outline-none transition hover:text-[#367a96] focus-visible:ring-4 focus-visible:ring-white/70 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-white/75 text-[#599bb4] shadow-sm">
          <UserRound aria-hidden="true" size={22} strokeWidth={1.8} />
        </span>
        <span className="hidden max-w-36 truncate text-sm font-medium sm:block">
          {resolvedName}
        </span>
      </summary>

      <div className="absolute left-0 top-[calc(100%+12px)] z-50 max-h-[calc(100vh-100px)] w-80 max-w-[calc(100vw-40px)] overflow-y-auto rounded-2xl border border-[#d4e5eb] bg-white p-4 shadow-[0_20px_55px_rgba(40,74,88,0.2)]">
        <div className="flex items-center gap-3 border-b border-[#e5eff2] pb-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f7fc] text-[#4c93ad]">
            <UserRound aria-hidden="true" size={25} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-[#293940]">
              {resolvedName}
            </p>
            <p className="mt-0.5 text-xs text-[#7a8a91]">ผู้ดูแลระบบ</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-5" aria-label="กำลังโหลดข้อมูลผู้ดูแล">
            {[88, 72, 80, 64, 92].map((width) => (
              <div
                key={width}
                className="h-4 animate-pulse rounded-full bg-[#edf3f5]"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        ) : (
          <>
            {profileError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#f0c1b5] bg-[#fff5f2] px-3 py-2.5 text-xs leading-5 text-[#a85e4c]"
              >
                {profileError}
              </p>
            )}

            <dl className="space-y-3.5 py-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="flex shrink-0 items-center gap-2 text-[#7a8a91]">
                  <Hash aria-hidden="true" size={15} />
                  รหัสผู้ดูแล
                </dt>
                <dd className="text-right font-medium text-[#354850]">
                  {resolvedId ? `#${resolvedId}` : "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="flex shrink-0 items-center gap-2 text-[#7a8a91]">
                  <Mail aria-hidden="true" size={15} />
                  อีเมล
                </dt>
                <dd className="min-w-0 break-all text-right text-[#354850]">
                  {displayValue(profile?.admin_email)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="flex shrink-0 items-center gap-2 text-[#7a8a91]">
                  <UserRound aria-hidden="true" size={15} />
                  ชื่อ–นามสกุล
                </dt>
                <dd className="text-right text-[#354850]">{fullName}</dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="flex shrink-0 items-center gap-2 text-[#7a8a91]">
                  <Phone aria-hidden="true" size={15} />
                  เบอร์โทร
                </dt>
                <dd className="text-right text-[#354850]">
                  {displayValue(profile?.phone_number)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="flex shrink-0 items-center gap-2 text-[#7a8a91]">
                  <MapPin aria-hidden="true" size={15} />
                  ที่อยู่
                </dt>
                <dd className="max-w-44 text-right leading-5 text-[#354850]">
                  {displayValue(profile?.address)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-[#edf3f5] pt-3.5">
                <dt className="flex items-center gap-2 text-[#7a8a91]">
                  <BadgeCheck aria-hidden="true" size={15} />
                  สถานะ
                </dt>
                <dd className="text-[#388b70]">เข้าสู่ระบบแล้ว</dd>
              </div>
            </dl>
          </>
        )}

        <AdminLogoutButton />
      </div>
    </details>
  );
}
