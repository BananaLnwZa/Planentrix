"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AlertCircle, LoaderCircle, RefreshCw, WifiOff } from "lucide-react";
import type {
  RecoveryAction,
  StudyDashboard,
  StudySession,
  StudyType,
  TimerSubject,
  TimerTerm,
} from "@/interfaces/time.interface";
import timeService, { TimeApiError } from "@/services/time.service";
import FinishSessionModal from "./FinishSessionModal";
import SessionRecoveryModal from "./SessionRecoveryModal";
import StudyHistory from "./StudyHistory";
import StudyStatistics from "./StudyStatistics";
import TimerPanel, { type TimerPhase } from "./TimerPanel";
import {
  CurrentTermRequiredNotebookLayout,
} from "@/components/common/CurrentTermRequiredState";

const HEARTBEAT_INTERVAL_MS = 60_000;

const subscribeToOnlineStatus = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

const getOnlineSnapshot = () => navigator.onLine;
const getServerOnlineSnapshot = () => true;

const isOpenSession = (session: StudySession) =>
  session.session_status === "running" ||
  session.session_status === "paused" ||
  session.session_status === "interrupted";

export default function TimerWorkspace() {
  const online = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );
  const [term, setTerm] = useState<TimerTerm | null>(null);
  const [subjects, setSubjects] = useState<TimerSubject[]>([]);
  const [studyTypes, setStudyTypes] = useState<StudyType[]>([]);
  const [dashboard, setDashboard] = useState<StudyDashboard | null>(null);
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [requiresRecovery, setRequiresRecovery] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    null
  );
  const [selectedStudyTypeId, setSelectedStudyTypeId] = useState<number | null>(
    null
  );
  const [syncClientMs, setSyncClientMs] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageErrorCode, setPageErrorCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const resumeAfterFinishCancel = useRef(false);

  const applySession = useCallback(
    (session: StudySession | null, recoveryRequired = false) => {
      const receivedAt = Date.now();
      setNowMs(receivedAt);
      setSyncClientMs(receivedAt);

      if (!session || !isOpenSession(session)) {
        setActiveSession(null);
        setRequiresRecovery(false);
        return;
      }

      setActiveSession(session);
      setSelectedScheduleId(session.schedule_time_id);
      setSelectedStudyTypeId(session.study_type_id);
      setRequiresRecovery(
        recoveryRequired ||
          session.is_stale ||
          session.session_status === "interrupted"
      );
    },
    []
  );

  const processActionError = useCallback(
    (error: unknown) => {
      if (error instanceof TimeApiError) {
        if (error.session) {
          applySession(
            error.session,
            error.code === "SESSION_HARD_LIMIT_REACHED" ||
              error.session.is_stale ||
              error.session.session_status === "interrupted"
          );
        }
        return error.message;
      }
      return error instanceof Error
        ? error.message
        : "เกิดข้อผิดพลาด กรุณาลองใหม่";
    },
    [applySession]
  );

  const refreshDashboard = useCallback(async () => {
    const dashboardData = await timeService.getDashboard();
    setDashboard(dashboardData);
  }, []);

  const syncActiveSession = useCallback(async () => {
    const response = await timeService.getActiveSession();
    applySession(response.data, response.requires_recovery);
    return response;
  }, [applySession]);

  const loadTimerPage = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    setPageErrorCode(null);
    try {
      const [setup, active, dashboardData] = await Promise.all([
        timeService.getSetup(),
        timeService.getActiveSession(),
        timeService.getDashboard(),
      ]);
      setTerm(setup.current_term);
      setSubjects(setup.subjects);
      setStudyTypes(setup.study_types);
      setDashboard(dashboardData);
      applySession(active.data, active.requires_recovery);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "ไม่สามารถโหลดหน้าจับเวลาได้"
      );
      setPageErrorCode(error instanceof TimeApiError ? error.code ?? null : null);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadTimerPage(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadTimerPage]);

  useEffect(() => {
    if (
      activeSession?.session_status !== "running" ||
      requiresRecovery
    ) {
      return;
    }
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [activeSession?.session_status, requiresRecovery]);

  useEffect(() => {
    if (
      !online ||
      requiresRecovery ||
      activeSession?.session_status !== "running"
    ) {
      return;
    }

    const sessionId = activeSession.study_time_id;
    const sessionVersion = activeSession.version;
    const heartbeatId = window.setInterval(() => {
      void timeService
        .heartbeatSession(sessionId, { version: sessionVersion })
        .then((response) => applySession(response.data))
        .catch((error) => setActionError(processActionError(error)));
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(heartbeatId);
  }, [
    activeSession?.session_status,
    activeSession?.study_time_id,
    activeSession?.version,
    applySession,
    online,
    processActionError,
    requiresRecovery,
  ]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !online) return;
      void syncActiveSession().catch((error) =>
        setActionError(processActionError(error))
      );
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [online, processActionError, syncActiveSession]);

  useEffect(() => {
    if (!online) return;
    const timeoutId = window.setTimeout(() => {
      void syncActiveSession().catch((error) =>
        setActionError(processActionError(error))
      );
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [online, processActionError, syncActiveSession]);

  useEffect(() => {
    if (activeSession?.session_status !== "running") return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [activeSession?.session_status]);

  const elapsedSeconds = useMemo(() => {
    if (!activeSession) return 0;
    if (
      activeSession.session_status !== "running" ||
      requiresRecovery
    ) {
      return activeSession.elapsed_seconds;
    }
    const clientDelta = Math.max(
      0,
      Math.floor((nowMs - syncClientMs) / 1000)
    );
    return Math.min(
      activeSession.hard_limit_seconds,
      activeSession.elapsed_seconds + clientDelta
    );
  }, [activeSession, nowMs, requiresRecovery, syncClientMs]);

  const ensureOnline = () => {
    if (online) return true;
    setActionError("กรุณาเชื่อมต่ออินเทอร์เน็ตก่อนควบคุมเวลา");
    return false;
  };

  const handleStart = async () => {
    if (!ensureOnline()) return;
    if (selectedScheduleId === null || selectedStudyTypeId === null) {
      setActionError("กรุณาเลือกวิชาและวิธีทบทวนก่อนเริ่มจับเวลา");
      return;
    }
    if (activeSession) {
      setActionError("กรุณาจัดการรายการจับเวลาปัจจุบันก่อนเริ่มรายการใหม่");
      return;
    }

    setBusy(true);
    setActionError(null);
    try {
      const response = await timeService.startSession({
        schedule_time_id: selectedScheduleId,
        study_type_id: selectedStudyTypeId,
      });
      applySession(response.data);
    } catch (error) {
      setActionError(processActionError(error));
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async () => {
    if (!activeSession || !ensureOnline() || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const response = await timeService.pauseSession(
        activeSession.study_time_id,
        { version: activeSession.version }
      );
      applySession(response.data);
    } catch (error) {
      setActionError(processActionError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    if (!activeSession || !ensureOnline() || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const response = await timeService.resumeSession(
        activeSession.study_time_id,
        { version: activeSession.version }
      );
      applySession(response.data);
    } catch (error) {
      setActionError(processActionError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleRequestFinish = async () => {
    if (!activeSession || !ensureOnline() || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      if (activeSession.session_status === "running") {
        const response = await timeService.pauseSession(
          activeSession.study_time_id,
          { version: activeSession.version }
        );
        applySession(response.data);
        resumeAfterFinishCancel.current = true;
      } else {
        resumeAfterFinishCancel.current = false;
      }
      setFinishModalOpen(true);
    } catch (error) {
      setActionError(processActionError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelFinish = async () => {
    if (busy) return;
    if (!resumeAfterFinishCancel.current) {
      setFinishModalOpen(false);
      setActionError(null);
      return;
    }
    if (!activeSession || !ensureOnline()) return;

    setBusy(true);
    setActionError(null);
    try {
      const response = await timeService.resumeSession(
        activeSession.study_time_id,
        { version: activeSession.version }
      );
      applySession(response.data);
      setFinishModalOpen(false);
      resumeAfterFinishCancel.current = false;
    } catch (error) {
      setActionError(processActionError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmFinish = async () => {
    if (!activeSession || !ensureOnline() || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const response = await timeService.finishSession(
        activeSession.study_time_id,
        { version: activeSession.version }
      );
      applySession(response.data);
      setSelectedScheduleId(null);
      setSelectedStudyTypeId(null);
      setFinishModalOpen(false);
      resumeAfterFinishCancel.current = false;
      await refreshDashboard();
    } catch (error) {
      setActionError(processActionError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleRecovery = async (action: RecoveryAction) => {
    if (!activeSession || !ensureOnline() || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const response = await timeService.recoverSession(
        activeSession.study_time_id,
        { version: activeSession.version, action }
      );
      const remainsOpen = isOpenSession(response.data);
      applySession(response.data, false);
      if (!remainsOpen) {
        setSelectedScheduleId(null);
        setSelectedStudyTypeId(null);
        await refreshDashboard();
      }
    } catch (error) {
      setActionError(processActionError(error));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[430px] items-center justify-center text-[#8caabd]">
        <LoaderCircle className="animate-spin" size={30} />
        <span className="ml-3 text-sm">กำลังเตรียมหน้าจับเวลา...</span>
      </div>
    );
  }

  if (pageError || !term || !dashboard) {
    const noTerm = pageErrorCode === "NO_CURRENT_TERM";
    if (noTerm) {
      return (
        <CurrentTermRequiredNotebookLayout leftDetail="กรุณาสร้างเทอมและตารางเรียนก่อนเริ่มจับเวลา" />
      );
    }
    return (
      <div className="flex h-full min-h-[430px] items-center justify-center">
        <div>
          <div className="max-w-sm rounded-[22px] border border-[#eaded4] bg-white/90 p-7 text-center shadow-lg">
            <AlertCircle className="mx-auto text-[#d5969d]" size={34} />
            <h1 className="mt-3 text-lg font-bold text-[#5d5055]">
              โหลดข้อมูลไม่สำเร็จ
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#95868b]">
              {pageError}
            </p>
            <button
              type="button"
              onClick={() => void loadTimerPage()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#8fc8ea] px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw size={15} /> ลองอีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  const phase: TimerPhase = activeSession
    ? activeSession.session_status === "running"
      ? "running"
      : activeSession.session_status === "paused"
        ? "paused"
        : "interrupted"
    : "idle";

  return (
    <>
      <div className="grid h-full min-h-0 w-full grid-cols-1 gap-5 overflow-y-auto pr-1 md:grid-cols-2 md:gap-[88px] md:overflow-hidden md:px-3 md:py-1 md:pr-3 lg:gap-24">
        <div className="flex min-h-0 flex-col gap-3 md:h-full md:overflow-hidden">
          {!online && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-[#fff0f1] px-3 py-2 text-xs font-semibold text-[#ae5d68]">
              <WifiOff size={14} /> ขณะนี้ออฟไลน์ ระบบยังแสดงเวลาโดยประมาณแต่ปิดการควบคุมไว้
            </div>
          )}

          <TimerPanel
            subjects={subjects}
            studyTypes={studyTypes}
            selectedScheduleId={selectedScheduleId}
            selectedStudyTypeId={selectedStudyTypeId}
            activeSession={activeSession}
            phase={phase}
            elapsedSeconds={elapsedSeconds}
            busy={busy}
            online={online}
            onSubjectChange={setSelectedScheduleId}
            onStudyTypeChange={setSelectedStudyTypeId}
            onStart={() => void handleStart()}
            onPause={() => void handlePause()}
            onResume={() => void handleResume()}
            onFinish={() => void handleRequestFinish()}
          />

          {actionError && !finishModalOpen && !requiresRecovery && (
            <p className="-mb-1 rounded-xl bg-[#fff0f1] px-3 py-2 text-center text-xs text-[#b84e5c]">
              {actionError}
            </p>
          )}

          <StudyStatistics dashboard={dashboard} />
        </div>

        <div className="h-full min-h-0 overflow-hidden">
          <StudyHistory dashboard={dashboard} />
        </div>
      </div>

      <FinishSessionModal
        open={finishModalOpen}
        elapsedSeconds={elapsedSeconds}
        subjectName={activeSession?.subject_name ?? ""}
        busy={busy}
        error={actionError}
        onCancel={() => void handleCancelFinish()}
        onConfirm={() => void handleConfirmFinish()}
      />

      <SessionRecoveryModal
        session={requiresRecovery ? activeSession : null}
        busy={busy}
        error={actionError}
        onAction={(action) => void handleRecovery(action)}
      />
    </>
  );
}
