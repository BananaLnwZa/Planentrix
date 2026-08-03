export interface ManagedSubjectType {
  subject_type_id: number;
  subject_type_name: string;
  subject_count: number;
}

export interface SubjectTypesResponse {
  message: string;
  subject_types: ManagedSubjectType[];
}

export interface SubjectTypePayload {
  subject_type_name: string;
}

export interface SubjectTypeMutationResponse {
  message: string;
  subject_type: ManagedSubjectType;
}

export interface DeleteSubjectTypeResponse {
  message: string;
}

export interface SubjectTypeErrorResponse {
  message: string;
  subject_count?: number;
}
