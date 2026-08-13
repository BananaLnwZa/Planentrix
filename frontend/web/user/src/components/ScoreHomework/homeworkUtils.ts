import type {
  HomeworkSectionData,
  HomeworkSectionType,
  HomeworkTask,
} from "@/interfaces/homework.interface";
import { formatDisplayDate as formatDate } from "@/utils/dateTime";

export { formatDisplayDate, formatDisplayTime } from "@/utils/dateTime";

export const workloadPalette: Record<
  string,
  { normal: string; hover: string }
> = {
  quiz: { normal: "#C5DBAA", hover: "#A5BE85" },
  final: { normal: "#FFE7AB", hover: "#F6D481" },
  midterm: { normal: "#B3F7EF", hover: "#74DBD0" },
  project: { normal: "#FA86A3", hover: "#D45A78" },
  assignment: { normal: "#EECDF9", hover: "#D19EE2" },
};

export const getWorkloadPalette = (typeName: string) =>
  workloadPalette[typeName.trim().toLowerCase()] ?? {
    normal: "#E6E6E6",
    hover: "#BDBDBD",
  };

export const toDateTimeLocalValue = (value: Date) => {
  const pad = (number: number) => number.toString().padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
};

const dayKey = (value: Date) =>
  `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;

export const groupHomeworkTasks = (
  tasks: HomeworkTask[],
  now = new Date()
): HomeworkSectionData[] => {
  const sorted = [...tasks].sort(
    (left, right) => left.deadline.getTime() - right.deadline.getTime()
  );
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowTasks: HomeworkTask[] = [];
  const overdueTasks: HomeworkTask[] = [];
  const datedTasks = new Map<string, { date: Date; tasks: HomeworkTask[] }>();

  sorted.forEach((task) => {
    const taskDay = new Date(
      task.deadline.getFullYear(),
      task.deadline.getMonth(),
      task.deadline.getDate()
    );
    if (task.deadline.getTime() < now.getTime()) {
      overdueTasks.push(task);
    } else if (dayKey(taskDay) === dayKey(tomorrow)) {
      tomorrowTasks.push(task);
    } else {
      const key = dayKey(taskDay);
      const group = datedTasks.get(key) ?? { date: taskDay, tasks: [] };
      group.tasks.push(task);
      datedTasks.set(key, group);
    }
  });

  const sections: HomeworkSectionData[] = [];
  if (tomorrowTasks.length) {
    sections.push({ title: "ส่งพรุ่งนี้", type: "tomorrow", tasks: tomorrowTasks });
  }
  datedTasks.forEach(({ date, tasks: groupTasks }) => {
    sections.push({ title: formatDate(date), type: "date", tasks: groupTasks });
  });
  if (overdueTasks.length) {
    sections.push({ title: "ล่าช้า", type: "overdue", tasks: overdueTasks });
  }
  return sections;
};

export const sectionColors: Record<
  HomeworkSectionType,
  { background: string; border: string }
> = {
  tomorrow: { background: "#FFEE9C", border: "#D9CB86" },
  date: { background: "#D7F2B6", border: "#A5BE85" },
  overdue: { background: "#FFCED5", border: "#E5A4AE" },
};
