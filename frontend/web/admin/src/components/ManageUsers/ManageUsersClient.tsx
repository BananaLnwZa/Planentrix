"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, X } from "lucide-react";
import {
  ManagedUser,
  UpdateManagedUserRequest,
} from "@/interfaces/user-management.interface";
import { userManagementService } from "@/services/user-management.service";
import DeleteUserModal from "./DeleteUserModal";
import EditUserModal from "./EditUserModal";
import UserFilters, { UserFilter } from "./UserFilters";
import UserSummaryCards from "./UserSummaryCards";
import UserTable from "./UserTable";

const PAGE_SIZE = 12;

const sortUsers = (users: ManagedUser[]) =>
  [...users].sort((first, second) => {
    if (first.is_inactive !== second.is_inactive) return first.is_inactive ? -1 : 1;
    return first.user_id - second.user_id;
  });

export default function ManageUsersClient() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await userManagementService.getUsers();
      setUsers(sortUsers(response.users));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    userManagementService
      .getUsers()
      .then((response) => {
        if (active) setUsers(sortUsers(response.users));
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.user_name.toLocaleLowerCase().includes(query) ||
        String(user.user_id).includes(query.replace(/^#/, ""));
      const matchesFilter =
        filter === "all" ||
        (filter === "inactive" && user.is_inactive) ||
        (filter === "active" && !user.is_inactive);
      return matchesSearch && matchesFilter;
    });
  }, [filter, search, users]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleUpdate = async (data: UpdateManagedUserRequest) => {
    if (!editingUser) return;
    const response = await userManagementService.updateUser(editingUser.user_id, data);
    setUsers((current) => sortUsers(current.map((user) => user.user_id === response.user.user_id ? response.user : user)));
    setEditingUser(null);
    setNotice(`บันทึกข้อมูลของ ${response.user.user_name} แล้ว`);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    await userManagementService.deleteUser(deletingUser.user_id);
    setUsers((current) => current.filter((user) => user.user_id !== deletingUser.user_id));
    setNotice(`ลบบัญชี ${deletingUser.user_name} เรียบร้อยแล้ว`);
    setDeletingUser(null);
  };

  return (
    <>
      <div className="mt-7"><UserSummaryCards users={users} /></div>

      {notice && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#cce9dc] bg-[#f0fbf6] px-4 py-3 text-sm text-[#39785f]" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ"><X size={17} /></button>
        </div>
      )}

      <section className="mt-5 overflow-hidden rounded-[24px] border border-[#e1eaed] bg-white shadow-[0_12px_34px_rgba(55,88,102,0.07)]" aria-label="รายชื่อผู้ใช้งาน">
        <UserFilters
          search={search}
          filter={filter}
          resultCount={filteredUsers.length}
          onSearchChange={(value) => { setSearch(value); setPage(1); }}
          onFilterChange={(value) => { setFilter(value); setPage(1); }}
        />

        {loading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-[#66808b]">
            <LoaderCircle className="animate-spin text-[#559ab3]" size={30} />
            <p className="text-sm">กำลังโหลดรายชื่อผู้ใช้...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-5 text-center">
            <span className="rounded-full bg-[#fff0ec] p-4 text-[#cb6b53]"><AlertCircle size={27} /></span>
            <p className="mt-4 font-medium text-[#465d67]">โหลดข้อมูลไม่สำเร็จ</p>
            <p className="mt-1 max-w-md text-sm text-[#82939a]">{error}</p>
            <button type="button" onClick={() => void loadUsers()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#4d94ad] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#40839a]">
              <RefreshCw size={16} /> ลองอีกครั้ง
            </button>
          </div>
        ) : (
          <>
            <UserTable users={visibleUsers} onEdit={setEditingUser} onDelete={setDeletingUser} />
            {filteredUsers.length > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-[#e8eef1] px-4 py-3 sm:px-5">
                <p className="text-xs text-[#82929a]">หน้า {safePage.toLocaleString("th-TH")} จาก {pageCount.toLocaleString("th-TH")}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage === 1} aria-label="หน้าก่อนหน้า" className="rounded-xl border border-[#dce6e9] p-2 text-[#5c737d] transition hover:bg-[#f0f6f8] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={safePage === pageCount} aria-label="หน้าถัดไป" className="rounded-xl border border-[#dce6e9] p-2 text-[#5c737d] transition hover:bg-[#f0f6f8] disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {editingUser && <EditUserModal key={editingUser.user_id} user={editingUser} onClose={() => setEditingUser(null)} onSave={handleUpdate} />}
      {deletingUser && <DeleteUserModal key={deletingUser.user_id} user={deletingUser} onClose={() => setDeletingUser(null)} onConfirm={handleDelete} />}
    </>
  );
}
