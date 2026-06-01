import type {
  ApiResponse,
  ApplicationFilters,
  ApplicationResponse,
  CompanyFilters,
  CompanyResponse,
  TermResponse,
  LogbookEntryResponse,
  LogbookFilters,
  AttendanceResponse,
  AttendanceFilters,
  AuthResponse,
  CreateApplicationRequest,
  CreateTermRequest,
  UpdateTermRequest,
  SubmitLogbookRequest,
  CheckInRequest,
  CreateIssueRequest,
  SendMessageRequest,
  CreateThreadRequest,
  SettingsRequest,
} from "../types/api";

import { API_ENDPOINTS } from "./constants";

// ── Auth token — persisted in localStorage, restored on load ──
const TOKEN_KEY = "iams_token";

let authToken: string | null = (() => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
})();

export function setApiAuthToken(token: string | null): void {
  authToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function getApiAuthToken(): string | null {
  return authToken;
}

export function clearApiAuthToken(): void {
  authToken = null;
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

// ── URL helpers ──

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
    ?.trim().replace(/\/+$/, "") || "https://iams-backend.up.railway.app";

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      }
      continue;
    }
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function replacePathParams(path: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (p, [key, value]) => p.replace(`:${key}`, encodeURIComponent(value)),
    path
  );
}

function buildApiUrl(path: string, query?: Record<string, unknown>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}${buildQueryString(query)}`;
}

export function getApiUrl(path: string, query?: Record<string, unknown>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const qs = buildQueryString(query);
  const base = API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  try {
    return new URL(`${normalizedPath}${qs}`, base).toString();
  } catch {
    // Fallback to the simple concatenation (shouldn't normally happen)
    return `${base}${normalizedPath}${qs}`;
  }
}

function extractCollection<T>(response: ApiResponse<unknown>, collectionKey: string): T[] {
  const payload = response.data;
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];
  const envelope = payload as Record<string, unknown>;
  const collection = envelope[collectionKey];
  if (Array.isArray(collection)) return collection as T[];
  if (collection && typeof collection === "object" && Array.isArray((collection as { data?: unknown }).data)) {
    return (collection as { data: T[] }).data;
  }
  if (Array.isArray(envelope.data)) return envelope.data as T[];
  return [];
}

async function requestApi<T>(
  path: string,
  options: RequestInit & { query?: Record<string, unknown> } = {}
): Promise<ApiResponse<T>> {
  const { query, headers, ...rest } = options;
  const requestHeaders = new Headers(headers ?? {});
  if (!requestHeaders.has("Accept")) requestHeaders.set("Accept", "application/json");
  if (rest.body && typeof rest.body === "string" && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  const currentToken = getApiAuthToken();
  if (currentToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${currentToken}`);
  }

  const response = await fetch(buildApiUrl(path, query), { ...rest, headers: requestHeaders });
  const text = await response.text();
  const body = text
    ? (() => { try { return JSON.parse(text); } catch { return text; } })()
    : null;

  if (!response.ok) {
    return {
      success: false,
      data: (body && typeof body === "object" && "data" in body
        ? (body as { data: T }).data
        : null as T),
      message:
        (body && typeof body === "object" && "message" in body
          ? String((body as { message?: unknown }).message)
          : undefined) ?? `Request failed with status ${response.status}`,
    };
  }

  if (body && typeof body === "object" && "success" in body) {
    return body as ApiResponse<T>;
  }

  return {
    success: true,
    data: (body && typeof body === "object" && "data" in body
      ? (body as { data: T }).data
      : body ?? null) as T,
    message:
      body && typeof body === "object" && "message" in body
        ? String((body as { message?: unknown }).message)
        : undefined,
  };
}

export const apiClient = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUTH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async login(email: string, password = ""): Promise<ApiResponse<AuthResponse | null>> {
    const response = await requestApi<AuthResponse | null>(API_ENDPOINTS.AUTH_LOGIN, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.data?.token) setApiAuthToken(response.data.token);
    return response;
  },

  async loginWithToken(
    token: string,
    email = "",
    profile?: { name?: string; phone?: string; job_title?: string }
  ): Promise<ApiResponse<AuthResponse | null>> {
    const response = await requestApi<AuthResponse | null>(API_ENDPOINTS.AUTH_MAGIC_LINK_VERIFY, {
      method: "POST",
      body: JSON.stringify({ token, email, ...profile }),
    });
    if (response.success && response.data?.token) setApiAuthToken(response.data.token);
    return response;
  },

  async requestMagicLink(email: string): Promise<ApiResponse<{ expires_in?: string; magic_link?: string } | null>> {
    return requestApi(API_ENDPOINTS.AUTH_MAGIC_LINK, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async logout(): Promise<ApiResponse<null>> {
    const response = await requestApi<null>(API_ENDPOINTS.AUTH_LOGOUT, { method: "POST" });
    clearApiAuthToken();
    return response;
  },

  async me(): Promise<ApiResponse<AuthResponse | null>> {
    return requestApi<AuthResponse | null>(API_ENDPOINTS.AUTH_ME, { method: "GET" });
  },

  async refreshAuth(): Promise<ApiResponse<{ token: string; token_type: string } | null>> {
    const response = await requestApi<{ token: string; token_type: string } | null>(
      API_ENDPOINTS.AUTH_REFRESH,
      { method: "POST" }
    );
    if (response.success && response.data?.token) setApiAuthToken(response.data.token);
    return response;
  },

  async getGoogleAuthUrl(): Promise<ApiResponse<{ url: string } | null>> {
    return requestApi<{ url: string } | null>(API_ENDPOINTS.AUTH_GOOGLE, { method: "GET" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // APPLICATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getApplications(filters?: ApplicationFilters): Promise<ApiResponse<ApplicationResponse[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.APPLICATIONS, {
      method: "GET",
      query: filters as Record<string, unknown>,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<ApplicationResponse>(response, "applications") : [],
      message: response.message,
    };
  },

  async getPendingApplications(): Promise<ApiResponse<ApplicationResponse[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.APPLICATIONS_PENDING, { method: "GET" });
    return {
      success: response.success,
      data: response.success ? extractCollection<ApplicationResponse>(response, "applications") : [],
      message: response.message,
    };
  },

  async createApplication(data: CreateApplicationRequest | Record<string, unknown>): Promise<ApiResponse<ApplicationResponse | null>> {
    // Normalize to real API snake_case field names regardless of what the caller passes
    const payload: Record<string, unknown> = {
      company_id: Number((data as any).company_id ?? (data as any).companyId),
      academic_term_id: Number((data as any).academic_term_id ?? (data as any).termId),
      application_type: (data as any).application_type ?? "individual",
    };
    const coverLetter = (data as any).cover_letter ?? (data as any).coverLetter ?? (data as any).additionalNotes;
    if (coverLetter) payload.cover_letter = coverLetter;
    const startDate = (data as any).proposed_start_date ?? (data as any).preferredStartDate;
    if (startDate) payload.proposed_start_date = startDate;
    const endDate = (data as any).proposed_end_date;
    if (endDate) payload.proposed_end_date = endDate;

    return requestApi<ApplicationResponse | null>(API_ENDPOINTS.APPLICATIONS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateApplication(id: string, data: Partial<CreateApplicationRequest>): Promise<ApiResponse<ApplicationResponse | null>> {
    return requestApi<ApplicationResponse | null>(
      replacePathParams("/api/v1/applications/:id", { id }),
      { method: "PUT", body: JSON.stringify(data) }
    );
  },

  async deleteApplication(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams("/api/v1/applications/:id", { id }), {
      method: "DELETE",
    });
  },

  async submitApplication(id: string): Promise<ApiResponse<ApplicationResponse | null>> {
    return requestApi<ApplicationResponse | null>(
      replacePathParams(API_ENDPOINTS.APPLICATION_SUBMIT, { id }),
      { method: "POST" }
    );
  },

  async approveApplication(id: string): Promise<ApiResponse<ApplicationResponse | null>> {
    return requestApi<ApplicationResponse | null>(
      replacePathParams(API_ENDPOINTS.APPLICATION_APPROVE, { id }),
      { method: "PATCH" }
    );
  },

  async rejectApplication(id: string, rejectionReason: string): Promise<ApiResponse<ApplicationResponse | null>> {
    return requestApi<ApplicationResponse | null>(
      replacePathParams(API_ENDPOINTS.APPLICATION_REJECT, { id }),
      { method: "PATCH", body: JSON.stringify({ rejection_reason: rejectionReason }) }
    );
  },

  async bulkApproveApplications(ids: string[]): Promise<ApiResponse<null>> {
    return requestApi<null>(API_ENDPOINTS.APPLICATION_BULK_APPROVE, {
      method: "POST",
      body: JSON.stringify({ application_ids: ids }),
    });
  },

  async assignSupervisor(applicationId: string, supervisorId: number): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.APPLICATION_ASSIGN_SUPERVISOR, { id: applicationId }),
      { method: "POST", body: JSON.stringify({ supervisor_id: supervisorId }) }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMPANIES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getCompanies(filters?: CompanyFilters): Promise<ApiResponse<CompanyResponse[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.COMPANIES, {
      method: "GET",
      query: filters as Record<string, unknown>,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<CompanyResponse>(response, "companies") : [],
      message: response.message,
    };
  },

  async getPendingCompanies(): Promise<ApiResponse<CompanyResponse[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.COMPANIES_PENDING, { method: "GET" });
    return {
      success: response.success,
      data: response.success ? extractCollection<CompanyResponse>(response, "companies") : [],
      message: response.message,
    };
  },

  async createCompany(data: Record<string, unknown>): Promise<ApiResponse<CompanyResponse | null>> {
    return requestApi<CompanyResponse | null>(API_ENDPOINTS.COMPANIES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // The real API has no branch concept — this creates a company and returns a synthetic branch
  async createCompanyWithBranch(
    companyData: { name: string; contactPerson?: string; contactEmail?: string; [key: string]: unknown },
    branchData: { name: string; region?: string; location?: string; address?: string; telephone?: string; [key: string]: unknown }
  ): Promise<ApiResponse<{ company: CompanyResponse; branch: { id: string; name: string } } | null>> {
    const payload: Record<string, unknown> = {
      name: companyData.name,
      email: companyData.contactEmail ?? "",
      phone: branchData.telephone ?? "",
      address: branchData.address ?? branchData.location ?? "",
      city: branchData.location ?? "",
      region: branchData.region ?? "Greater Accra",
      country: "Ghana",
    };
    if (companyData.contactPerson) payload.contact_person_name = companyData.contactPerson;
    if (companyData.contactEmail) payload.contact_person_email = companyData.contactEmail;

    const res = await requestApi<any>(API_ENDPOINTS.COMPANIES, { method: "POST", body: JSON.stringify(payload) });
    if (!res.success) return { success: false, data: null, message: res.message };

    const company: CompanyResponse = res.data?.company ?? res.data;
    return {
      success: true,
      data: { company, branch: { id: String(company?.id ?? Date.now()), name: branchData.name || company?.name } },
      message: res.message,
    };
  },

  // The real API has no branch concept — returns a synthetic branch record
  async createBranch(data: {
    companyId: string;
    name: string;
    region?: string;
    location?: string;
    address?: string;
    telephone?: string;
    [key: string]: unknown;
  }): Promise<ApiResponse<{ id: string; name: string } | null>> {
    return { success: true, data: { id: `local-branch-${Date.now()}`, name: data.name } };
  },

  async updateCompany(id: string, data: Record<string, unknown>): Promise<ApiResponse<CompanyResponse | null>> {
    return requestApi<CompanyResponse | null>(
      replacePathParams("/api/v1/companies/:id", { id }),
      { method: "PUT", body: JSON.stringify(data) }
    );
  },

  async approveCompany(id: string): Promise<ApiResponse<CompanyResponse | null>> {
    return requestApi<CompanyResponse | null>(
      replacePathParams(API_ENDPOINTS.COMPANY_APPROVE, { id }),
      { method: "PATCH" }
    );
  },

  async rejectCompany(id: string, rejectionReason: string): Promise<ApiResponse<CompanyResponse | null>> {
    return requestApi<CompanyResponse | null>(
      replacePathParams(API_ENDPOINTS.COMPANY_REJECT, { id }),
      { method: "PATCH", body: JSON.stringify({ rejection_reason: rejectionReason }) }
    );
  },

  async deactivateCompany(id: string): Promise<ApiResponse<CompanyResponse | null>> {
    return requestApi<CompanyResponse | null>(
      replacePathParams(API_ENDPOINTS.COMPANY_DEACTIVATE, { id }),
      { method: "PATCH" }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TERMS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getTerms(): Promise<ApiResponse<TermResponse[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.TERMS, { method: "GET" });
    return {
      success: response.success,
      data: response.success ? extractCollection<TermResponse>(response, "terms") : [],
      message: response.message,
    };
  },

  async createTerm(data: CreateTermRequest): Promise<ApiResponse<TermResponse | null>> {
    return requestApi<TermResponse | null>(API_ENDPOINTS.TERMS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateTerm(id: string, data: UpdateTermRequest): Promise<ApiResponse<TermResponse | null>> {
    return requestApi<TermResponse | null>(
      replacePathParams("/api/v1/terms/:id", { id }),
      { method: "PUT", body: JSON.stringify(data) }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DEPARTMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getDepartments(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.DEPARTMENTS, {
      method: "GET",
      query: filters,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "departments") : [],
      message: response.message,
    };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // USERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getUsers(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.USERS, {
      method: "GET",
      query: filters,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "users") : [],
      message: response.message,
    };
  },

  async getImportableStaff(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.USERS_IMPORTABLE, {
      method: "GET",
      query: filters,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "staff") : [],
      message: response.message,
    };
  },

  async createDLOAccount(data: {
    name: string;
    email: string;
    department_id: number;
    staff_id: string;
    phone?: string;
    password?: string;
  }): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(API_ENDPOINTS.DLOS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async activateUser(id: string): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(replacePathParams(API_ENDPOINTS.USERS_ACTIVATE, { id }), {
      method: "PATCH",
    });
  },

  async deactivateUser(id: string): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(replacePathParams(API_ENDPOINTS.USERS_DEACTIVATE, { id }), {
      method: "PATCH",
    });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOGBOOK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getLogbookEntries(filters?: LogbookFilters): Promise<ApiResponse<LogbookEntryResponse[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.LOGBOOK_ENTRIES, {
      method: "GET",
      query: filters as Record<string, unknown>,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<LogbookEntryResponse>(response, "logbooks") : [],
      message: response.message,
    };
  },

  async submitLogbook(data: SubmitLogbookRequest): Promise<ApiResponse<null>> {
    return requestApi<null>(API_ENDPOINTS.LOGBOOK_ENTRIES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async approveLogbook(id: string, comment?: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.LOGBOOK_APPROVE, { id }),
      { method: "PATCH", body: JSON.stringify({ action: "approve", comment }) }
    );
  },

  async requestLogbookRevision(id: string, comment: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.LOGBOOK_REVISION, { id }),
      { method: "POST", body: JSON.stringify({ comment }) }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ATTENDANCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getAttendance(filters?: AttendanceFilters): Promise<ApiResponse<AttendanceResponse[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.ATTENDANCE, {
      method: "GET",
      query: filters as Record<string, unknown>,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<AttendanceResponse>(response, "attendance") : [],
      message: response.message,
    };
  },

  async getInternshipAttendance(
    internshipId: string,
    filters?: { from_date?: string; to_date?: string }
  ): Promise<ApiResponse<any>> {
    return requestApi<any>(
      replacePathParams(API_ENDPOINTS.ATTENDANCE_BY_INTERNSHIP, { internshipId }),
      { method: "GET", query: filters }
    );
  },

  async getMissedAttendance(): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.ATTENDANCE_MISSED, { method: "GET" });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "internships") : [],
      message: response.message,
    };
  },

  async checkIn(data: CheckInRequest): Promise<ApiResponse<null>> {
    return requestApi<null>(API_ENDPOINTS.ATTENDANCE_CHECKIN, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async checkOut(
    id: string,
    data?: { check_out_time?: string; gps_check_out_lat?: number; gps_check_out_lng?: number }
  ): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.ATTENDANCE_CHECKOUT, { id }),
      { method: "PATCH", body: JSON.stringify(data ?? {}) }
    );
  },

  async verifyAttendance(id: string, status: string, notes?: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.ATTENDANCE_VERIFY, { id }),
      { method: "PATCH", body: JSON.stringify({ status, notes }) }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GRADES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async approveGrade(applicationId: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.GRADE_APPROVE, { id: applicationId }),
      { method: "PATCH" }
    );
  },

  async requestGradeRevision(applicationId: string, reason: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.GRADE_REVISION, { id: applicationId }),
      { method: "POST", body: JSON.stringify({ reason }) }
    );
  },

  async submitWeeklyRubric(
    applicationId: string,
    weekNumber: number,
    ratings: Record<string, number>,
    notes: string
  ): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams("/api/v1/grades/:id/weekly-rubric", { id: applicationId }),
      { method: "POST", body: JSON.stringify({ week_number: weekNumber, ratings, notes }) }
    );
  },

  async submitIndustrialAssessment(
    applicationId: string,
    ratings: Record<string, number>,
    comments: string
  ): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams("/api/v1/grades/:id/industrial-assessment", { id: applicationId }),
      { method: "POST", body: JSON.stringify({ ratings, comments }) }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ISSUES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getIssues(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.ISSUES, {
      method: "GET",
      query: filters,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "issues") : [],
      message: response.message,
    };
  },

  async createIssue(data: CreateIssueRequest): Promise<ApiResponse<null>> {
    return requestApi<null>(API_ENDPOINTS.ISSUES, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async addIssueNote(issueId: string, content: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.ISSUE_NOTE, { id: issueId }),
      { method: "POST", body: JSON.stringify({ content }) }
    );
  },

  async updateIssueStatus(issueId: string, status: string, resolution?: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.ISSUE_STATUS, { id: issueId }),
      { method: "POST", body: JSON.stringify({ status, resolution }) }
    );
  },

  async escalateIssue(issueId: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.ISSUE_ESCALATE, { id: issueId }),
      { method: "POST" }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MESSAGES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getThreads(userId?: string): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.THREADS, {
      method: "GET",
      query: userId ? { user_id: userId } : undefined,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "threads") : [],
      message: response.message,
    };
  },

  async getMessages(threadId: string): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(
      replacePathParams(API_ENDPOINTS.THREAD_MESSAGES, { id: threadId }),
      { method: "GET" }
    );
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "messages") : [],
      message: response.message,
    };
  },

  async sendMessage(threadId: string, data: SendMessageRequest): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.THREAD_SEND, { id: threadId }),
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  async createThread(data: CreateThreadRequest): Promise<ApiResponse<{ threadId: string }>> {
    return requestApi<{ threadId: string }>(API_ENDPOINTS.THREAD_CREATE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async markThreadRead(threadId: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.THREAD_MESSAGES, { id: threadId }),
      { method: "PATCH", body: JSON.stringify({ read: true }) }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NOTIFICATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getNotifications(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.NOTIFICATIONS, {
      method: "GET",
      query: filters,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "notifications") : [],
      message: response.message,
    };
  },

  async markNotificationRead(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.NOTIFICATION_READ, { id }),
      { method: "POST" }
    );
  },

  async markAllNotificationsRead(): Promise<ApiResponse<null>> {
    return requestApi<null>(API_ENDPOINTS.NOTIFICATIONS_READ_ALL, { method: "POST" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DASHBOARDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getDashboard(
    role: "student" | "clo" | "dlo" | "industry-supervisor" | "academic-supervisor"
  ): Promise<ApiResponse<any>> {
    const endpointMap: Record<string, string> = {
      student: API_ENDPOINTS.DASHBOARD_STUDENT,
      clo: API_ENDPOINTS.DASHBOARD_CLO,
      dlo: API_ENDPOINTS.DASHBOARD_DLO,
      "industry-supervisor": API_ENDPOINTS.DASHBOARD_SUPERVISOR,
      "academic-supervisor": API_ENDPOINTS.DASHBOARD_ACADEMIC,
    };
    return requestApi<any>(endpointMap[role], { method: "GET" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getAnalyticsOverview(termId?: number): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.ANALYTICS_OVERVIEW, {
      method: "GET",
      query: termId ? { term_id: termId } : undefined,
    });
  },

  async getDepartmentAnalytics(id: string, termId?: number): Promise<ApiResponse<any>> {
    return requestApi<any>(
      replacePathParams(API_ENDPOINTS.ANALYTICS_DEPARTMENT, { id }),
      { method: "GET", query: termId ? { term_id: termId } : undefined }
    );
  },

  async getTermAnalytics(id: string, departmentId?: number): Promise<ApiResponse<any>> {
    return requestApi<any>(
      replacePathParams(API_ENDPOINTS.ANALYTICS_TERM, { id }),
      { method: "GET", query: departmentId ? { department_id: departmentId } : undefined }
    );
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUDIT LOGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getAuditLogs(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.AUDIT_LOGS, {
      method: "GET",
      query: filters,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "logs") : [],
      message: response.message,
    };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getSettings(): Promise<ApiResponse<SettingsRequest>> {
    return requestApi<SettingsRequest>(API_ENDPOINTS.SETTINGS, { method: "GET" });
  },

  async updateSettings(data: SettingsRequest): Promise<ApiResponse<null>> {
    return requestApi<null>(API_ENDPOINTS.SETTINGS, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

export type ApiClient = typeof apiClient;
