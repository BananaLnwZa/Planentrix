"use client";

import { useState } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";

export default function ConfirmContentDeleteModal({ label, onClose, onConfirm }: { label: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => { setDeleting(true); setError(""); try { await onConfirm(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "ไม่สามารถลบได้"); setDeleting(false); } };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#243b45]/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true"><div className="w-full max-w-sm rounded-[24px] bg-white p-6 text-center shadow-2xl"><button type="button" onClick={onClose} disabled={deleting} aria-label="ปิด" className="ml-auto block rounded-full p-2 text-[#7d9098] hover:bg-[#edf4f6]"><X size={18} /></button><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#fff0ec] text-[#c6644d]"><Trash2 size={25} /></span><h2 className="mt-4 text-lg font-semibold text-[#334b55]">ยืนยันการลบ?</h2><p className="mt-2 text-sm text-[#6e7f87]">{label}</p>{error && <p className="mt-3 rounded-xl bg-[#fff0ec] p-2.5 text-sm text-[#a9503c]">{error}</p>}<div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} disabled={deleting} className="rounded-xl bg-[#edf3f5] py-2.5 text-sm text-[#60747d]">ยกเลิก</button><button type="button" onClick={submit} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d66f55] py-2.5 text-sm font-medium text-white disabled:opacity-60">{deleting ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}ลบ</button></div></div></div>;
}
