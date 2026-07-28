"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import type {
  CurrentTerm,
  UserConstraint,
  UserProfile,
} from "@/interfaces/profile.interface";
import { useAuthStore } from "@/services/auth.store";
import profileService from "@/services/profile.service";
import StudentCardPopup, {
  type EditConstraintValues,
  type EditProfileValues,
  type ProfilePanel,
} from "@/components/Main/StudentCardPopup";

type StudentCardProps = {
  name?: string;
  gender?: string;
  year?: string | number;
  birthDate?: string;
  studentNumber?: string;
  onEditProfile?: () => void;
  onDeleteProfile?: () => void;
};

const emptyConstraintValues: EditConstraintValues = {
  dayOff: "",
  continuousWorkingDuration: "",
  breakDuration: "",
  startTime: "",
  endTime: "",
  timePreference: "",
  busyDays: [],
};

const dayNames: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

const timePreferenceNames: Record<number, string> = {
  1: "เช้า",
  2: "กลางวัน",
  3: "เย็น",
};

function formatGender(value?: string | null) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatTime(value?: string | null) {
  return value ? value.slice(0, 5) : "—";
}

function formatMinutes(value?: number | null) {
  if (value === null || value === undefined) return "—";

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours && minutes) return `${hours} hr ${minutes} min`;
  if (hours) return `${hours} hr`;
  return `${minutes} min`;
}

function createEditConstraintValues(
  value: UserConstraint | null
): EditConstraintValues {
  if (!value) return emptyConstraintValues;

  return {
    dayOff: value.day_off?.toString() || "",
    continuousWorkingDuration:
      value.continuous_working_duration?.toString() || "",
    breakDuration: value.break?.toString() || "",
    startTime: value.start_time?.slice(0, 5) || "",
    endTime: value.end_time?.slice(0, 5) || "",
    timePreference: value.time_preference?.toString() || "",
    busyDays: (value.busy_days || []).map((busyTime) => ({
      day: busyTime.day,
      start: busyTime.start.slice(0, 5),
      end: busyTime.end.slice(0, 5),
    })),
  };
}

function StudentCardPhoto({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div
      role="img"
      aria-label="Student card photo"
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FFD6E5] to-[#B9DDF6] bg-cover bg-center text-white"
      style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl)})` } : undefined}
    >
      {!imageUrl && <UserRound aria-hidden="true" size={44} strokeWidth={1.4} />}
    </div>
  );
}

export default function StudentCard({
  name,
  gender,
  year,
  birthDate,
  studentNumber,
  onEditProfile,
  onDeleteProfile,
}: StudentCardProps) {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const logout = useAuthStore((state) => state.logout);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [constraint, setConstraint] = useState<UserConstraint | null>(null);
  const [currentTerm, setCurrentTerm] = useState<CurrentTerm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [constraintError, setConstraintError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ProfilePanel>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditProfileValues>({
    userName: "",
    birthDate: "",
    gender: "",
  });
  const [editConstraintValues, setEditConstraintValues] =
    useState<EditConstraintValues>(emptyConstraintValues);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const userId = authUser?.userId;

  useEffect(() => {
    if (!userId) return;

    let isActive = true;

    Promise.allSettled([
      profileService.getProfile(),
      profileService.getConstraints(),
      profileService.getCurrentTerm(),
    ]).then(([profileResult, constraintResult, termResult]) => {
      if (!isActive) return;

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      } else {
        setLoadError(profileResult.reason.message || "Unable to load profile");
      }

      if (constraintResult.status === "fulfilled") {
        setConstraint(constraintResult.value);
      } else {
        setConstraintError(
          constraintResult.reason.message || "Unable to load constraints"
        );
      }

      if (termResult.status === "fulfilled") {
        setCurrentTerm(termResult.value.data);
      }

      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsEditing(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const displayName = profile?.user_name || name || authUser?.username || "Student";
  const displayGender = gender || formatGender(profile?.user_gender);
  const displayBirthDate = birthDate || formatDate(profile?.user_birthdate);
  const displayYear = year ?? currentTerm?.year_level ?? "—";
  const displayStudentNumber =
    studentNumber || String(profile?.user_id || userId || 1).padStart(2, "0");
  const visibleLoadError =
    loadError || (!userId ? "User information was not found. Please log in again." : "");

  const closeProfile = () => {
    setIsOpen(false);
    setIsEditing(false);
    setPendingAvatarFile(null);
    setAvatarPreviewUrl(null);
    setActionError("");
  };

  const openProfile = () => {
    setActivePanel("profile");
    setActionError("");
    setIsOpen(true);
  };

  const startEditing = () => {
    onEditProfile?.();
    setActionError("");
    setActivePanel("profile");
    setPendingAvatarFile(null);
    setAvatarPreviewUrl(null);
    setEditValues({
      userName: profile?.user_name || displayName,
      birthDate: profile?.user_birthdate?.slice(0, 10) || "",
      gender: profile?.user_gender || "",
    });
    setEditConstraintValues(createEditConstraintValues(constraint));
    setIsEditing(true);
  };

  const handleSaveAll = async () => {
    if (!userId) return;

    const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9]{3,}$/;
    if (!usernameRegex.test(editValues.userName)) {
      setActivePanel("profile");
      setActionError(
        "Username must be at least 3 characters, contain a letter, and use only letters or numbers."
      );
      return;
    }

    const hasOnlyOneWorkingTime =
      Boolean(editConstraintValues.startTime) !==
      Boolean(editConstraintValues.endTime);
    if (hasOnlyOneWorkingTime) {
      setActivePanel("constraint");
      setActionError("Please enter both the start and end working times.");
      return;
    }
    if (
      editConstraintValues.startTime &&
      editConstraintValues.endTime &&
      editConstraintValues.startTime >= editConstraintValues.endTime
    ) {
      setActivePanel("constraint");
      setActionError("The start working time must be before the end time.");
      return;
    }

    const invalidBusyTimeIndex = editConstraintValues.busyDays.findIndex(
      (busyTime) =>
        !busyTime.start ||
        !busyTime.end ||
        busyTime.start >= busyTime.end
    );
    if (invalidBusyTimeIndex !== -1) {
      setActivePanel("constraint");
      setActionError(
        `Busy time ${invalidBusyTimeIndex + 1} must have a start time before its end time.`
      );
      return;
    }

    const continuousWorkingDuration = editConstraintValues.continuousWorkingDuration
      ? Number(editConstraintValues.continuousWorkingDuration)
      : null;
    const breakDuration = editConstraintValues.breakDuration
      ? Number(editConstraintValues.breakDuration)
      : null;
    if (
      (continuousWorkingDuration !== null && continuousWorkingDuration < 0) ||
      (breakDuration !== null && breakDuration < 0)
    ) {
      setActivePanel("constraint");
      setActionError("Working and break durations cannot be negative.");
      return;
    }

    setIsSaving(true);
    setIsUploadingAvatar(Boolean(pendingAvatarFile));
    setActionError("");

    try {
      const [profileResult, constraintResult, avatarResult] = await Promise.allSettled([
        profileService.updateProfile({
          user_name: editValues.userName,
          user_birthdate: editValues.birthDate || undefined,
          user_gender: editValues.gender || undefined,
        }),
        profileService.updateConstraints({
          day_off: editConstraintValues.dayOff
            ? Number(editConstraintValues.dayOff)
            : null,
          continuous_working_duration: continuousWorkingDuration,
          break: breakDuration,
          start_time: editConstraintValues.startTime || null,
          end_time: editConstraintValues.endTime || null,
          time_preference: editConstraintValues.timePreference
            ? Number(editConstraintValues.timePreference)
            : null,
          busy_days: editConstraintValues.busyDays,
        }),
        pendingAvatarFile
          ? profileService.updateAvatar(pendingAvatarFile)
          : Promise.resolve(null),
      ]);

      const saveErrors: string[] = [];

      if (profileResult.status === "fulfilled") {
        const updatedProfile = profileResult.value.user;
        setProfile((previous) => ({
          ...updatedProfile,
          user_pic_url:
            updatedProfile.user_pic_url ?? previous?.user_pic_url ?? null,
          academic_year: previous?.academic_year ?? null,
        }));
        setUser({
          ...authUser,
          userId,
          role: authUser?.role || "user",
          username: updatedProfile.user_name,
        });
      } else {
        saveErrors.push(
          profileResult.reason instanceof Error
            ? profileResult.reason.message
            : "Unable to update profile"
        );
      }

      if (constraintResult.status === "fulfilled") {
        setConstraint(constraintResult.value.constraint);
        setConstraintError("");
      } else {
        saveErrors.push(
          constraintResult.reason instanceof Error
            ? constraintResult.reason.message
            : "Unable to update constraints"
        );
      }

      if (avatarResult.status === "fulfilled") {
        if (avatarResult.value) {
          const uploadedImageUrl = avatarResult.value.image_url;
          setProfile((previous) =>
            previous
              ? { ...previous, user_pic_url: uploadedImageUrl }
              : previous
          );
          setPendingAvatarFile(null);
          setAvatarPreviewUrl(null);
        }
      } else {
        saveErrors.push(
          avatarResult.reason instanceof Error
            ? avatarResult.reason.message
            : "Unable to update profile image"
        );
      }

      if (saveErrors.length) {
        setActionError(saveErrors.join(" "));
      } else {
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
      setIsUploadingAvatar(false);
    }
  };

  const handleEditFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSaveAll();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setActionError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setActionError("The profile image must be no larger than 5 MB.");
      return;
    }

    setActionError("");
    setPendingAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleDeleteProfile = async () => {
    onDeleteProfile?.();
    if (onDeleteProfile) return;

    const hasConfirmed = window.confirm(
      "Delete this profile permanently? This action cannot be undone."
    );
    if (!hasConfirmed) return;

    setIsDeleting(true);
    setActionError("");
    try {
      await deleteAccount();
      closeProfile();
      router.replace("/LogIn");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to delete profile"
      );
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setActionError("");

    try {
      await logout();
      closeProfile();
      router.replace("/LogIn");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const constraintRows = constraint
    ? [
        ["วันหยุด", dayNames[constraint.day_off || 0] || "—"],
        ["ระยะเวลาทำงาน", formatMinutes(constraint.continuous_working_duration)],
        ["ระยะเวลาพัก", formatMinutes(constraint.break)],
        [
          "เวลาทำงาน",
          `${formatTime(constraint.start_time)} – ${formatTime(constraint.end_time)}`,
        ],
        [
          "เลือกช่วงเวลาทำงาน",
          timePreferenceNames[constraint.time_preference || 0] || "—",
        ],
      ]
    : [];

  return (
    <>
      <div className="w-full max-w-[430px]">
        <button
          type="button"
          onClick={openProfile}
          aria-haspopup="dialog"
          className="w-full overflow-hidden rounded-[28px] border border-[#93A3AA] bg-white text-left shadow-[0_8px_10px_rgba(53,64,69,0.28)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_12px_18px_rgba(53,64,69,0.3)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9CC5F9]"
        >
          <div className="flex items-center justify-between bg-[#C7E8F8] px-5 py-3">
            <span
              className="text-[35px] leading-none text-white"
              style={{
                fontFamily: "var(--font-pacifico)",
                textShadow: "3px 3px 0 #9CC5F9",
              }}
            >
              Planentrix
            </span>
            <div className="text-right text-white">
              <p className="text-lg leading-none">{displayStudentNumber}</p>
              <p className="mt-1 text-[10px] tracking-wide">STUDENT IDENTITY CARD</p>
            </div>
          </div>

          <div className="grid grid-cols-[116px_1fr] gap-4 px-5 pb-3 pt-4">
            <div className="overflow-hidden rounded-sm border border-gray-300 bg-[#F3FAFD]">
              <StudentCardPhoto imageUrl={profile?.user_pic_url} />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <dt className="text-xs uppercase text-gray-400">Name</dt>
                <dd className="truncate text-lg text-gray-900">{displayName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Gender</dt>
                <dd className="truncate text-lg text-gray-900">{displayGender}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Major</dt>
                <dd className="truncate text-lg text-gray-900">COMSCI</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Year</dt>
                <dd className="truncate text-lg text-gray-900">{displayYear}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase text-gray-400">Birthday</dt>
                <dd className="truncate text-lg text-gray-900">{displayBirthDate}</dd>
              </div>
            </dl>
          </div>

          <div
            aria-hidden="true"
            className="flex w-full items-center justify-between px-5 pb-2 text-xs text-gray-700"
          >
            {Array.from({ length: 42 }, (_, index) => (
              <span key={index}>&gt;</span>
            ))}
          </div>
        </button>

        {visibleLoadError && (
          <p className="mt-2 text-center text-sm text-red-500" role="alert">
            {visibleLoadError}
          </p>
        )}
      </div>

      {isOpen && (
        <StudentCardPopup
          profile={profile}
          avatarImageUrl={avatarPreviewUrl ?? profile?.user_pic_url}
          constraint={constraint}
          displayName={displayName}
          displayBirthDate={displayBirthDate}
          displayGender={displayGender}
          activePanel={activePanel}
          editValues={editValues}
          editConstraintValues={editConstraintValues}
          constraintRows={constraintRows}
          dayNames={dayNames}
          timePreferenceNames={timePreferenceNames}
          avatarInputRef={avatarInputRef}
          actionError={actionError}
          constraintError={constraintError}
          isLoading={isLoading}
          isEditing={isEditing}
          isSaving={isSaving}
          isDeleting={isDeleting}
          isLoggingOut={isLoggingOut}
          isUploadingAvatar={isUploadingAvatar}
          setEditValues={setEditValues}
          setEditConstraintValues={setEditConstraintValues}
          onClose={closeProfile}
          onPanelChange={setActivePanel}
          onStartEditing={startEditing}
          onCancelEditing={() => {
            setIsEditing(false);
            setPendingAvatarFile(null);
            setAvatarPreviewUrl(null);
            setActionError("");
          }}
          onSaveAll={handleSaveAll}
          onDeleteProfile={handleDeleteProfile}
          onLogout={handleLogout}
          onAvatarChange={handleAvatarChange}
          onEditFormSubmit={handleEditFormSubmit}
          onClearActionError={() => setActionError("")}
          formatTime={formatTime}
        />
      )}
    </>
  );
}
