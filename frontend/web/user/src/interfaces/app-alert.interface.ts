export type AppAlertKind =
  | "class_session"
  | "review"
  | "homework_session"
  | "checkpoint"
  | "homework_deadline";

export interface AppAlert {
  id: string;
  kind: AppAlertKind;
  subjectName: string;
  title: string;
  eventAt: Date;
  visibleFrom: Date;
  visibleUntil: Date | null;
  destination: "/Main" | "/Score&Homework" | "/Test";
}
