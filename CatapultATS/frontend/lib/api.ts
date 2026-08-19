const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body && !(rest.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      token,
    }),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token }),
  delete: <T>(path: string, token?: string) => request<T>(path, { method: 'DELETE', token }),
};export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export type Region = 'UAE' | 'INDIA' | 'BOTH';

export type ScreeningQuestionType = 'TEXT' | 'YES_NO' | 'MULTIPLE_CHOICE';

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: ScreeningQuestionType;
  options: string[];
  required: boolean;
  order: number;
  disqualifyingAnswer?: string | null;
  archived?: boolean;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  region: Region;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  salaryRange?: string | null;
  deadline?: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  companyId?: string | null;
  company?: Company | null;
  screeningQuestions: ScreeningQuestion[];
  _count?: { applications: number };
}

export type ApplicationStatus =
  | 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'INTERVIEW_SCHEDULED'
  | 'OFFERED' | 'HIRED' | 'REJECTED';

export interface Application {
  id: string;
  candidateName: string;
  email: string;
  phone?: string;
  nationality?: string;
  currentLocation?: string;
  currentRole?: string;
  yearsExperience?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl: string;
  coverLetterUrl?: string;
  coverLetterText?: string;
  source: string;
  status: ApplicationStatus;
  createdAt: string;
  job: Job;
  reviewer?: { id: string; name: string };
  atsScore?: number | null;
  atsAutoRejected?: boolean;
  atsBreakdown?: {
    matchedRequirements: string[];
    missingRequirements: string[];
    matchedNiceToHave: string[];
    missingNiceToHave: string[];
    disqualifiedReason?: string;
    resumeTextAvailable: boolean;
  } | null;
  screeningAnswers?: {
    id: string;
    answer: string;
    question: ScreeningQuestion;
  }[];
  statusHistory?: {
    id: string;
    fromStatus: ApplicationStatus | null;
    toStatus: ApplicationStatus;
    note: string | null;
    interviewDate: string | null;
    interviewTime: string | null;
    interviewLocation: string | null;
    createdAt: string;
    changedBy: { name: string };
  }[];
}

export interface Settings {
  id: string;
  companyName: string;
  logoUrl: string | null;
  senderEmail: string | null;
  atsEnabled: boolean;
  atsPassThreshold: number;
  updatedAt: string;
}

export interface Reviewer {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'REVIEWER';
  isActive: boolean;
  isOwner: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string };
}
