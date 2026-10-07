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
    firstLoginPassword: "/auth/first-login-password",
  },
  users: {
    list: "/admin/users",
    byId: (userId: number) => `/admin/users/${userId}`,
    status: (userId: number) => `/admin/users/${userId}/status`,
    instructorById: (instructorId: number) =>
      `/admin/users/instructors/${instructorId}`,
    instructorStatus: (instructorId: number) =>
      `/admin/users/instructors/${instructorId}/status`,
  },
  subjects: {
    list: "/admin/subjects",
    curriculum: "/admin/subjects/curriculum",
    curriculumById: (curriculumSubjectId: number) =>
      `/admin/subjects/curriculum/${curriculumSubjectId}`,
    curriculumStatus: (curriculumSubjectId: number) =>
      `/admin/subjects/curriculum/${curriculumSubjectId}/status`,
    byId: (subjectId: string) =>
      `/admin/subjects/${encodeURIComponent(subjectId)}`,
    status: (subjectId: string) =>
      `/admin/subjects/${encodeURIComponent(subjectId)}/status`,
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
    termById: (termId: number) => `/admin/teaching/terms/${termId}`,
    termStatus: (termId: number) => `/admin/teaching/terms/${termId}/status`,
    sections: "/admin/teaching/sections",
    sectionById: (sectionId: number) =>
      `/admin/teaching/sections/${sectionId}`,
    sectionStatus: (sectionId: number) =>
      `/admin/teaching/sections/${sectionId}/status`,
    meetings: (sectionId: number) =>
      `/admin/teaching/sections/${sectionId}/meetings`,
    meetingById: (sectionId: number, meetingId: number) =>
      `/admin/teaching/sections/${sectionId}/meetings/${meetingId}`,
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
    publish: (questionBankId: number) =>
      `/instructor/question-banks/${questionBankId}/publish`,
    draft: (questionBankId: number) =>
      `/instructor/question-banks/${questionBankId}/draft`,
    image: (questionBankId: number, filename: string) =>
      `/instructor/question-banks/${questionBankId}/images/${encodeURIComponent(filename)}`,
    importFile: (questionBankId: number) =>
      `/instructor/question-banks/${questionBankId}/import`,
  },
  instructorWorkspace: {
    dashboard: "/instructor/dashboard",
  },
  instructorGrading: {
    workspace: "/instructor/grading-schemes",
    schemes: "/instructor/grading-schemes",
    byId: (schemeId: number) => `/instructor/grading-schemes/${schemeId}`,
    publish: (schemeId: number) =>
      `/instructor/grading-schemes/${schemeId}/publish`,
  },
  dashboard: {
    studyTime: "/admin/dashboard/study-time",
    constraints: "/admin/dashboard/constraints",
    examParts: "/admin/dashboard/exam-parts",
    usersByYear: "/admin/dashboard/users-by-year",
    workloads: "/admin/dashboard/workloads",
    examScores: "/admin/dashboard/exam-scores",
  },
} as const;
