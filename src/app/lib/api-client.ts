/**
 * API Client Abstraction Layer
 * ────────────────────────────
 * This module provides a clean interface between the UI and data layer.
 *
 * CURRENT STATE: All methods call in-memory mock services.
 * INTEGRATION:   Replace method bodies with real HTTP calls (fetch/axios).
 *                The function signatures and return types stay the same.
 *
 * EXAMPLE SWAP (before → after):
 *
 *   // BEFORE (mock):
 *   async getApplications(filters) {
 *     const apps = getState().applications;
 *     return { success: true, data: apps };
 *   }
 *
 *   // AFTER (real API):
 *   async getApplications(filters) {
 *     const res = await fetch(`/api/applications?${toQuery(filters)}`);
 *     return res.json();
 *   }
 *
 * The backend team only needs to:
 *   1. Implement REST endpoints matching API_ENDPOINTS in constants.ts
 *   2. Return responses matching types in types/api.ts
 *   3. Replace method bodies in this file with fetch() calls
 */

import type {
  ApiResponse,
  PaginatedResponse,
  ApplicationFilters,
  ApplicationResponse,
  CompanyFilters,
  CompanyResponse,
  TermResponse,
  LogbookEntryResponse,
  LogbookFilters,
  AttendanceResponse,
  AttendanceFilters,
  SupervisorResponse,
  AuthResponse,
  CreateApplicationRequest,
  CreateCompanyRequest,
  CreateTermRequest,
  UpdateTermRequest,
  SubmitLogbookRequest,
  CheckInRequest,
  CreateIssueRequest,
  SendMessageRequest,
  CreateThreadRequest,
  SettingsRequest,
} from "../types/api";

import { getState, addApplication, updateApplication, addCompany, updateCompany, addTerm, updateTerm, addLogbookEntry, updateLogbookEntry, addNotification, markNotificationRead, addAuditLog } from "./store";
import type { Application, Company, Notification } from "./mock-data";
import { authenticateByEmail, authenticateByToken } from "../services/auth-service";
import { approveApplication, rejectApplication, bulkApproveApplications, assignSupervisor } from "../services/application-service";
import { approveCompany, rejectCompany, overrideCompanyDecision, createBranch, createCompanyWithBranch } from "../services/company-service";
import { submitLogbookEntry, approveLogbookEntry, requestLogbookRevision } from "../services/logbook-service";
import { submitCheckIn, verifyCheckIn, getAttendanceRecords } from "../services/attendance-service";
import { approveGrade, requestGradeRevision } from "../services/grade-service";
import { submitWeeklyRubric, submitIndustrialAssessment } from "../services/grading-service";
import { createIssue, addIssueNote, updateIssueStatus, escalateIssue, getIssues } from "../services/issue-service";
import { sendMessage, createThread, getThreadsForUser, getMessagesInThread, markThreadRead } from "../services/messaging-service";
import { sendNotification, sendAnnouncement, readNotification, markAllRead, getNotifications } from "../services/notification-service";
import { getSettings, updateSettings } from "./settings-store";

// ── Simulated network delay for realistic UX testing ──
const MOCK_DELAY_MS = 300;
const delay = (ms: number = MOCK_DELAY_MS) => new Promise((r) => setTimeout(r, ms));

/**
 * API Client — single source of truth for all data operations.
 * All methods are async to match real API call patterns.
 */
export const apiClient = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUTH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async login(email: string): Promise<ApiResponse<AuthResponse | null>> {
    await delay();
    const user = authenticateByEmail(email);
    if (!user) return { success: false, data: null, message: "Invalid credentials" };
    return {
      success: true,
      data: { user, token: "mock-jwt-token", expiresAt: new Date(Date.now() + 86400000).toISOString() },
    };
  },

  async loginWithToken(token: string): Promise<ApiResponse<AuthResponse | null>> {
    await delay();
    const user = authenticateByToken(token);
    if (!user) return { success: false, data: null, message: "Invalid or expired token" };
    return {
      success: true,
      data: { user, token: "mock-jwt-token", expiresAt: new Date(Date.now() + 86400000).toISOString() },
    };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // APPLICATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getApplications(filters?: ApplicationFilters): Promise<ApiResponse<ApplicationResponse[]>> {
    await delay();
    let apps = [...getState().applications];
    if (filters?.department) apps = apps.filter((a) => a.department === filters.department);
    if (filters?.status) apps = apps.filter((a) => a.status === filters.status);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      apps = apps.filter((a) => a.studentName.toLowerCase().includes(q) || a.studentId.toLowerCase().includes(q) || a.companyName.toLowerCase().includes(q));
    }
    return { success: true, data: apps };
  },

  async approveApplication(id: string, approvedBy: string): Promise<ApiResponse<null>> {
    await delay();
    const result = approveApplication(id, approvedBy);
    return { success: result.success, data: null, message: result.message };
  },

  async rejectApplication(id: string, rejectedBy: string, reason: string): Promise<ApiResponse<null>> {
    await delay();
    const result = rejectApplication(id, rejectedBy, reason);
    return { success: result.success, data: null, message: result.message };
  },

  async bulkApproveApplications(ids: string[], approvedBy: string): Promise<ApiResponse<null>> {
    await delay();
    const result = bulkApproveApplications(ids, approvedBy);
    return { success: result.success, data: null, message: result.message };
  },

  async assignSupervisor(applicationId: string, supervisorName: string, assignedBy: string): Promise<ApiResponse<null>> {
    await delay();
    const result = assignSupervisor(applicationId, supervisorName, assignedBy);
    return { success: result.success, data: null, message: result.message };
  },

  async createApplication(appData: Omit<Application, "id" | "dateApplied">): Promise<ApiResponse<Application>> {
    await delay();
    const newApp: Application = {
      id: `a-${Date.now()}`,
      dateApplied: new Date().toISOString().split("T")[0],
      ...appData,
    };
    addApplication(newApp);
    addNotification({
      id: `n-${Date.now()}`,
      type: "application",
      title: "New Application Submitted",
      message: `${newApp.studentName} (${newApp.studentId}) has submitted an attachment application for ${newApp.companyName} — ${newApp.branchName}.`,
      read: false,
      timestamp: new Date().toISOString(),
    });
    return { success: true, data: newApp, message: "Application submitted successfully." };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMPANIES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getCompanies(filters?: CompanyFilters): Promise<ApiResponse<CompanyResponse[]>> {
    await delay();
    let companies = [...getState().companies];
    if (filters?.department) companies = companies.filter((c) => c.department === filters.department);
    if (filters?.status) companies = companies.filter((c) => c.status === filters.status);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      companies = companies.filter((c) => c.name.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q));
    }
    return { success: true, data: companies };
  },

  async createCompany(data: CreateCompanyRequest & { addedBy: string }): Promise<ApiResponse<null>> {
    await delay();
    addCompany({
      id: `c-${Date.now()}`,
      ...data,
      status: "Pending",
      dateAdded: new Date().toISOString().split("T")[0],
    });
    return { success: true, data: null, message: "Company added successfully." };
  },

  async createBranch(params: {
    companyId: string;
    name: string;
    region: string;
    location: string;
    address: string;
    telephone: string;
    addedBy: string;
    autoApprove?: boolean;
  }): Promise<ApiResponse<any>> {
    await delay();
    const res = createBranch({ ...params, autoApprove: params.autoApprove ?? false });
    if (!res.success) return { success: false, data: null, message: res.message };
    return { success: true, data: res.data, message: res.message };
  },

  async createCompanyWithBranch(
    companyParams: {
      name: string;
      contactPerson: string;
      contactEmail: string;
      addedBy: string;
      autoApprove?: boolean;
    },
    branchParams: {
      name: string;
      region: string;
      location: string;
      address: string;
      telephone: string;
      addedBy: string;
      autoApprove?: boolean;
    }
  ): Promise<ApiResponse<any>> {
    await delay();
    const res = createCompanyWithBranch(
      { ...companyParams, autoApprove: companyParams.autoApprove ?? false },
      { ...branchParams, autoApprove: branchParams.autoApprove ?? false }
    );
    if (!res.success) return { success: false, data: null, message: res.message };
    return { success: true, data: res.data, message: res.message };
  },

  async approveCompany(id: string, approvedBy: string): Promise<ApiResponse<null>> {
    await delay();
    const result = approveCompany(id, approvedBy);
    return { success: result.success, data: null, message: result.message };
  },

  async rejectCompany(id: string, rejectedBy: string, reason: string): Promise<ApiResponse<null>> {
    await delay();
    const result = rejectCompany(id, rejectedBy, reason);
    return { success: result.success, data: null, message: result.message };
  },

  async overrideCompanyDecision(id: string, newStatus: "Approved" | "Rejected", by: string, reason?: string): Promise<ApiResponse<null>> {
    await delay();
    const result = overrideCompanyDecision(id, newStatus, by, reason);
    return { success: result.success, data: null, message: result.message };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TERMS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getTerms(): Promise<ApiResponse<TermResponse[]>> {
    await delay();
    return { success: true, data: getState().terms };
  },

  async createTerm(data: CreateTermRequest): Promise<ApiResponse<null>> {
    await delay();
    addTerm({ id: `t-${Date.now()}`, status: "Upcoming", ...data });
    return { success: true, data: null, message: "Term created." };
  },

  async updateTerm(id: string, data: UpdateTermRequest): Promise<ApiResponse<null>> {
    await delay();
    updateTerm(id, data);
    return { success: true, data: null, message: "Term updated." };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOGBOOK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getLogbookEntries(filters?: LogbookFilters): Promise<ApiResponse<LogbookEntryResponse[]>> {
    await delay();
    let entries = [...getState().logbookEntries];
    if (filters?.studentId) entries = entries.filter((e) => e.studentId === filters.studentId);
    if (filters?.approvalStatus) entries = entries.filter((e) => e.approvalStatus === filters.approvalStatus);
    if (filters?.dateFrom) entries = entries.filter((e) => e.date >= filters.dateFrom!);
    if (filters?.dateTo) entries = entries.filter((e) => e.date <= filters.dateTo!);
    return { success: true, data: entries };
  },

  async submitLogbook(data: SubmitLogbookRequest): Promise<ApiResponse<null>> {
    await delay();
    const result = submitLogbookEntry(data.studentId, data.date, data.activities, data.skills, data.challenges);
    return { success: result.success, data: null, message: result.message };
  },

  async approveLogbook(id: string, approvedBy: string, comment?: string): Promise<ApiResponse<null>> {
    await delay();
    const result = approveLogbookEntry(id, approvedBy, comment);
    return { success: result.success, data: null, message: result.message };
  },

  async requestLogbookRevision(id: string, requestedBy: string, comment: string): Promise<ApiResponse<null>> {
    await delay();
    const result = requestLogbookRevision(id, requestedBy, comment);
    return { success: result.success, data: null, message: result.message };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ATTENDANCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getAttendance(filters?: AttendanceFilters): Promise<ApiResponse<AttendanceResponse[]>> {
    await delay();
    const records = getAttendanceRecords(filters);
    return { success: true, data: records };
  },

  async checkIn(data: CheckInRequest): Promise<ApiResponse<null>> {
    await delay();
    const result = submitCheckIn(data.studentId, data.studentName, data.department, data.checkInType, data.location);
    return { success: result.success, data: null, message: result.message };
  },

  async verifyCheckIn(id: string, approved: boolean, verifiedBy: string): Promise<ApiResponse<null>> {
    await delay();
    const result = verifyCheckIn(id, approved, verifiedBy);
    return { success: result.success, data: null, message: result.message };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GRADES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async approveGrade(applicationId: string, approvedBy: string): Promise<ApiResponse<null>> {
    await delay();
    const result = approveGrade(applicationId, approvedBy);
    return { success: result.success, data: null, message: result.message };
  },

  async requestGradeRevision(applicationId: string, requestedBy: string, reason: string): Promise<ApiResponse<null>> {
    await delay();
    const result = requestGradeRevision(applicationId, requestedBy, reason);
    return { success: result.success, data: null, message: result.message };
  },

  async submitWeeklyRubric(applicationId: string, weekNumber: number, ratings: Record<string, number>, notes: string, actor: any): Promise<ApiResponse<null>> {
    await delay();
    const result = submitWeeklyRubric(applicationId, weekNumber, ratings, notes, actor);
    return { success: result.success, data: null, message: result.message };
  },

  async submitIndustrialAssessment(applicationId: string, ratings: Record<string, number>, comments: string, actor: any): Promise<ApiResponse<null>> {
    await delay();
    const result = submitIndustrialAssessment(applicationId, ratings, comments, actor);
    return { success: result.success, data: null, message: result.message };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ISSUES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getIssues(filters?: { department?: string; status?: string; raisedBy?: string }): Promise<ApiResponse<any[]>> {
    await delay();
    const issues = getIssues(filters as any);
    return { success: true, data: issues };
  },

  async createIssue(data: CreateIssueRequest): Promise<ApiResponse<null>> {
    await delay();
    const result = createIssue(data.type, data.title, data.description, data.raisedBy, data.raisedByRole, data.department, data.studentId);
    return { success: result.success, data: null, message: result.message };
  },

  async addIssueNote(issueId: string, author: string, authorRole: string, content: string): Promise<ApiResponse<null>> {
    await delay();
    const result = addIssueNote(issueId, author, authorRole, content);
    return { success: result.success, data: null, message: result.message };
  },

  async updateIssueStatus(issueId: string, status: string, resolution?: string): Promise<ApiResponse<null>> {
    await delay();
    const result = updateIssueStatus(issueId, status as any, resolution);
    return { success: result.success, data: null, message: result.message };
  },

  async escalateIssue(issueId: string, escalatedBy: string): Promise<ApiResponse<null>> {
    await delay();
    const result = escalateIssue(issueId, escalatedBy);
    return { success: result.success, data: null, message: result.message };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MESSAGES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getThreads(userId: string): Promise<ApiResponse<any[]>> {
    await delay();
    return { success: true, data: getThreadsForUser(userId) };
  },

  async getMessages(threadId: string): Promise<ApiResponse<any[]>> {
    await delay();
    return { success: true, data: getMessagesInThread(threadId) };
  },

  async sendMessage(threadId: string, data: SendMessageRequest): Promise<ApiResponse<null>> {
    await delay();
    const result = sendMessage(threadId, data.senderId, data.senderName, data.senderRole, data.recipientId, data.recipientName, data.content);
    return { success: result.success, data: null, message: result.message };
  },

  async createThread(data: CreateThreadRequest): Promise<ApiResponse<{ threadId: string }>> {
    await delay();
    const result = createThread(data.participantIds, data.participantNames, data.subject, data.context || "", data.firstMessage, data.senderId, data.senderName, data.senderRole, data.recipientId, data.recipientName);
    return { success: true, data: { threadId: result.threadId } };
  },

  async markThreadRead(threadId: string, userId: string): Promise<ApiResponse<null>> {
    await delay();
    markThreadRead(threadId, userId);
    return { success: true, data: null };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NOTIFICATIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getNotifications(role: string, department?: string): Promise<ApiResponse<Notification[]>> {
    await delay();
    const notifs = getNotifications(role as any, department);
    return { success: true, data: notifs };
  },

  async markNotificationRead(id: string): Promise<ApiResponse<null>> {
    await delay();
    readNotification(id);
    return { success: true, data: null };
  },

  async markAllNotificationsRead(): Promise<ApiResponse<null>> {
    await delay();
    markAllRead();
    return { success: true, data: null };
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getSettings(): Promise<ApiResponse<SettingsRequest>> {
    await delay();
    return { success: true, data: getSettings() };
  },

  async updateSettings(data: SettingsRequest): Promise<ApiResponse<null>> {
    await delay();
    updateSettings(data);
    return { success: true, data: null, message: "Settings updated." };
  },
};

export type ApiClient = typeof apiClient;
