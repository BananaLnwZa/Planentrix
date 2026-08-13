const getAdminApiBaseUrl = (): string => {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.ADMIN_API_URL ||
        process.env.NEXT_PUBLIC_ADMIN_API_URL ||
        "http://localhost:4100"
      : process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:4100";

  return baseUrl.replace(/\/$/, "");
};

export const apiConfig = {
  baseURL: getAdminApiBaseUrl(),
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
};

export const apiEndpoints = {
  auth: {
    register: "/admin/auth/register",
    login: "/admin/auth/login",
    logout: "/admin/auth/logout",
    profile: "/admin/auth/me",
  },
  users: {
    list: "/admin/users",
    byId: (userId: number) => `/admin/users/${userId}`,
  },
  subjects: {
    list: "/admin/subjects",
    byId: (subjectId: string) =>
      `/admin/subjects/${encodeURIComponent(subjectId)}`,
    status: (subjectId: string) =>
      `/admin/subjects/${encodeURIComponent(subjectId)}/status`,
  },
  subjectTypes: {
    list: "/admin/subject-types",
    byId: (subjectTypeId: number) =>
      `/admin/subject-types/${subjectTypeId}`,
  },
  exams: {
    list: "/admin/exams",
    byId: (examId: number) => `/admin/exams/${examId}`,
    parts: (examId: number) => `/admin/exams/${examId}/parts`,
    partById: (partId: number) => `/admin/exams/parts/${partId}`,
    questions: (partId: number) =>
      `/admin/exams/parts/${partId}/questions`,
    questionById: (questionId: number) =>
      `/admin/exams/questions/${questionId}`,
    choices: (questionId: number) =>
      `/admin/exams/questions/${questionId}/choices`,
    choiceById: (choiceId: number) =>
      `/admin/exams/choices/${choiceId}`,
  },
  dashboard: {
    studyTime: "/admin/dashboard/study-time",
    constraints: "/admin/dashboard/constraints",
    examParts: "/admin/dashboard/exam-parts",
    usersByYear: "/admin/dashboard/users-by-year",
    workloads: "/admin/dashboard/workloads",
    examScores: "/admin/dashboard/exam-scores",
    reviewMethods: "/admin/dashboard/review-methods",
  },
} as const;
