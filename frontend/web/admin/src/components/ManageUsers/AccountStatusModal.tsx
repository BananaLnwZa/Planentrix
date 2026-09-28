"use client";

import {
  Archive,
  CheckCircle2,
  CirclePause,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import type {
  ManagedAccountStatus,
  ManagedInstructor,
  ManagedUser,
} from "@/interfaces/user-management.interface";
import { formatDisplayDateTime } from "@/utils/dateTime";

interface AccountStatusModalProps {
  account: ManagedUser | ManagedInstructor;
  kind: "student" | "instructor";
  onClose: () => void;
  onConfirm: (status: ManagedAccountStatus, reason: string) => Promise<void>;
}

const options: Array<{
  value: ManagedAccountStatus;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
  style: string;
}> = [
  { value: "active", label: "เปิดใช้งาน", description: "อนุญาตให้เข้าสู่ระบบตามปกติ", icon: CheckCircle2, style: "border-[#bfe1d1] bg-[#f0faf5] text-[#438067]" },
  { value: "suspended", label: "ระงับบัญชี", description: "หยุดการเข้าใช้งานชั่วคราว", icon: CirclePause, style: "border-[#f0d1c6] bg-[#fff5f1] text-[#b6634d]" },
  { value: "archived", label: "จัดเก็บบัญชี", description: "เก็บบัญชีออกจากการใช้งานโดยไม่ลบข้อมูล", icon: Archive, style: "border-[#d9dfe2] bg-[#f5f7f8] text-[#68777e]" },
];

export default function AccountStatusModal({
  account,
  kind,
  onClose,
  onConfirm,
}: AccountStatusModalProps) {
  const [status, setStatus] = useState<ManagedAccountStatus>(account.status);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const username = "user_name" in account ? account.user_name : account.admin_name;
  const displayName =
    [account.first_name, account.last_name].filter(Boolean).join(" ") || username;

  const submit = async () => {
    setError("");
    if (status === account.status) {
      setError("กรุณาเลือกสถานะใหม่");
      return;
    }
    if (reason.trim().length < 3) {
      setError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    setSaving(true);
    try {
      await onConfirm(status, reason.trim());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "เปลี่ยนสถานะไม่สำเร็จ");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#263e48]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="account-status-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_28px_80px_rgba(30,58,69,0.26)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-[#e9f5f9] text-[#4c8397]"><ShieldCheck size={23} /></span><div><p className="text-xs font-medium text-[#74909b]">{kind === "student" ? "Student Account" : "Instructor Account"}</p><h2 id="account-status-title" className="mt-0.5 text-xl font-semibold text-[#334c56]">จัดการสถานะบัญชี</h2></div></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#82949b] transition hover:bg-[#edf4f6] disabled:opacity-50"><X size={19} /></button>
        </div>

        <div className="mt-5 rounded-2xl bg-[#f6fafb] px-4 py-3"><p className="font-medium text-[#405862]">{displayName}</p><p className="mt-0.5 text-xs text-[#87979e]">@{username}</p></div>

        <fieldset className="mt-5"><legend className="text-sm font-medium text-[#526a74]">เลือกสถานะใหม่</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{options.map(({ value, label, description, icon: Icon, style }) => <button key={value} type="button" disabled={saving || value === account.status} onClick={() => setStatus(value)} className={`rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${status === value ? `${style} ring-2 ring-current/15` : "border-[#e0e8eb] bg-white text-[#63777f] hover:bg-[#f8fbfc]"}`}><Icon size={19} /><span className="mt-2 block text-sm font-semibold">{label}</span><span className="mt-1 block text-[11px] leading-4 opacity-75">{description}</span></button>)}</div></fieldset>

        <label className="mt-5 block"><span className="text-sm font-medium text-[#526a74]">เหตุผลในการเปลี่ยนสถานะ <span className="text-[#c45f50]">*</span></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} rows={3} placeholder="ระบุเหตุผลเพื่อบันทึกประวัติการดำเนินการ" className="mt-2 w-full resize-none rounded-2xl border border-[#d6e3e7] bg-white px-4 py-3 text-sm text-[#405862] outline-none transition focus:border-[#79b7cc] focus:ring-4 focus:ring-[#e1f3f8]" /><span className="mt-1 block text-right text-[11px] text-[#94a1a6]">{reason.length}/255</span></label>

        {account.status_changed_at && <div className="mt-4 rounded-2xl border border-[#e5ebed] bg-[#fafcfc] px-4 py-3 text-xs leading-5 text-[#74868d]"><p className="font-medium text-[#5c717a]">การเปลี่ยนสถานะล่าสุด</p><p>โดย {account.status_changed_by_name || "เจ้าหน้าที่"} · {formatDisplayDateTime(account.status_changed_at)}</p>{account.status_reason && <p className="mt-1">เหตุผล: {account.status_reason}</p>}</div>}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-[#fff0ed] px-4 py-3 text-sm text-[#b45b49]">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} disabled={saving} className="rounded-2xl bg-[#edf3f5] px-4 py-3 text-sm font-medium text-[#60757e] transition hover:bg-[#e2ecef] disabled:opacity-50">ยกเลิก</button><button type="button" onClick={submit} disabled={saving || status === account.status} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#568ba0] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#477c91] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}{saving ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยนสถานะ"}</button></div>
      </div>
    </div>
  );
}
