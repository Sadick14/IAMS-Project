import type { Application, Company, Branch, Notification, AuditLog, Term } from "./mock-data";
import type {
  DepartmentGradingConfig,
  IndustrialSupervisorAssessment,
  SiteVisitationScore,
  ReportScore,
  PresentationScore,
  CompiledGrade,
  WeeklyRubricEntry,
} from "../types/grading";

export interface LogbookEntry {
  id: string;
  studentId: string;
  date: string;
  activities: string;
  skills: string;
  challenges: string;
  supervisorComment?: string;
  approvalStatus: "Pending" | "Approved" | "Revision Requested";
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface StoreState {
  applications: Application[];
  companies: Company[];
  branches: Branch[];
  notifications: Notification[];
  announcementUnread: number;
  auditLogs: AuditLog[];
  terms: Term[];
  logbookEntries: LogbookEntry[];
  gradingConfigs: DepartmentGradingConfig[];
  industrialAssessments: IndustrialSupervisorAssessment[];
  siteVisitations: SiteVisitationScore[];
  reportScores: ReportScore[];
  presentationScores: PresentationScore[];
  compiledGrades: CompiledGrade[];
  weeklyRubrics: WeeklyRubricEntry[];
  assignmentLocks: string[];
}

function getInitialState(): StoreState {
  return {
    applications: [],
    companies: [],
    branches: [],
    notifications: [],
    announcementUnread: 0,
    auditLogs: [],
    terms: [],
    logbookEntries: [],
    gradingConfigs: [],
    industrialAssessments: [],
    siteVisitations: [],
    reportScores: [],
    presentationScores: [],
    compiledGrades: [],
    weeklyRubrics: [],
    assignmentLocks: [],
  };
}

let state: StoreState = getInitialState();

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

export function getState(): StoreState {
  return state;
}

export function getStudentApplicationHistory(studentId: string) {
  return state.applications
    .filter((a) => a.studentId === studentId)
    .slice()
    .sort((x, y) => ((x.dateApplied || "") < (y.dateApplied || "") ? -1 : 1));
}

export function upsertWeeklyRubric(entry: WeeklyRubricEntry) {
  const exists = state.weeklyRubrics.some(
    (x) => x.applicationId === entry.applicationId && x.weekNumber === entry.weekNumber
  );
  state = {
    ...state,
    weeklyRubrics: exists
      ? state.weeklyRubrics.map((x) =>
          x.applicationId === entry.applicationId && x.weekNumber === entry.weekNumber ? entry : x
        )
      : [...state.weeklyRubrics, entry],
  };
  notify();
}

export function setAssignmentLock(applicationId: string, locked: boolean) {
  const has = state.assignmentLocks.includes(applicationId);
  if (locked && !has) {
    state = { ...state, assignmentLocks: [...state.assignmentLocks, applicationId] };
    notify();
  } else if (!locked && has) {
    state = { ...state, assignmentLocks: state.assignmentLocks.filter((id) => id !== applicationId) };
    notify();
  }
}

// --- Mutations ---

export function updateApplication(id: string, updates: Partial<Application>) {
  state = {
    ...state,
    applications: state.applications.map((a) => (a.id === id ? { ...a, ...updates } : a)),
  };
  notify();
}

export function addApplication(app: Application) {
  state = { ...state, applications: [...state.applications, app] };
  notify();
}

export function addCompany(company: Company) {
  state = { ...state, companies: [...state.companies, company] };
  notify();
}

export function updateCompany(id: string, updates: Partial<Company>) {
  state = {
    ...state,
    companies: state.companies.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  };
  notify();
}

export function addBranch(branch: Branch) {
  state = { ...state, branches: [...state.branches, branch] };
  notify();
}

export function updateBranch(id: string, updates: Partial<Branch>) {
  state = {
    ...state,
    branches: state.branches.map((b) => (b.id === id ? { ...b, ...updates } : b)),
  };
  notify();
}

export function addNotification(n: Notification) {
  state = { ...state, notifications: [n, ...state.notifications] };
  notify();
}

export function markNotificationRead(id: string) {
  state = {
    ...state,
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  };
  notify();
}

export function setNotifications(notifications: Notification[]) {
  state = { ...state, notifications };
  notify();
}

export function setAnnouncementUnread(count: number) {
  state = { ...state, announcementUnread: count };
  notify();
}

export function addAuditLog(log: AuditLog) {
  state = { ...state, auditLogs: [log, ...state.auditLogs] };
  notify();
}

export function addTerm(term: Term) {
  state = { ...state, terms: [...state.terms, term] };
  notify();
}

export function updateTerm(id: string, updates: Partial<Term>) {
  const term = state.terms.find((t) => t.id === id);
  let updatedApplications = state.applications;

  if (term && updates.status === "Archived") {
    updatedApplications = state.applications.map((a) => {
      const isMatch =
        a.termId === term.id ||
        (a.dateApplied >= term.applicationStart && a.dateApplied <= term.applicationEnd);
      if (isMatch && a.status !== "Completed" && a.status !== "Rejected") {
        return { ...a, status: "Completed" as const };
      }
      return a;
    });
  }

  state = {
    ...state,
    terms: state.terms.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    applications: updatedApplications,
  };
  notify();
}

export function addLogbookEntry(entry: LogbookEntry) {
  state = { ...state, logbookEntries: [entry, ...state.logbookEntries] };
  notify();
}

export function getLogbookEntries(studentId: string): LogbookEntry[] {
  return state.logbookEntries.filter((e) => e.studentId === studentId);
}

export function updateLogbookEntry(id: string, updates: Partial<LogbookEntry>) {
  state = {
    ...state,
    logbookEntries: state.logbookEntries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
  };
  notify();
}

export function getAllLogbookEntries(): LogbookEntry[] {
  return state.logbookEntries;
}

// --- Grading mutations ---

export function upsertGradingConfig(config: DepartmentGradingConfig) {
  const exists = state.gradingConfigs.some((c) => c.id === config.id);
  state = {
    ...state,
    gradingConfigs: exists
      ? state.gradingConfigs.map((c) => (c.id === config.id ? config : c))
      : [...state.gradingConfigs, config],
  };
  notify();
}

export function upsertIndustrialAssessment(a: IndustrialSupervisorAssessment) {
  const exists = state.industrialAssessments.some((x) => x.applicationId === a.applicationId);
  state = {
    ...state,
    industrialAssessments: exists
      ? state.industrialAssessments.map((x) => (x.applicationId === a.applicationId ? a : x))
      : [...state.industrialAssessments, a],
  };
  notify();
}

export function upsertSiteVisitation(v: SiteVisitationScore) {
  const exists = state.siteVisitations.some((x) => x.applicationId === v.applicationId);
  state = {
    ...state,
    siteVisitations: exists
      ? state.siteVisitations.map((x) => (x.applicationId === v.applicationId ? v : x))
      : [...state.siteVisitations, v],
  };
  notify();
}

export function upsertReportScore(r: ReportScore) {
  const exists = state.reportScores.some((x) => x.applicationId === r.applicationId);
  state = {
    ...state,
    reportScores: exists
      ? state.reportScores.map((x) => (x.applicationId === r.applicationId ? r : x))
      : [...state.reportScores, r],
  };
  notify();
}

export function upsertPresentationScore(p: PresentationScore) {
  const exists = state.presentationScores.some((x) => x.applicationId === p.applicationId);
  state = {
    ...state,
    presentationScores: exists
      ? state.presentationScores.map((x) => (x.applicationId === p.applicationId ? p : x))
      : [...state.presentationScores, p],
  };
  notify();
}

export function upsertCompiledGrade(g: CompiledGrade) {
  const exists = state.compiledGrades.some((x) => x.applicationId === g.applicationId);
  state = {
    ...state,
    compiledGrades: exists
      ? state.compiledGrades.map((x) => (x.applicationId === g.applicationId ? g : x))
      : [...state.compiledGrades, g],
  };
  notify();
}
