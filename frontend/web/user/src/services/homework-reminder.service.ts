import type { HomeworkTask } from "@/interfaces/homework.interface";

export const HOMEWORK_REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

const DELIVERED_REMINDERS_KEY = "homework-reminders-delivered-v2";
const MAX_TIMEOUT_MS = 2_147_000_000;

type ReminderTimer = {
  signature: string;
  timeoutId: number;
};

export type HomeworkNotificationPermission =
  | NotificationPermission
  | "unsupported";

export const getHomeworkReminderTime = (deadline: Date) =>
  new Date(deadline.getTime() - HOMEWORK_REMINDER_LEAD_TIME_MS);

export const shouldNotifyHomeworkImmediately = (
  deadline: Date,
  now = new Date()
) =>
  deadline.getTime() > now.getTime() &&
  getHomeworkReminderTime(deadline).getTime() <= now.getTime();

const isBrowser = () => typeof window !== "undefined";

class HomeworkReminderService {
  private timers = new Map<number, ReminderTimer>();
  private listensForStorageChanges = false;

  isSupported(): boolean {
    return isBrowser() && window.isSecureContext && "Notification" in window;
  }

  getPermissionState(): HomeworkNotificationPermission {
    return this.isSupported() ? Notification.permission : "unsupported";
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    this.ensureStorageListener();
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    try {
      return (await Notification.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }

  showReadyNotification(): boolean {
    if (!this.isSupported() || Notification.permission !== "granted") {
      return false;
    }

    try {
      new Notification("เปิดการแจ้งเตือนแล้ว", {
        body: "Planentrix จะแจ้งเตือนก่อนถึงกำหนดส่งงาน 1 วัน",
        icon: "/images/logo.png",
        tag: "homework-notifications-ready",
      });
      return true;
    } catch {
      return false;
    }
  }

  async syncTasks(tasks: HomeworkTask[]): Promise<void> {
    if (!this.isSupported() || Notification.permission !== "granted") return;
    this.ensureStorageListener();

    const activeIds = new Set(
      tasks
        .filter((task) => task.workload_id > 0)
        .map((task) => task.workload_id)
    );

    for (const workloadId of this.timers.keys()) {
      if (!activeIds.has(workloadId)) this.cancelTask(workloadId);
    }

    for (const task of tasks) this.scheduleTask(task);
  }

  scheduleTask(task: HomeworkTask): void {
    if (
      !this.isSupported() ||
      Notification.permission !== "granted" ||
      task.workload_id <= 0
    ) {
      return;
    }

    const now = new Date();
    if (task.deadline.getTime() <= now.getTime()) {
      this.cancelTask(task.workload_id);
      return;
    }

    const signature = this.getTaskSignature(task);
    if (this.getDeliveredReminders()[task.workload_id] === signature) {
      this.clearTimer(task.workload_id);
      return;
    }

    const currentTimer = this.timers.get(task.workload_id);
    if (currentTimer?.signature === signature) return;

    this.clearTimer(task.workload_id);
    if (shouldNotifyHomeworkImmediately(task.deadline, now)) {
      this.showNotification(task, signature);
      return;
    }

    this.scheduleTimer(task, signature);
  }

  cancelTask(workloadId: number): void {
    this.clearTimer(workloadId);
    const delivered = this.getDeliveredReminders();
    if (!(workloadId in delivered)) return;
    delete delivered[workloadId];
    this.saveDeliveredReminders(delivered);
  }

  clearAll(): void {
    for (const workloadId of this.timers.keys()) this.clearTimer(workloadId);
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(DELIVERED_REMINDERS_KEY);
    } catch {
      // Private browsing can make storage unavailable; timers are still cleared.
    }
  }

  private scheduleTimer(task: HomeworkTask, signature: string): void {
    const remaining =
      getHomeworkReminderTime(task.deadline).getTime() - Date.now();

    if (remaining <= 0) {
      this.showNotification(task, signature);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      this.timers.delete(task.workload_id);
      this.scheduleTask(task);
    }, Math.min(remaining, MAX_TIMEOUT_MS));

    this.timers.set(task.workload_id, { signature, timeoutId });
  }

  private showNotification(task: HomeworkTask, signature: string): void {
    const delivered = this.getDeliveredReminders();
    if (delivered[task.workload_id] === signature) return;

    const formatter = new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: false,
    });
    let notification: Notification;
    try {
      // Record first so multiple open tabs do not normally show the same reminder.
      delivered[task.workload_id] = signature;
      this.saveDeliveredReminders(delivered);
      notification = new Notification(
        "งานใกล้ถึงกำหนดส่ง",
        {
          body: `วิชา: ${task.subject_name} • งาน: ${task.workload_name} • กำหนดส่ง: ${formatter.format(task.deadline)} น.`,
          icon: "/images/logo.png",
          tag: `homework-${task.workload_id}`,
        }
      );
    } catch {
      delete delivered[task.workload_id];
      this.saveDeliveredReminders(delivered);
      return;
    }

    notification.onclick = () => {
      window.focus();
      window.location.assign("/Score&Homework");
      notification.close();
    };
  }

  private clearTimer(workloadId: number): void {
    const timer = this.timers.get(workloadId);
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);
    this.timers.delete(workloadId);
  }

  private getTaskSignature(task: HomeworkTask): string {
    return `${task.deadline.getTime()}|${task.subject_name}|${task.workload_name}`;
  }

  private getDeliveredReminders(): Record<number, string> {
    if (!isBrowser()) return {};
    try {
      const value = window.localStorage.getItem(DELIVERED_REMINDERS_KEY);
      return value ? (JSON.parse(value) as Record<number, string>) : {};
    } catch {
      return {};
    }
  }

  private saveDeliveredReminders(reminders: Record<number, string>): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(
        DELIVERED_REMINDERS_KEY,
        JSON.stringify(reminders)
      );
    } catch {
      // Notification delivery still works when persistent storage is unavailable.
    }
  }

  private ensureStorageListener(): void {
    if (!isBrowser() || this.listensForStorageChanges) return;
    window.addEventListener("storage", this.handleStorageChange);
    this.listensForStorageChanges = true;
  }

  private handleStorageChange = (event: StorageEvent) => {
    if (event.key !== DELIVERED_REMINDERS_KEY || event.newValue !== null) return;
    for (const workloadId of this.timers.keys()) this.clearTimer(workloadId);
  };
}

export const homeworkReminderService = new HomeworkReminderService();
export default homeworkReminderService;
