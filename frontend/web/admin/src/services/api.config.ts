const getAdminApiBaseUrl = (): string => {
  const baseUrl =
    typeof window === "undefined"
      ? process.env.ADMIN_API_URL ||
        process.env.NEXT_PUBLIC_ADMIN_API_URL ||
        "http://localhost:4000"
      : process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:4000";

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
    register: "/auth/admin/register",
    registrationOptions: "/auth/registration-options",
    logout: "/auth/logout",
    profile: "/auth/me",
  },
  users: {
    list: "/admin/users",
    byId: (userId: number) => `/admin/users/${userId}`,
    instructorById: (instructorId: number) =>
      `/admin/users/instructors/${instructorId}`,
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
  faculties: {
    list: "/admin/faculties",
    byId: (facultyId: number) => `/admin/faculties/${facultyId}`,
    status: (facultyId: number) => `/admin/faculties/${facultyId}/status`,
  },
  departments: {
    list: "/admin/departments",
    byId: (departmentId: number) => `/admin/departments/${departmentId}`,
    status: (departmentId: number) =>
      `/admin/departments/${departmentId}/status`,
  },
  teaching: {
    workspace: "/admin/teaching",
    terms: "/admin/teaching/terms",
    sections: "/admin/teaching/sections",
    sectionById: (sectionId: number) =>
      `/admin/teaching/sections/${sectionId}`,
    sectionStatus: (sectionId: number) =>
      `/admin/teaching/sections/${sectionId}/status`,
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
  instructorExams: {
    workspace: "/instructor/exam-workspace",
    questionBanks: "/instructor/question-banks",
    questionBankById: (questionBankId: number) =>
      `/instructor/question-banks/${questionBankId}`,
    questions: (questionBankId: number) =>
      `/instructor/question-banks/${questionBankId}/questions`,
    questionById: (questionBankId: number, questionId: number) =>
      `/instructor/question-banks/${questionBankId}/questions/${questionId}`,
    importFile: (questionBankId: number) =>
      `/instructor/question-banks/${questionBankId}/import`,
  },
  instructorWorkspace: {
    dashboard: "/instructor/dashboard",
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
