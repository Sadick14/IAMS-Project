import type {
  ApiResponse,
  ApplicationFilters,
  ApplicationResponse,
  CompanyFilters,
  CompanyResponse,
  BranchResponse,
  CreateBranchRequest,
  TermResponse,
  TermDashboardResponse,
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

// Unwrap a single object that the backend nests under data.<key> (e.g. { data: { term: {...} } }).
function unwrapEntity<T>(response: ApiResponse<unknown>, key: string): T | null {
  const payload = response.data as any;
  if (!payload || typeof payload !== "object") return (payload ?? null) as T | null;
  if (payload[key] && typeof payload[key] === "object") return payload[key] as T;
  return payload as T;
}

function unwrapTerm(response: ApiResponse<unknown>): TermResponse | null {
  return response.success ? unwrapEntity<TermResponse>(response, "term") : null;
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

  async requestMagicLink(
    email: string,
    context?: {
      role?: "industry_supervisor" | "supervisor";
      name?: string;
      phone?: string;
      job_title?: string;
      application_id?: string | number;
      company_name?: string;
      student_name?: string;
    }
  ): Promise<ApiResponse<{ expires_in?: string; magic_link?: string } | null>> {
    return requestApi(API_ENDPOINTS.AUTH_MAGIC_LINK, {
      method: "POST",
      body: JSON.stringify({ email, ...context }),
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
      status: (data as any).status ?? "submitted", // Default to "submitted" (draft only used locally)
    };
    const coverLetter = (data as any).cover_letter ?? (data as any).coverLetter ?? (data as any).additionalNotes;
    if (coverLetter) payload.cover_letter = coverLetter;
    const startDate = (data as any).proposed_start_date ?? (data as any).preferredStartDate;
    if (startDate) payload.proposed_start_date = startDate;
    const endDate = (data as any).proposed_end_date;
    if (endDate) payload.proposed_end_date = endDate;

    const response = await requestApi<any>(API_ENDPOINTS.APPLICATIONS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // Backend wraps the application under data.application — unwrap to top level
    const application = response.data?.application ?? response.data;
    return { ...response, data: application };
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
      { method: "POST", body: JSON.stringify({}) }
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

  async submitCompanyAcceptance(
    id: string,
    data: {
      industry_supervisor_name?: string;
      industry_supervisor_title?: string;
      industry_supervisor_email?: string;
      industry_supervisor_phone?: string;
      confirmed_start_date?: string;
      confirmed_end_date?: string;
      student_role?: string;
      placement_department?: string;
      acceptance_notes?: string;
      acceptance_form_url?: string;
    }
  ): Promise<ApiResponse<ApplicationResponse | null>> {
    return requestApi<ApplicationResponse | null>(
      replacePathParams("/api/v1/applications/:id/accept", { id }),
      { method: "PATCH", body: JSON.stringify(data) }
    );
  },

  async uploadFile(file: File, folder = "iams"): Promise<ApiResponse<{ url: string; public_id: string } | null>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    const requestHeaders = new Headers();
    requestHeaders.set("Accept", "application/json");
    const currentToken = getApiAuthToken();
    if (currentToken) requestHeaders.set("Authorization", `Bearer ${currentToken}`);
    const response = await fetch(buildApiUrl("/api/v1/upload"), {
      method: "POST",
      headers: requestHeaders,
      body: formData,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) return { success: false, data: null, message: body?.message ?? "Upload failed" };
    return { success: true, data: body?.data ?? null, message: body?.message };
  },

  async withdrawApplication(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams("/api/v1/applications/:id/withdraw", { id }),
      { method: "DELETE" }
    );
  },

  async bulkApproveApplications(ids: string[]): Promise<ApiResponse<null>> {
    return requestApi<null>(API_ENDPOINTS.APPLICATION_BULK_APPROVE, {
      method: "POST",
      body: JSON.stringify({ application_ids: ids }),
    });
  },

  async assignSupervisor(internshipId: string, supervisorId: number): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.INTERNSHIP_ASSIGN_SUPERVISOR, { id: internshipId }),
      { method: "POST", body: JSON.stringify({ academic_supervisor_id: supervisorId }) }
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

  // DEPRECATED: Use createCompanyBranch() instead. This returns a synthetic local ID.
  async createBranch(data: {
    companyId: string;
    name: string;
    region?: string;
    location?: string;
    address?: string;
    telephone?: string;
    [key: string]: unknown;
  }): Promise<ApiResponse<{ id: string; name: string } | null>> {
    console.warn("createBranch() is deprecated — use createCompanyBranch(companyId, data) instead");
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

  async getCompanyBranches(companyId: string): Promise<ApiResponse<BranchResponse[]>> {
    const response = await requestApi<unknown>(
      replacePathParams("/api/v1/companies/:id/branches", { id: companyId }),
      { method: "GET" }
    );
    return {
      success: response.success,
      data: response.success ? extractCollection<BranchResponse>(response, "branches") : [],
      message: response.message,
    };
  },

  async createCompanyBranch(companyId: string, data: CreateBranchRequest): Promise<ApiResponse<BranchResponse>> {
    const response = await requestApi<{ branch: BranchResponse }>(
      replacePathParams("/api/v1/companies/:id/branches", { id: companyId }),
      { method: "POST", body: JSON.stringify(data) }
    );
    return {
      success: response.success,
      data: (response.data as any)?.branch ?? (response.data as any),
      message: response.message,
    };
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

  async getTerm(id: string): Promise<ApiResponse<TermResponse | null>> {
    const response = await requestApi<unknown>(
      replacePathParams(API_ENDPOINTS.TERM_BY_ID, { id }),
      { method: "GET" }
    );
    if (!response.success) return { success: false, data: null, message: response.message };
    const payload = response.data;
    const term =
      payload && typeof payload === "object" && "data" in (payload as object)
        ? (payload as { data: TermResponse }).data
        : (payload as TermResponse);
    return { success: true, data: term, message: response.message };
  },

  async getTermDashboard(id: string): Promise<ApiResponse<TermDashboardResponse | null>> {
    const response = await requestApi<unknown>(
      replacePathParams(API_ENDPOINTS.TERM_DASHBOARD, { id }),
      { method: "GET" }
    );
    if (!response.success) return { success: false, data: null, message: response.message };
    const payload = response.data;
    const dashboard =
      payload && typeof payload === "object" && "data" in (payload as object)
        ? (payload as { data: TermDashboardResponse }).data
        : (payload as TermDashboardResponse);
    return { success: true, data: dashboard, message: response.message };
  },

  async createTerm(data: CreateTermRequest): Promise<ApiResponse<TermResponse | null>> {
    // Map UI types → real API type values
    const typeMap: Record<string, string> = { Vacation: "short_term", Semestrial: "regular" };
    const payload: Record<string, unknown> = {
      name: data.name,
      type: typeMap[data.type] ?? data.type,
      // Real API: single application_deadline (use closing date)
      application_deadline: data.applicationEnd ?? data.applicationStart,
      // Real API: start_date / end_date for internship period
      start_date: data.internshipStart,
      end_date: data.internshipEnd,
      eligible_levels: data.eligibleLevels,
      departments: data.departments,
    };
    const response = await requestApi<unknown>(API_ENDPOINTS.TERMS, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { success: response.success, data: unwrapTerm(response), message: response.message };
  },

  async updateTerm(id: string, data: UpdateTermRequest): Promise<ApiResponse<TermResponse | null>> {
    const typeMap: Record<string, string> = { Vacation: "short_term", Semestrial: "regular" };
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.type !== undefined) payload.type = typeMap[data.type] ?? data.type;
    // Real API: single application_deadline — use closing date if present
    if (data.applicationEnd !== undefined || data.applicationStart !== undefined)
      payload.application_deadline = data.applicationEnd ?? data.applicationStart;
    // Real API: start_date / end_date for internship period
    if (data.internshipStart !== undefined) payload.start_date = data.internshipStart;
    if (data.internshipEnd !== undefined) payload.end_date = data.internshipEnd;
    if (data.eligibleLevels !== undefined) payload.eligible_levels = data.eligibleLevels;
    if (data.departments !== undefined) payload.departments = data.departments;
    // Real API status values are lowercase
    if (data.status !== undefined) payload.status = data.status.toLowerCase();
    const response = await requestApi<unknown>(
      replacePathParams(API_ENDPOINTS.TERM_BY_ID, { id }),
      { method: "PUT", body: JSON.stringify(payload) }
    );
    return { success: response.success, data: unwrapTerm(response), message: response.message };
  },

  async publishTerm(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.TERM_PUBLISH, { id }),
      { method: "PATCH" }
    );
  },

  async archiveTerm(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.TERM_ARCHIVE, { id }),
      { method: "PATCH" }
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

  async getDepartment(id: string): Promise<ApiResponse<any | null>> {
    const response = await requestApi<unknown>(
      replacePathParams(API_ENDPOINTS.DEPARTMENT_BY_ID, { id }),
      { method: "GET" }
    );
    if (!response.success) return { success: false, data: null, message: response.message };
    const payload = response.data;
    const dept =
      payload && typeof payload === "object" && "department" in (payload as object)
        ? (payload as { department: any }).department
        : (payload as any);
    return { success: true, data: dept, message: response.message };
  },

  async createDepartment(data: {
    name: string;
    code: string;
    description?: string;
    contact_email?: string;
    contact_phone?: string;
  }): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(API_ENDPOINTS.DEPARTMENTS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateDepartment(id: string, data: {
    name?: string;
    code?: string;
    description?: string;
    contact_email?: string;
    contact_phone?: string;
  }): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(
      replacePathParams(API_ENDPOINTS.DEPARTMENT_BY_ID, { id }),
      { method: "PUT", body: JSON.stringify(data) }
    );
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

  async createUser(data: {
    name: string;
    email: string;
    role: string;
    phone?: string;
    department_id?: number;
    staff_id?: string;
  }): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(API_ENDPOINTS.USERS, {
      method: "POST",
      body: JSON.stringify(data),
    });
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

  async getUser(id: string): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(
      replacePathParams(API_ENDPOINTS.USER_BY_ID, { id }),
      { method: "GET" }
    );
  },

  async getStudentProfile(userId: string): Promise<ApiResponse<any | null>> {
    const res = await requestApi<any>(API_ENDPOINTS.STUDENTS, { query: { user_id: userId } });
    if (!res.success) return { success: false, data: null, message: res.message };
    const payload = res.data as any;
    // Student role returns { data: { student: {...} } }; admin returns paginated list
    const profile =
      payload?.student ??
      (Array.isArray(payload?.students) ? payload.students[0] : null) ??
      (Array.isArray(payload?.data) ? payload.data[0] : null) ??
      (Array.isArray(payload) ? payload[0] : null);
    if (!profile) return { success: false, data: null, message: "Student profile not found" };
    return { success: true, data: profile, message: res.message };
  },

  async updateUser(id: string, data: Record<string, any>): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(
      replacePathParams(API_ENDPOINTS.USER_BY_ID, { id }),
      { method: "PUT", body: JSON.stringify(data) }
    );
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
    filters?: { from_date?: string; to_date?: string; per_page?: number }
  ): Promise<ApiResponse<any[]>> {
    // Use general attendance endpoint with internship_id filter
    const response = await requestApi<unknown>(
      "/api/v1/attendance",
      { method: "GET", query: { ...filters, internship_id: internshipId } }
    );
    const attendance = response.success ? extractCollection<any>(response, "attendance") : [];
    console.log(`[API] getInternshipAttendance(${internshipId}):`, {
      success: response.success,
      filters: { ...filters, internship_id: internshipId },
      rawResponse: response.data,
      extractedAttendance: attendance
    });
    return { success: response.success, data: attendance, message: response.message };
  },

  async getMissedAttendance(days?: number): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(
      API_ENDPOINTS.ATTENDANCE_MISSED,
      { method: "GET", query: days && days > 1 ? { days } : undefined }
    );
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

  // Weekly rubric has no backend equivalent yet — calls will fail gracefully
  async submitWeeklyRubric(
    applicationId: string,
    weekNumber: number,
    ratings: Record<string, number>,
    notes: string,
    _actor?: unknown
  ): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams("/api/v1/grades/:id/weekly-rubric", { id: applicationId }),
      { method: "POST", body: JSON.stringify({ week_number: weekNumber, ratings, notes }) }
    );
  },

  // Creates a draft assessment then immediately submits it.
  // ratings keys must be the 18 backend field names (tech_*, prof_*, eth_*, overall_*).
  async submitIndustrialAssessment(
    internshipId: string,
    ratings: Record<string, number>,
    comments: string,
    _actor?: unknown
  ): Promise<ApiResponse<null>> {
    const payload: Record<string, unknown> = {
      internship_id: Number(internshipId),
      general_comments: comments,
      ...ratings,
    };
    const createRes = await requestApi<any>(API_ENDPOINTS.ASSESSMENTS_INDUSTRIAL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!createRes.success) return createRes as ApiResponse<null>;

    const assessmentId = createRes.data?.assessment?.id ?? createRes.data?.id;
    if (!assessmentId) return createRes as ApiResponse<null>;

    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.ASSESSMENT_INDUSTRIAL_SUBMIT, { id: String(assessmentId) }),
      { method: "PATCH" }
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
  // ANNOUNCEMENTS (dedicated table)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getAnnouncements(filters?: { unread_only?: boolean; per_page?: number }): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.ANNOUNCEMENTS, {
      method: "GET",
      query: filters as Record<string, unknown>,
    });
    return {
      success: response.success,
      data: response.success ? extractCollection<any>(response, "announcements") : [],
      message: response.message,
    };
  },

  async getAnnouncementUnreadCount(): Promise<ApiResponse<{ unread_count: number } | null>> {
    return requestApi<{ unread_count: number } | null>(API_ENDPOINTS.ANNOUNCEMENT_UNREAD_COUNT, { method: "GET" });
  },

  async createAnnouncement(data: {
    title: string;
    message: string;
    priority?: "low" | "normal" | "high" | "urgent";
    target_roles?: string[];
    target_department_id?: number;
    student_level?: number;
    term_type?: string;
    placement_status?: string;
  }): Promise<ApiResponse<any | null>> {
    return requestApi<any | null>(API_ENDPOINTS.ANNOUNCEMENTS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async markAnnouncementRead(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.ANNOUNCEMENT_READ, { id }),
      { method: "POST" }
    );
  },

  async pinAnnouncement(id: string): Promise<ApiResponse<{ pinned: boolean } | null>> {
    return requestApi<{ pinned: boolean } | null>(
      replacePathParams(API_ENDPOINTS.ANNOUNCEMENT_PIN, { id }),
      { method: "PATCH" }
    );
  },

  async deleteAnnouncement(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(
      replacePathParams(API_ENDPOINTS.ANNOUNCEMENT_DELETE, { id }),
      { method: "DELETE" }
    );
  },

  async broadcastNotification(data: {
    title: string;
    message: string;
    type?: string;
    priority?: "normal" | "urgent";
    roles?: string[];
    department_id?: number;
  }): Promise<ApiResponse<{ recipients: number } | null>> {
    return requestApi<{ recipients: number } | null>("/api/v1/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DASHBOARDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getDashboard(
    role: "student" | "clo" | "dlo" | "hod" | "industry-supervisor" | "academic-supervisor"
  ): Promise<ApiResponse<any>> {
    const endpointMap: Record<string, string> = {
      student: API_ENDPOINTS.DASHBOARD_STUDENT,
      clo: API_ENDPOINTS.DASHBOARD_CLO,
      dlo: API_ENDPOINTS.DASHBOARD_DLO,
      hod: API_ENDPOINTS.DASHBOARD_HOD,
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INTERNSHIPS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getInternships(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.INTERNSHIPS, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "internships") : [], message: response.message };
  },

  async getActiveInternships(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.INTERNSHIP_ACTIVE, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "internships") : [], message: response.message };
  },

  async getInternship(id: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/internships/:id", { id }), { method: "GET" });
  },

  async getInternshipOverview(id: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams(API_ENDPOINTS.INTERNSHIP_OVERVIEW, { id }), { method: "GET" });
  },

  async activateInternship(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.INTERNSHIP_ACTIVATE, { id }), { method: "PATCH" });
  },

  async completeInternship(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.INTERNSHIP_COMPLETE, { id }), { method: "PATCH" });
  },

  async terminateInternship(id: string, reason?: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.INTERNSHIP_TERMINATE, { id }), { method: "PATCH", body: JSON.stringify({ reason }) });
  },

  async getInternshipLogbooks(internshipId: string, filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    // Use general logbooks endpoint with internship_id filter (internship-specific endpoint doesn't work)
    const response = await requestApi<unknown>(
      "/api/v1/logbooks",
      { method: "GET", query: { ...filters, internship_id: internshipId } }
    );
    const logbooks = response.success ? extractCollection<any>(response, "logbooks") : [];
    return { success: response.success, data: logbooks, message: response.message };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STUDENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getStudents(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.STUDENTS, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "students") : [], message: response.message };
  },

  async getStudent(id: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/students/:id", { id }), { method: "GET" });
  },

  async updateStudent(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/students/:id", { id }), { method: "PUT", body: JSON.stringify(data) });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUPERVISOR ASSIGNMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getSupervisorAssignmentsPending(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.SUPERVISOR_ASSIGNMENTS_PENDING, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "internships") : [], message: response.message };
  },

  async getAvailableSupervisors(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.SUPERVISOR_ASSIGNMENTS_AVAILABLE, {
      method: "GET",
      query: filters,
    });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "supervisors") : [], message: response.message };
  },

  async getSupervisorStudents(supervisorId: string): Promise<ApiResponse<any>> {
    return requestApi<any>(
      replacePathParams(API_ENDPOINTS.SUPERVISOR_STUDENTS, { supervisorId }),
      { method: "GET" }
    );
  },

  async autoAssignSupervisors(data: { term_id: number; department_id?: string | number }): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.SUPERVISOR_ASSIGNMENTS_AUTO, { method: "POST", body: JSON.stringify(data) });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SITE VISITATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getSiteVisitations(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.SITE_VISITATIONS, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "visitations") : [], message: response.message };
  },

  async createSiteVisitation(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.SITE_VISITATIONS, { method: "POST", body: JSON.stringify(data) });
  },

  async updateSiteVisitation(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/site-visitations/:id", { id }), { method: "PUT", body: JSON.stringify(data) });
  },

  async completeSiteVisitation(id: string, data?: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams(API_ENDPOINTS.SITE_VISITATION_COMPLETE, { id }), { method: "PATCH", body: JSON.stringify(data ?? {}) });
  },

  async cancelSiteVisitation(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.SITE_VISITATION_CANCEL, { id }), { method: "PATCH" });
  },

  async getSiteVisitationScore(visitationId: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams(API_ENDPOINTS.SITE_VISITATION_SCORE, { visitationId }), { method: "GET" });
  },

  async submitSiteVisitationScore(visitationId: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams(API_ENDPOINTS.SITE_VISITATION_SCORE, { visitationId }), { method: "POST", body: JSON.stringify(data) });
  },

  async submitSiteVisitationScoreForApproval(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.SITE_VISITATION_SCORE_SUBMIT, { id }), { method: "PATCH" });
  },

  async approveSiteVisitationScore(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.SITE_VISITATION_SCORE_APPROVE, { id }), { method: "PATCH" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INDUSTRIAL ASSESSMENTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getIndustrialAssessments(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.ASSESSMENTS_INDUSTRIAL, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "assessments") : [], message: response.message };
  },

  async getIndustrialAssessment(id: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/assessments/industrial/:id", { id }), { method: "GET" });
  },

  async updateIndustrialAssessment(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/assessments/industrial/:id", { id }), { method: "PUT", body: JSON.stringify(data) });
  },

  async approveIndustrialAssessment(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.ASSESSMENT_INDUSTRIAL_APPROVE, { id }), { method: "PATCH" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REPORT SCORES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getReportScore(internshipId: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/assessments/report/:internshipId", { internshipId }), { method: "GET" });
  },

  async gradeReport(internshipId: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/assessments/report/:internshipId", { internshipId }), { method: "POST", body: JSON.stringify(data) });
  },

  async updateReportScore(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/assessments/report/:id", { id }), { method: "PUT", body: JSON.stringify(data) });
  },

  async approveReportScore(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.ASSESSMENT_REPORT_APPROVE, { id }), { method: "PATCH" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRESENTATION SCORES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getPresentationScores(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.ASSESSMENTS_PRESENTATION, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "presentations") : [], message: response.message };
  },

  async schedulePresentationScore(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.ASSESSMENTS_PRESENTATION, { method: "POST", body: JSON.stringify(data) });
  },

  async getPresentationScore(internshipId: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/assessments/presentation/:internshipId", { internshipId }), { method: "GET" });
  },

  async updatePresentationScore(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/assessments/presentation/:id", { id }), { method: "PUT", body: JSON.stringify(data) });
  },

  async gradePresentationScore(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams(API_ENDPOINTS.ASSESSMENT_PRESENTATION_GRADE, { id }), { method: "PATCH", body: JSON.stringify(data) });
  },

  async approvePresentationScore(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.ASSESSMENT_PRESENTATION_APPROVE, { id }), { method: "PATCH" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GRADING CONFIGURATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getGradingConfigs(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.GRADING_CONFIG, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "configs") : [], message: response.message };
  },

  async getGradingConfig(id: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/grading-config/:id", { id }), { method: "GET" });
  },

  async createGradingConfig(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.GRADING_CONFIG, { method: "POST", body: JSON.stringify(data) });
  },

  async updateGradingConfig(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/grading-config/:id", { id }), { method: "PUT", body: JSON.stringify(data) });
  },

  async setDefaultGradingConfig(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.GRADING_CONFIG_SET_DEFAULT, { id }), { method: "PATCH" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FINAL GRADES (extended)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getGrades(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.GRADES, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "grades") : [], message: response.message };
  },

  async getGrade(internshipId: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/grades/:internshipId", { internshipId }), { method: "GET" });
  },

  async compileGrade(internshipId: string): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams(API_ENDPOINTS.GRADES_COMPILE, { internshipId }), { method: "POST" });
  },

  async updateGrade(id: string, data?: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/grades/:id", { id }), { method: "PUT", body: JSON.stringify(data ?? {}) });
  },

  async publishGrade(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.GRADES_PUBLISH, { id }), { method: "PATCH" });
  },

  async getPendingGradeApprovals(filters?: Record<string, unknown>): Promise<ApiResponse<any[]>> {
    const response = await requestApi<unknown>(API_ENDPOINTS.GRADES_PENDING_APPROVAL, { method: "GET", query: filters });
    return { success: response.success, data: response.success ? extractCollection<any>(response, "grades") : [], message: response.message };
  },

  async exportGrades(data: { term_id: number; format?: "csv" | "json" }): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.GRADES_EXPORT, { method: "POST", body: JSON.stringify(data) });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REPORTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getInternshipProgress(filters?: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.REPORTS_PROGRESS, { method: "GET", query: filters });
  },

  async getStudentPerformance(filters?: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.REPORTS_PERFORMANCE, { method: "GET", query: filters });
  },

  async getCompanyEngagement(filters?: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.REPORTS_COMPANY, { method: "GET", query: filters });
  },

  async getDepartmentStatistics(filters?: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.REPORTS_DEPT, { method: "GET", query: filters });
  },

  async exportReport(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.REPORTS_EXPORT, { method: "POST", body: JSON.stringify(data) });
  },

  async customReport(data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.REPORTS_CUSTOM, { method: "POST", body: JSON.stringify(data) });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOGBOOK (extended)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async submitLogbookEntry(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams(API_ENDPOINTS.LOGBOOK_SUBMIT, { id }), { method: "POST" });
  },

  async updateLogbookEntry(id: string, data: Record<string, unknown>): Promise<ApiResponse<any>> {
    return requestApi<any>(replacePathParams("/api/v1/logbooks/:id", { id }), { method: "PUT", body: JSON.stringify(data) });
  },

  async deleteLogbookEntry(id: string): Promise<ApiResponse<null>> {
    return requestApi<null>(replacePathParams("/api/v1/logbooks/:id", { id }), { method: "DELETE" });
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTIVE TERM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getActiveTerm(): Promise<ApiResponse<any>> {
    return requestApi<any>(API_ENDPOINTS.TERM_ACTIVE, { method: "GET" });
  },
};

export type ApiClient = typeof apiClient;
