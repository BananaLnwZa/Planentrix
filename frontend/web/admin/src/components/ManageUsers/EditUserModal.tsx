"use client";

import { FormEvent, useEffect, useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";
import {
  ManagedUser,
  UpdateManagedUserRequest,
  UserGender,
} from "@/interfaces/user-management.interface";

interface EditUserModalProps {
  user: ManagedUser;
  onClose: () => void;
  onSave: (data: UpdateManagedUserRequest) => Promise<void>;
}

const toDateInputValue = (value: string | null) => (value ? value.slice(0, 10) : "");

export default function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const [userName, setUserName] = useState(user.user_name);
  const [birthdate, setBirthdate] = useState(toDateInputValue(user.user_birthdate));
  const [gender, setGender] = useState<UserGender>(user.user_gender);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = userName.trim();

    if (!/^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,50}$/.test(normalizedName)) {
      setError("ชื่อผู้ใช้ต้องมี 3–50 ตัว ใช้เฉพาะภาษาอังกฤษหรือตัวเลข และต้องมีตัวอักษรอย่างน้อย 1 ตัว");
      return;
    }

    if (birthdate && new Date(`${birthdate}T00:00:00`).getTime() > Date.now()) {
      setError("วันเกิดต้องไม่เป็นวันที่ในอนาคต");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave({
        user_name: normalizedName,
        user_birthdate: birthdate || null,
        user_gender: gender,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#243b45]/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[26px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(28,54,65,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#64a0b5]">User #{user.user_id}</p>
            <h2 id="edit-user-title" className="mt-1 text-xl font-semibold text-[#304852]">แก้ไขข้อมูลผู้ใช้</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="ปิด" className="rounded-full p-2 text-[#7d9098] transition hover:bg-[#edf4f6] disabled:opacity-50">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-[#4c626c]">
            ชื่อผู้ใช้
            <input
              autoFocus
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              maxLength={50}
              className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal text-[#304852] outline-none focus:border-[#79bdd4] focus:ring-4 focus:ring-[#e1f4fa]"
            />
          </label>

          <label className="block text-sm font-medium text-[#4c626c]">
            วันเกิด
            <LocalizedDateTimeInput
              type="date"
              value={birthdate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setBirthdate(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-[#dbe6ea] bg-[#fbfdfe] px-3.5 font-normal text-[#304852] outline-none focus-within:border-[#79bdd4] focus-within:ring-4 focus-within:ring-[#e1f4fa]"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium text-[#4c626c]">เพศ</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([['male', 'ชาย'], ['female', 'หญิง'], ['other', 'อื่น ๆ']] as const).map(([value, label]) => (
                <label key={value} className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm transition ${gender === value ? 'border-[#69abc2] bg-[#e9f6fa] text-[#34788f]' : 'border-[#dfe8eb] text-[#657780] hover:bg-[#f5f9fa]'}`}>
                  <input type="radio" name="gender" value={value} checked={gender === value} onChange={() => setGender(value)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p role="alert" className="rounded-xl bg-[#fff0ec] px-3.5 py-3 text-sm text-[#a9503c]">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm text-[#687b84] transition hover:bg-[#eef4f6] disabled:opacity-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-xl bg-[#4c93ac] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#3f8299] disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />}
              {saving ? "กำลังบันทึก" : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
