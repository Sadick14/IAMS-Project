/**
 * API Request/Response Type Contracts
 * ─────────────────────────────────────
 * This file defines the exact shape of every API request and response.
 * The backend team should implement endpoints that match these contracts.
 *
 * USAGE:
 *   - Frontend services import these types for type-safe API calls.
 *   - Backend team uses this as a specification for endpoint payloads.
 *
 * NOTES:
 *   - All timestamps are ISO 8601 strings (e.g., "2026-04-19T12:00:00Z").
 *   - All IDs are strings (UUIDs recommended for production).
 *   - Paginated endpoints use { data, total, page, pageSize } wrapper.
 */

// ── Generic Wrappers ──

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string; // e.g., "UNAUTHORIZED", "VALIDATION_ERROR", "NOT_FOUND"
  details?: Record<string, string[]>; // Field-level validation errors
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ── Auth ──

export interface LoginRequest {
  email: string;
  // In production: handled via Google SSO redirect, not direct password
}

export interface MagicLinkRequest {
  token: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: "clo" | "dlo" | "student" | "supervisor" | "academic" | "hod";
    department?: string;
    avatar?: string;
    studentId?: string;
  };
  token: string; // JWT or session token
  expiresAt: string;
}

// ── Applications ──

export interface CreateApplicationRequest {
  company_id: number;
  academic_term_id: number;
  application_type: "individual" | "group";
  group_leader_id?: number | null;
  cover_letter?: string | null;
  proposed_start_date?: string | null;
  proposed_end_date?: string | null;
}

export interface ApproveApplicationRequest {
  approvedBy: string;
}

export interface RejectApplicationRequest {
  rejectedBy: string;
  reason: string;
}

export interface BulkApproveRequest {
  applicationIds: string[];
  approvedBy: string;
}

export interface AssignSupervisorRequest {
  supervisorId: string;
  supervisorName: string;
  assignedBy: string;
}

export interface ApplicationFilters extends PaginationParams {
  // API status values: draft | submitted | under_review | approved | rejected
  status?: string;
  academic_term_id?: number;
  department?: string;
  per_page?: number;
}

export interface ApplicationResponse {
  id: string;
  // The real API returns nested objects — field names below may differ per endpoint.
  // Use optional chaining: app.student?.name ?? app.studentName
  studentName: string;
  studentId: string;
  department: string;
  level: string;
  companyId: string;
  companyName: string;
  companyStatus: string;
  // API status values: draft | submitted | under_review | approved | rejected
  status: string;
  dateApplied: string;
  supervisorAssigned?: string;
  grade?: string;
  gradeStatus?: string;
  // Nested relations returned by some endpoints
  student?: { name?: string; student_id?: string; department?: string };
  company?: { name?: string; id?: number };
  academic_supervisor?: { name?: string; id?: number };
  created_at?: string;
}

// ── Companies ──

export interface CreateCompanyRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  contact_person_name?: string | null;
  contact_person_email?: string | null;
  contact_person_phone?: string | null;
  max_interns?: number | null;
}

export interface ApproveCompanyRequest {
  approvedBy: string;
}

export interface RejectCompanyRequest {
  rejectedBy: string;
  reason: string;
}

export interface OverrideCompanyRequest {
  newStatus: "Approved" | "Rejected";
  overriddenBy: string;
  reason?: string;
}

export interface CompanyFilters {
  // Use approval_status to filter by pending/approved/rejected
  approval_status?: "pending" | "approved" | "rejected";
  // Use status to filter by active/inactive
  status?: "active" | "inactive";
  search?: string;
  per_page?: number;
}

export interface CompanyResponse {
  id: string;
  name: string;
  address: string;
  city?: string;
  region?: string;
  country?: string;
  email?: string;
  phone?: string;
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  industry?: string;
  // approval_status: pending | approved | rejected
  // status: active | inactive
  status: string;
  approval_status?: string;
  addedBy?: string;
  department?: string;
  dateAdded?: string;
  rejectionReason?: string;
  rejection_reason?: string;
  max_interns?: number;
  website?: string;
  description?: string;
}

export interface BranchResponse {
  id: string;
  company_id: string;
  name: string;
  region?: string;
  location?: string;
  telephone?: string;
  address?: string;
  status?: string;
  created_at?: string;
}

export interface CreateBranchRequest {
  name: string;
  region?: string;
  location?: string;
  telephone?: string;
  address?: string;
}

// ── Terms ──

export interface CreateTermRequest {
  name: string;
  // UI values: "Vacation" | "Semestrial" — api-client maps to "short_term" | "regular"
  type: "Vacation" | "Semestrial";
  applicationStart: string;
  applicationEnd: string; // sent as application_deadline
  internshipStart: string; // sent as start_date
  internshipEnd: string;   // sent as end_date
  eligibleLevels: string[];
  departments: string[];
}

export interface UpdateTermRequest extends Partial<CreateTermRequest> {
  status?: "Upcoming" | "Active" | "Completed" | "Archived";
}

export interface TermResponse {
  id: string | number;
  name: string;
  // Real API uses "short_term" | "regular"; legacy values also accepted
  type: "short_term" | "regular" | "Vacation" | "Semestrial";
  // Real API uses lowercase; capitalized forms also accepted
  status: "upcoming" | "active" | "completed" | "archived" | "Upcoming" | "Active" | "Completed" | "Archived";
  // Real API fields
  code?: string;
  description?: string;
  start_date?: string;           // internship start (ISO string)
  end_date?: string;             // internship end (ISO string)
  application_deadline?: string; // single application deadline (ISO string)
  // Legacy/alternative field names (kept for backwards compat)
  applicationStart?: string;
  application_start?: string;
  applicationEnd?: string;
  application_end?: string;
  internshipStart?: string;
  internship_start?: string;
  internshipEnd?: string;
  internship_end?: string;
  eligibleLevels?: string[];
  eligible_levels?: string[];
  departments: string[];
}

export interface TermDashboardResponse {
  term_id: string | number;
  total_applications: number;
  active_internships: number;
  completed_internships: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
  total_students: number;
  placement_rate?: number;
  department_breakdown?: Array<{
    department: string;
    total: number;
    active: number;
    completed: number;
  }>;
}

// ── Logbook ──

export interface SubmitLogbookRequest {
  internship_id: number;
  entry_date: string;
  activities_description: string;
  skills_learned?: string;
  challenges_faced?: string;
  attachment_name?: string;
  attachment_url?: string;
}

export interface ApproveLogbookRequest {
  approvedBy: string;
  comment?: string;
}

export interface RevisionLogbookRequest {
  requestedBy: string;
  comment: string;
}

export interface LogbookFilters extends PaginationParams {
  studentId?: string;
  internship_id?: number;
  department?: string;
  approvalStatus?: "Pending" | "Approved" | "Revision Requested";
  dateFrom?: string;
  dateTo?: string;
  per_page?: number;
}

export interface LogbookEntryResponse {
  id: string;
  internship_id: number;
  entry_date: string;
  activities_description: string;
  skills_learned?: string;
  challenges_faced?: string;
  status: "draft" | "submitted" | "approved" | "revision_requested";
  attachment_name?: string;
  attachment_url?: string;
  created_at: string;
}

// ── Attendance ──

export interface CheckInRequest {
  internship_id: number;
  check_in_time?: string | null;
  gps_check_in_lat?: number | null;
  gps_check_in_lng?: number | null;
  // status: present | late | half_day (defaults to "present")
  status?: "present" | "late" | "half_day";
  notes?: string | null;
}

export interface VerifyCheckInRequest {
  // status: present | absent | late | half_day | excused
  status: "present" | "absent" | "late" | "half_day" | "excused";
  notes?: string | null;
}

export interface AttendanceFilters {
  internship_id?: number;
  // status: present | absent | late | half_day | excused
  status?: string;
  from_date?: string;
  to_date?: string;
  per_page?: number;
}

export interface AttendanceResponse {
  id: string;
  internship_id?: string | number;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  gps_check_in_lat?: number;
  gps_check_in_lng?: number;
  gps_check_out_lat?: number;
  gps_check_out_lng?: number;
  // status: present | absent | late | half_day | excused
  status: string;
  notes?: string;
  verified_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Grades ──

export interface SubmitGradeRequest {
  applicationId: string;
  grade: string;
  submittedBy: string;
}

export interface ApproveGradeRequest {
  approvedBy: string;
}

export interface RevisionGradeRequest {
  requestedBy: string;
  reason: string;
}

// ── Issues ──

export interface CreateIssueRequest {
  type: "academic" | "company" | "logbook" | "supervisor" | "other";
  title: string;
  description: string;
  raisedBy: string;
  raisedByRole: string;
  department: string;
  studentId?: string;
}

export interface AddIssueNoteRequest {
  author: string;
  authorRole: string;
  content: string;
}

export interface UpdateIssueStatusRequest {
  status: "Open" | "In Progress" | "Escalated" | "Resolved";
  resolution?: string;
}

export interface IssueFilters extends PaginationParams {
  department?: string;
  status?: string;
  priority?: string;
  raisedBy?: string;
}

// ── Messages ──

export interface CreateThreadRequest {
  participantIds: string[];
  participantNames: string[];
  subject: string;
  context?: string;
  firstMessage: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
}

export interface SendMessageRequest {
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientName: string;
  content: string;
}

// ── Notifications ──

export interface SendNotificationRequest {
  type: "application" | "company" | "grade" | "escalation" | "system";
  title: string;
  message: string;
  targetRoles?: string[];
  targetDepartment?: string;
}

export interface SendAnnouncementRequest {
  title: string;
  message: string;
  sentBy: string;
  targets: string[]; // Role names or "all"
}

// ── Settings ──

export interface SettingsRequest {
  darkMode?: boolean;
  emailNotifications?: boolean;
  autoFlagEnabled?: boolean;
  inactivityThresholdDays?: number;
}

// ── Reports ──

export interface ReportExportRequest {
  type: "applications" | "attendance" | "grades" | "companies" | "students" | "audit";
  format: "csv" | "pdf";
  filters?: {
    department?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  };
}

// ── Supervisors ──

export interface SupervisorResponse {
  id: string;
  name: string;
  email: string;
  department: string;
  currentLoad: number;
  maxLoad: number;
}
