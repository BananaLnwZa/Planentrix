import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";
import type {
  ActiveSessionResponse,
  RecoverStudySessionRequest,
  SessionResponse,
  SessionVersionRequest,
  StartStudySessionRequest,
  StudyDashboard,
  StudySession,
  TimeApiErrorPayload,
  TimerSetupResponse,
} from "@/interfaces/time.interface";

const thaiErrorMessages: Record<string, string> = {
  NO_CURRENT_TERM: "ยังไม่มีเทอมปัจจุบัน กรุณาสร้างเทอมก่อนเริ่มจับเวลา",
  INVALID_TIMER_SELECTION: "กรุณาเลือกวิชาและวิธีทบทวนให้ครบถ้วน",
  SUBJECT_NOT_FOUND: "ไม่พบวิชานี้ในตารางเรียนของเทอมปัจจุบัน",
  STUDY_TYPE_NOT_FOUND: "ไม่พบวิธีทบทวนที่เลือก",
  OPEN_SESSION_EXISTS: "มีรายการจับเวลาที่ยังจัดการไม่เสร็จอยู่แล้ว",
  SESSION_NOT_FOUND: "ไม่พบรายการจับเวลานี้ในเทอมปัจจุบัน",
  SESSION_VERSION_CONFLICT:
    "รายการนี้ถูกแก้ไขจากหน้าต่างหรืออุปกรณ์อื่น ระบบโหลดข้อมูลล่าสุดให้แล้ว",
  INVALID_SESSION_STATE: "สถานะรายการจับเวลาไม่รองรับคำสั่งนี้",
  SESSION_HARD_LIMIT_REACHED:
    "รายการนี้ถึงเวลาสูงสุด 4 ชั่วโมงแล้ว กรุณายืนยันว่าจะบันทึกหรือยกเลิก",
  SESSION_NOT_STALE: "รายการนี้ไม่จำเป็นต้องกู้คืนแล้ว",
  INVALID_SESSION_REQUEST: "ข้อมูลรายการจับเวลาไม่ถูกต้อง กรุณาลองใหม่",
  INVALID_RECOVERY_REQUEST: "ตัวเลือกการกู้รายการจับเวลาไม่ถูกต้อง",
};

export class TimeApiError extends Error {
  status?: number;
  code?: string;
  session?: StudySession;

  constructor(
    message: string,
    options?: { status?: number; code?: string; session?: StudySession }
  ) {
    super(message);
    this.name = "TimeApiError";
    this.status = options?.status;
    this.code = options?.code;
    this.session = options?.session;
  }
}

class TimeService {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
      timeout: 10000,
    });

    this.apiClient.interceptors.request.use((config) => {
      const accessToken = Cookies.get("accessToken");
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    });
  }

  async getSetup(): Promise<TimerSetupResponse> {
    try {
      const response = await this.apiClient.get<TimerSetupResponse>(
        "/user/time/setup"
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดข้อมูลสำหรับจับเวลาได้");
    }
  }

  async getActiveSession(): Promise<ActiveSessionResponse> {
    try {
      const response = await this.apiClient.get<ActiveSessionResponse>(
        "/user/time/active"
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถตรวจสอบรายการที่กำลังจับเวลาได้");
    }
  }

  async getDashboard(): Promise<StudyDashboard> {
    try {
      const response = await this.apiClient.get<StudyDashboard>(
        "/user/time/dashboard"
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถโหลดสถิติการทบทวนได้");
    }
  }

  async startSession(data: StartStudySessionRequest): Promise<SessionResponse> {
    try {
      const response = await this.apiClient.post<SessionResponse>(
        "/user/time/start",
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถเริ่มจับเวลาได้");
    }
  }

  async pauseSession(
    studyTimeId: number,
    data: SessionVersionRequest
  ): Promise<SessionResponse> {
    return this.patchSession(studyTimeId, "pause", data, "ไม่สามารถพักเวลาได้");
  }

  async resumeSession(
    studyTimeId: number,
    data: SessionVersionRequest
  ): Promise<SessionResponse> {
    return this.patchSession(studyTimeId, "resume", data, "ไม่สามารถจับเวลาต่อได้");
  }

  async finishSession(
    studyTimeId: number,
    data: SessionVersionRequest
  ): Promise<SessionResponse> {
    return this.patchSession(
      studyTimeId,
      "finish",
      data,
      "ไม่สามารถบันทึกเวลาทบทวนได้"
    );
  }

  async heartbeatSession(
    studyTimeId: number,
    data: SessionVersionRequest
  ): Promise<SessionResponse> {
    try {
      const response = await this.apiClient.post<SessionResponse>(
        `/user/time/${studyTimeId}/heartbeat`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, "ไม่สามารถซิงก์รายการจับเวลาได้");
    }
  }

  async recoverSession(
    studyTimeId: number,
    data: RecoverStudySessionRequest
  ): Promise<SessionResponse> {
    return this.patchSession(
      studyTimeId,
      "recover",
      data,
      "ไม่สามารถจัดการรายการจับเวลาที่ค้างอยู่ได้"
    );
  }

  private async patchSession(
    studyTimeId: number,
    action: string,
    data: SessionVersionRequest | RecoverStudySessionRequest,
    fallbackMessage: string
  ): Promise<SessionResponse> {
    try {
      const response = await this.apiClient.patch<SessionResponse>(
        `/user/time/${studyTimeId}/${action}`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.toError(error, fallbackMessage);
    }
  }

  private toError(error: unknown, fallbackMessage: string): TimeApiError {
    if (axios.isAxiosError<TimeApiErrorPayload>(error)) {
      const payload = error.response?.data;
      const code = payload?.code;
      const message =
        (code ? thaiErrorMessages[code] : undefined) ||
        payload?.message ||
        (error.code === "ERR_NETWORK"
          ? "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต"
          : error.message) ||
        fallbackMessage;
      return new TimeApiError(message, {
        status: error.response?.status,
        code,
        session: payload?.data,
      });
    }
    return new TimeApiError(
      error instanceof Error ? error.message : fallbackMessage
    );
  }
}

export const timeService = new TimeService();
export default timeService;
