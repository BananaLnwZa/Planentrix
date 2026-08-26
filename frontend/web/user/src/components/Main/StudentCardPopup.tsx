"use client";

import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  RefObject,
  SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import DaySelect from "@/components/common/DaySelect";
import GenderSelect from "@/components/common/GenderSelect";
import LocalizedDateTimeInput from "@/components/common/LocalizedDateTimeInput";
import {
  BookOpen,
  Camera,
  LogOut,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type {
  BusyTime,
  ProfileGender,
  UserConstraint,
  UserProfile,
} from "@/interfaces/profile.interface";

export type ProfilePanel = "profile" | "constraint";

export type EditProfileValues = {
  userName: string;
  birthDate: string;
  gender: ProfileGender | "";
};

export type EditConstraintValues = {
  dayOff: string;
  continuousWorkingDuration: string;
  breakDuration: string;
  startTime: string;
  endTime: string;
  busyDays: BusyTime[];
};

type StudentCardPopupProps = {
  profile: UserProfile | null;
  avatarImageUrl?: string | null;
  constraint: UserConstraint | null;
  displayName: string;
  displayBirthDate: string;
  displayGender: string;
  activePanel: ProfilePanel;
  editValues: EditProfileValues;
  editConstraintValues: EditConstraintValues;
  constraintRows: string[][];
  dayNames: Record<number, string>;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  actionError: string;
  constraintError: string;
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isLoggingOut: boolean;
  isUploadingAvatar: boolean;
  setEditValues: Dispatch<SetStateAction<EditProfileValues>>;
  setEditConstraintValues: Dispatch<SetStateAction<EditConstraintValues>>;
  onClose: () => void;
  onPanelChange: (panel: ProfilePanel) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveAll: () => void;
  onDeleteProfile: () => void;
  onLogout: () => void;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEditFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClearActionError: () => void;
  formatTime: (value?: string | null) => string;
};

function ProfileAvatar({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div
      role="img"
      aria-label="Profile photo"
      className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#FFD6E5] to-[#B9DDF6] bg-cover bg-center text-white shadow-md"
      style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl)})` } : undefined}
    >
      {!imageUrl && <UserRound aria-hidden="true" size={58} strokeWidth={1.4} />}
    </div>
  );
}

function DurationEditor({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const total = value === "" ? null : Math.max(0, Number(value) || 0);
  const hours = total === null ? "" : String(Math.floor(total / 60));
  const minutes = total === null ? "" : String(total % 60);

  const updatePart = (part: "hours" | "minutes", rawValue: string) => {
    const parsed = rawValue === "" ? 0 : Math.max(0, Math.floor(Number(rawValue) || 0));
    const nextHours = part === "hours" ? parsed : Number(hours || 0);
    const nextMinutes = part === "minutes" ? Math.min(59, parsed) : Number(minutes || 0);
    onChange(String(nextHours * 60 + nextMinutes));
  };

  return (
    <fieldset>
      <legend className="text-sm text-gray-800">{label}</legend>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-600">
          ชม.
          <input
            id={`${id}-hours`}
            type="number"
            min={0}
            step={1}
            value={hours}
            onChange={(event) => updatePart("hours", event.target.value)}
            className="mt-1 block w-full rounded-full border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 outline-none focus:border-[#9CC5F9]"
          />
        </label>
        <label className="text-xs text-gray-600">
          นาที
          <input
            id={`${id}-minutes`}
            type="number"
            min={0}
            max={59}
            step={1}
            value={minutes}
            onChange={(event) => updatePart("minutes", event.target.value)}
            className="mt-1 block w-full rounded-full border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 outline-none focus:border-[#9CC5F9]"
          />
        </label>
      </div>
    </fieldset>
  );
}

export default function StudentCardPopup({
  profile,
  avatarImageUrl,
  constraint,
  displayName,
  displayBirthDate,
  displayGender,
  activePanel,
  editValues,
  editConstraintValues,
  constraintRows,
  dayNames,
  avatarInputRef,
  actionError,
  constraintError,
  isLoading,
  isEditing,
  isSaving,
  isDeleting,
  isLoggingOut,
  isUploadingAvatar,
  setEditValues,
  setEditConstraintValues,
  onClose,
  onPanelChange,
  onStartEditing,
  onCancelEditing,
  onSaveAll,
  onDeleteProfile,
  onLogout,
  onAvatarChange,
  onEditFormSubmit,
  onClearActionError,
  formatTime,
}: StudentCardPopupProps) {
  const hasInvalidWorkingTime = Boolean(
    editConstraintValues.startTime &&
      editConstraintValues.endTime &&
      editConstraintValues.startTime >= editConstraintValues.endTime
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-profile-title"
        className="relative flex h-[min(600px,86vh)] w-full max-w-[430px] flex-col overflow-hidden rounded-2xl border border-gray-300 bg-[#F3FBFF] shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="absolute right-3 top-3 z-20 rounded-full p-1 text-[#314553] transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X aria-hidden="true" size={26} strokeWidth={2.4} />
        </button>

        <header className="bg-[#C7E8F8] px-7 pb-4 pt-7">
          <div className="flex items-center gap-5">
            <div className="relative">
              <ProfileAvatar imageUrl={avatarImageUrl} />
              {isEditing && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label="Change profile photo"
                  className="absolute bottom-0.5 right-0.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#314553] text-white shadow-md transition-transform hover:scale-105 disabled:cursor-wait disabled:opacity-60"
                >
                  <Camera aria-hidden="true" size={18} />
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={onAvatarChange}
                className="hidden"
              />
            </div>

            <div className="min-w-0">
              <h2
                id="student-profile-title"
                className="truncate text-[clamp(23px,7vw,29px)] leading-tight text-black"
              >
                {displayName}
              </h2>

              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={onSaveAll}
                    disabled={isSaving || isUploadingAvatar}
                    className="mt-3 flex items-center gap-2 text-sm text-[#314553] hover:text-black disabled:cursor-wait disabled:opacity-60"
                  >
                    <Save aria-hidden="true" size={18} />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEditing}
                    disabled={isSaving}
                    className="mt-1.5 flex items-center gap-2 text-sm text-[#314553] hover:text-black disabled:opacity-60"
                  >
                    <X aria-hidden="true" size={18} />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onStartEditing}
                    disabled={isLoading || !profile}
                    className="mt-3 flex items-center gap-2 text-sm text-[#314553] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil aria-hidden="true" size={18} />
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteProfile}
                    disabled={isDeleting}
                    className="mt-1.5 flex items-center gap-2 text-sm text-[#314553] hover:text-red-600 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Trash2 aria-hidden="true" size={18} />
                    {isDeleting ? "Deleting..." : "Delete Profile"}
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div
          role="tablist"
          aria-label="Profile details"
          className="flex bg-[#C7E8F8]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "profile"}
            onClick={() => onPanelChange("profile")}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-t-xl text-sm text-[#314553] ${activePanel === "profile" ? "bg-[#F3FBFF]" : "bg-gray-200"}`}
          >
            <UserRound aria-hidden="true" size={19} />
            Profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "constraint"}
            onClick={() => onPanelChange("constraint")}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-t-xl text-sm text-[#314553] ${activePanel === "constraint" ? "bg-[#F3FBFF]" : "bg-gray-200"}`}
          >
            <BookOpen aria-hidden="true" size={19} />
            Constraint
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-5">
          {actionError && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {actionError}
            </p>
          )}

          {activePanel === "profile" ? (
            isEditing ? (
              <form
                id="profile-edit-form"
                onSubmit={onEditFormSubmit}
                className="grid grid-cols-2 gap-3"
              >
                <div className="col-span-2">
                  <label htmlFor="profile-username" className="text-sm text-gray-800">
                    ชื่อผู้ใช้
                  </label>
                  <input
                    id="profile-username"
                    type="text"
                    required
                    minLength={3}
                    value={editValues.userName}
                    onChange={(event) =>
                      setEditValues((previous) => ({
                        ...previous,
                        userName: event.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded-full border border-gray-300 bg-white px-5 py-2 text-base text-gray-800 outline-none focus:border-[#9CC5F9]"
                  />
                </div>
                <div>
                  <label htmlFor="profile-birthdate" className="text-sm text-gray-800">
                    วันเกิด
                  </label>
                  <LocalizedDateTimeInput
                    id="profile-birthdate"
                    type="date"
                    value={editValues.birthDate}
                    onChange={(event) =>
                      setEditValues((previous) => ({
                        ...previous,
                        birthDate: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-full border border-gray-300 bg-white px-4 text-base text-gray-800 outline-none focus-within:border-[#9CC5F9]"
                  />
                </div>
                <div>
                  <label htmlFor="profile-gender" className="text-sm text-gray-800">
                    เพศ
                  </label>
                  <GenderSelect
                    id="profile-gender"
                    value={editValues.gender}
                    onChange={(gender) =>
                      setEditValues((previous) => ({
                        ...previous,
                        gender,
                      }))
                    }
                    locale="th"
                    label={null}
                    compact
                    className="mt-1"
                  />
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-2 gap-3">
                <div className="col-span-2 rounded-2xl border border-gray-200 bg-white/80 p-3">
                  <dt className="text-sm text-gray-500">ชื่อผู้ใช้</dt>
                  <dd className="mt-1 break-words text-base text-[#314553]">
                    {displayName}
                  </dd>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-3">
                  <dt className="text-sm text-gray-500">วันเกิด</dt>
                  <dd className="mt-1 break-words text-base text-[#314553]">
                    {displayBirthDate}
                  </dd>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white/80 p-3">
                  <dt className="text-sm text-gray-500">เพศ</dt>
                  <dd className="mt-1 break-words text-base text-[#314553]">
                    {displayGender}
                  </dd>
                </div>
              </dl>
            )
          ) : isEditing ? (
            <form id="constraint-edit-form" onSubmit={onEditFormSubmit} className="space-y-5">
              <div>
                <label htmlFor="constraint-day-off" className="text-base text-gray-800">
                  วันหยุด
                </label>
                <DaySelect
                  id="constraint-day-off"
                  value={editConstraintValues.dayOff ? Number(editConstraintValues.dayOff) : null}
                  onChange={(day) =>
                    setEditConstraintValues((previous) => ({
                      ...previous,
                      dayOff: day ? String(day) : "",
                    }))
                  }
                  allowEmpty
                  placeholder="ไม่ระบุ"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DurationEditor
                  id="constraint-work-duration"
                  label="ระยะเวลาทำงาน"
                  value={editConstraintValues.continuousWorkingDuration}
                  onChange={(value) => {
                    onClearActionError();
                    setEditConstraintValues((previous) => ({
                      ...previous,
                      continuousWorkingDuration: value,
                    }));
                  }}
                />
                <DurationEditor
                  id="constraint-break-duration"
                  label="ระยะเวลาพัก"
                  value={editConstraintValues.breakDuration}
                  onChange={(value) => {
                    onClearActionError();
                    setEditConstraintValues((previous) => ({
                      ...previous,
                      breakDuration: value,
                    }));
                  }}
                />
              </div>

              <fieldset>
                <legend className="text-base text-gray-800">เวลาทำงาน</legend>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="constraint-start-time" className="text-xs text-gray-500">
                      เริ่ม
                    </label>
                    <LocalizedDateTimeInput
                      id="constraint-start-time"
                      type="time"
                      step={60}
                      value={editConstraintValues.startTime}
                      onChange={(event) => {
                        onClearActionError();
                        setEditConstraintValues((previous) => ({
                          ...previous,
                          startTime: event.target.value,
                        }));
                      }}
                      aria-invalid={hasInvalidWorkingTime}
                      className={`mt-1 h-10 w-full rounded-full border bg-white px-4 text-base text-gray-800 outline-none ${hasInvalidWorkingTime ? "border-red-400 focus-within:border-red-500" : "border-gray-300 focus-within:border-[#9CC5F9]"}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="constraint-end-time" className="text-xs text-gray-500">
                      สิ้นสุด
                    </label>
                    <LocalizedDateTimeInput
                      id="constraint-end-time"
                      type="time"
                      step={60}
                      value={editConstraintValues.endTime}
                      min={editConstraintValues.startTime || undefined}
                      onChange={(event) => {
                        onClearActionError();
                        setEditConstraintValues((previous) => ({
                          ...previous,
                          endTime: event.target.value,
                        }));
                      }}
                      aria-invalid={hasInvalidWorkingTime}
                      className={`mt-1 h-10 w-full rounded-full border bg-white px-4 text-base text-gray-800 outline-none ${hasInvalidWorkingTime ? "border-red-400 focus-within:border-red-500" : "border-gray-300 focus-within:border-[#9CC5F9]"}`}
                    />
                  </div>
                </div>
                {hasInvalidWorkingTime && (
                  <p className="mt-2 text-xs text-red-500" role="alert">
                    เวลาสิ้นสุดการทำงานต้องมากกว่าเวลาเริ่มทำงาน
                  </p>
                )}
              </fieldset>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base text-gray-800">วันเวลาไม่ว่างประจำ</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setEditConstraintValues((previous) => ({
                        ...previous,
                        busyDays: [{ day: 1, start: "", end: "" }, ...previous.busyDays],
                      }))
                    }
                    className="flex items-center gap-1 rounded-full bg-[#C7E8F8] px-3 py-1.5 text-sm text-[#314553] transition-colors hover:bg-[#B3DDF2]"
                  >
                    <Plus aria-hidden="true" size={16} />
                    Add
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {editConstraintValues.busyDays.map((busyTime, index) => (
                    <div
                      key={`busy-time-${index}`}
                      className="rounded-2xl border border-gray-200 bg-white/80 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <DaySelect
                          ariaLabel={`Busy day ${index + 1}`}
                          value={busyTime.day}
                          onChange={(day) =>
                            setEditConstraintValues((previous) => ({
                              ...previous,
                              busyDays: previous.busyDays.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, day: day ?? item.day }
                                  : item
                              ),
                            }))
                          }
                          compact
                          className="min-w-0 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditConstraintValues((previous) => ({
                              ...previous,
                              busyDays: previous.busyDays.filter(
                                (_, itemIndex) => itemIndex !== index
                              ),
                            }))
                          }
                          aria-label={`Remove busy time ${index + 1}`}
                          className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 aria-hidden="true" size={17} />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <LocalizedDateTimeInput
                          type="time"
                          step={60}
                          aria-label={`Busy time ${index + 1} start`}
                          value={busyTime.start}
                          onChange={(event) => {
                            onClearActionError();
                            setEditConstraintValues((previous) => ({
                              ...previous,
                              busyDays: previous.busyDays.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, start: event.target.value }
                                  : item
                              ),
                            }));
                          }}
                          className="h-9 min-w-0 rounded-full border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus-within:border-[#9CC5F9]"
                        />
                        <LocalizedDateTimeInput
                          type="time"
                          step={60}
                          aria-label={`Busy time ${index + 1} end`}
                          value={busyTime.end}
                          min={busyTime.start || undefined}
                          onChange={(event) => {
                            onClearActionError();
                            setEditConstraintValues((previous) => ({
                              ...previous,
                              busyDays: previous.busyDays.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, end: event.target.value }
                                  : item
                              ),
                            }));
                          }}
                          className="h-9 min-w-0 rounded-full border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus-within:border-[#9CC5F9]"
                        />
                      </div>
                    </div>
                  ))}

                  {!editConstraintValues.busyDays.length && (
                    <p className="text-sm text-gray-500">ไม่มีวันเวลาไม่ว่างประจำ</p>
                  )}
                </div>
              </div>
            </form>
          ) : isLoading ? (
            <p className="text-center text-gray-500">Loading constraints...</p>
          ) : constraintError ? (
            <p
              role="alert"
              className="rounded-2xl border border-dashed border-gray-300 bg-white/70 p-6 text-center text-gray-500"
            >
              {constraintError}
            </p>
          ) : (
            <div className="space-y-5">
              <dl className="grid grid-cols-2 gap-3">
                {constraintRows.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-gray-200 bg-white/80 p-3">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="mt-1 text-base text-[#314553]">{value}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <h3 className="text-base text-[#314553]">วันเวลาไม่ว่างประจำ</h3>
                {constraint?.busy_days?.length ? (
                  <ul className="mt-2 space-y-2">
                    {constraint.busy_days.map((busyTime, index) => (
                      <li
                        key={`${busyTime.day}-${busyTime.start}-${index}`}
                        className="flex justify-between rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600"
                      >
                        <span>{dayNames[busyTime.day] || `Day ${busyTime.day}`}</span>
                        <span>
                          {formatTime(busyTime.start)} – {formatTime(busyTime.end)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">ไม่มีวันเวลาไม่ว่างประจำ</p>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-[#D9E7EE] bg-white/70 px-6 py-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut || isSaving || isDeleting}
            className="mx-auto flex items-center justify-center gap-2 rounded-full border border-[#F19AB3] bg-white px-6 py-1.5 text-sm text-[#E65D84] transition-colors hover:bg-[#FFF0F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F19AB3] disabled:cursor-wait disabled:opacity-60"
          >
            <LogOut aria-hidden="true" size={18} />
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
