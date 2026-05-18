// Centralized mutable state store for the application
// All mutations go through service functions — never directly in components

import type { Application, Company, Branch, Notification, AuditLog, Term } from "./mock-data";
import {
  applications as initialApps,
  companies as initialCompanies,
  branches as initialBranches,
  notifications as initialNotifications,
  auditLogs as initialAuditLogs,
  terms as initialTerms,
  supervisors as initialSupervisors,
  studentActivity as initialStudentActivity,
  departmentGradingConfigs as initialConfigs,
  industrialAssessments as initialIndustrial,
  siteVisitations as initialVisits,
  reportScores as initialReports,
  presentationScores as initialPresentations,
  compiledGrades as initialCompiled,
  weeklyRubrics as initialWeeklyRubrics,
} from "./mock-data";
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

// Initialize logbook entries with mock data
const mockLogbookEntries: LogbookEntry[] = [
  {
    id: "lb1",
    studentId: "BA/2023/012",
    date: "2026-04-17",
    activities: "Worked on network configuration for the new branch office. Assisted senior engineer with firewall setup.",
    skills: "Network configuration, Cisco IOS, Firewall management",
    challenges: "Complex subnet requirements needed extra research",
    approvalStatus: "Approved",
    approvedBy: "Mr. Mensah",
    approvedAt: "2026-04-17T18:00:00",
    createdAt: "2026-04-17T17:00:00",
  },
  {
    id: "lb2",
    studentId: "BA/2023/012",
    date: "2026-04-16",
    activities: "Attended team standup. Reviewed documentation for VPN setup. Started writing test scripts.",
    skills: "VPN protocols, Python scripting, Technical documentation",
    challenges: "None",
    approvalStatus: "Approved",
    approvedBy: "Mr. Mensah",
    approvedAt: "2026-04-16T18:30:00",
    createdAt: "2026-04-16T17:30:00",
  },
  {
    id: "lb3",
    studentId: "BA/2023/012",
    date: "2026-04-15",
    activities: "Shadowed IT support team. Resolved 3 helpdesk tickets independently.",
    skills: "Troubleshooting, Customer service, Windows Server",
    challenges: "One ticket required hardware replacement — had to escalate",
    approvalStatus: "Pending",
    createdAt: "2026-04-15T16:45:00",
  },
  {
    id: "lb4",
    studentId: "BA/2023/012",
    date: "2026-04-18",
    activities: "Configured VLAN segmentation on Cisco switches. Documented network topology for branch office.",
    skills: "VLAN configuration, Network documentation, Cisco switches",
    challenges: "Switch firmware needed upgrading before VLAN support was available",
    approvalStatus: "Pending",
    createdAt: "2026-04-18T17:15:00",
  },
  {
    id: "lb5",
    studentId: "BA/2023/012",
    date: "2026-04-17",
    activities: "Assisted with quarterly financial report preparation. Entered data into accounting software.",
    skills: "Financial reporting, QuickBooks, Data entry",
    challenges: "Reconciling discrepancies in petty cash records",
    approvalStatus: "Pending",
    createdAt: "2026-04-17T16:30:00",
  },
  {
    id: "lb6",
    studentId: "BA/2023/012",
    date: "2026-04-16",
    activities: "Attended client meeting with senior accountant. Took minutes and drafted follow-up email.",
    skills: "Client communication, Meeting management, Email drafting",
    challenges: "None",
    approvalStatus: "Approved",
    approvedBy: "Mr. Mensah",
    approvedAt: "2026-04-16T17:00:00",
    createdAt: "2026-04-16T15:45:00",
  },
];

const STORAGE_KEY = "iams_demo_store_state";

function getInitialState(): StoreState {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load local store state:", e);
    }
  }
  return {
    applications: [...initialApps],
    companies: [...initialCompanies],
    branches: [...initialBranches],
    notifications: [...initialNotifications],
    auditLogs: [...initialAuditLogs],
    terms: [...initialTerms],
    logbookEntries: [...mockLogbookEntries],
    gradingConfigs: [...initialConfigs],
    industrialAssessments: [...initialIndustrial],
    siteVisitations: [...initialVisits],
    reportScores: [...initialReports],
    presentationScores: [...initialPresentations],
    compiledGrades: [...initialCompiled],
    weeklyRubrics: [...initialWeeklyRubrics],
    assignmentLocks: [],
  };
}

// Global mutable store
let state: StoreState = getInitialState();

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

// Listeners for reactivity
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save local store state:", e);
    }
  }
  listeners.forEach((l) => l());
}

export function getState(): StoreState {
  return state;
}

export function simulateStudentStage(stage: "fresh" | "pending" | "active" | "completed", studentId: string) {
  let filteredApps = state.applications.filter(a => a.studentId !== studentId);
  let filteredLogs = state.logbookEntries.filter(l => l.studentId !== studentId);
  let filteredVisits = state.siteVisitations.filter(v => v.applicationId !== "a-demo-john");
  let filteredAssessments = state.industrialAssessments.filter(x => x.applicationId !== "a-demo-john");
  let filteredReports = state.reportScores.filter(r => r.applicationId !== "a-demo-john");
  let filteredCompiled = state.compiledGrades.filter(g => g.applicationId !== "a-demo-john");

  if (stage === "fresh") {
    state = {
      ...state,
      applications: filteredApps,
      logbookEntries: filteredLogs,
      siteVisitations: filteredVisits,
      industrialAssessments: filteredAssessments,
      reportScores: filteredReports,
      compiledGrades: filteredCompiled,
    };
  } else if (stage === "pending") {
    const newApp: Application = {
      id: "a-demo-john",
      studentName: "John Doe",
      studentId: studentId,
      department: "Computer Science",
      level: "L300",
      companyId: "c1",
      companyName: "Ghana Telecom Ltd",
      companyStatus: "Approved",
      branchId: "b-c1-main",
      branchName: "Head Office",
      status: "Pending",
      dateApplied: new Date().toISOString().split("T")[0],
    };
    state = {
      ...state,
      applications: [...filteredApps, newApp],
      logbookEntries: filteredLogs,
      siteVisitations: filteredVisits,
      industrialAssessments: filteredAssessments,
      reportScores: filteredReports,
      compiledGrades: filteredCompiled,
    };
  } else if (stage === "active") {
    const newApp: Application = {
      id: "a-demo-john",
      studentName: "John Doe",
      studentId: studentId,
      department: "Computer Science",
      level: "L300",
      companyId: "c1",
      companyName: "Ghana Telecom Ltd",
      companyStatus: "Approved",
      branchId: "b-c1-main",
      branchName: "Head Office",
      status: "Active",
      dateApplied: "2026-03-03",
      supervisorAssigned: "Dr. Abena Osei",
    };
    const mockLogs: LogbookEntry[] = [
      {
        id: "lb-demo-1",
        studentId: studentId,
        date: "2026-04-15",
        activities: "Attended company orientation. Met industrial mentor Mr. Mensah and configured development workspace.",
        skills: "Workspace configuration, Onboarding",
        challenges: "None",
        approvalStatus: "Approved",
        approvedBy: "Mr. Mensah",
        approvedAt: "2026-04-15T17:00:00",
        createdAt: "2026-04-15T16:00:00",
      },
      {
        id: "lb-demo-2",
        studentId: studentId,
        date: "2026-04-16",
        activities: "Assisted database administrators with SQL backup queries. Handled security audit logs.",
        skills: "SQL databases, Security audits",
        challenges: "Backup storage was full; resolved by migrating old logs.",
        approvalStatus: "Approved",
        approvedBy: "Mr. Mensah",
        approvedAt: "2026-04-16T17:00:00",
        createdAt: "2026-04-16T16:00:00",
      },
      {
        id: "lb-demo-3",
        studentId: studentId,
        date: "2026-04-17",
        activities: "Wrote python automation script to scrape network diagnostic metrics.",
        skills: "Python scripting, Automation",
        challenges: "API endpoints required authentication headers.",
        approvalStatus: "Pending",
        createdAt: "2026-04-17T16:00:00",
      },
    ];
    state = {
      ...state,
      applications: [...filteredApps, newApp],
      logbookEntries: [...filteredLogs, ...mockLogs],
      siteVisitations: filteredVisits,
      industrialAssessments: filteredAssessments,
      reportScores: filteredReports,
      compiledGrades: filteredCompiled,
    };
  } else if (stage === "completed") {
    const newApp: Application = {
      id: "a-demo-john",
      studentName: "John Doe",
      studentId: studentId,
      department: "Computer Science",
      level: "L300",
      companyId: "c1",
      companyName: "Ghana Telecom Ltd",
      companyStatus: "Approved",
      branchId: "b-c1-main",
      branchName: "Head Office",
      status: "Completed",
      dateApplied: "2026-03-03",
      supervisorAssigned: "Dr. Abena Osei",
    };
    const mockLogs: LogbookEntry[] = [
      {
        id: "lb-demo-1",
        studentId: studentId,
        date: "2026-04-15",
        activities: "Attended company orientation. Met industrial mentor Mr. Mensah.",
        skills: "Workspace configuration",
        challenges: "None",
        approvalStatus: "Approved",
        approvedBy: "Mr. Mensah",
        approvedAt: "2026-04-15T17:00:00",
        createdAt: "2026-04-15T16:00:00",
      },
    ];
    const mockAssessment: IndustrialSupervisorAssessment = {
      id: "ind-demo-john",
      applicationId: "a-demo-john",
      ratings: {
        A1: 5, A2: 5, A3: 4, A4: 5,
        B1: 5, B2: 5, B3: 4, B4: 5, B5: 4, B6: 5, B7: 5, B8: 5,
        C1: 5, C2: 5, C3: 4, C4: 4, C5: 5,
        D1: 5, D2: 5, D3: 4
      },
      comments: "John is outstanding! Incredible coding speed and technical knowledge.",
      submittedBy: "Mr. Mensah",
      submittedAt: "2026-04-20T16:00:00"
    };
    const mockVisit: SiteVisitationScore = {
      id: "sv-demo-john",
      applicationId: "a-demo-john",
      score: 28,
      comments: "Highly disciplined and well-integrated into the local branch office.",
      visitedAt: "2026-04-12T10:00:00",
      submittedBy: "Dr. Abena Osei",
      ratings: {
        V1: 3, V2: 3, V3: 3, V4: 3, V5: 3, V6: 3, V7: 3, V8: 2, V9: 3, V10: 2
      }
    };
    const mockReport: ReportScore = {
      id: "rep-demo-john",
      applicationId: "a-demo-john",
      score: 92,
      comments: "Thorough internship report. Clear software architecture diagrams.",
      submittedBy: "Dr. Abena Osei",
      submittedAt: "2026-04-25T11:00:00"
    };
    const mockCompiled: CompiledGrade = {
      applicationId: "a-demo-john",
      components: {
        industrial: 94,
        departmental: 93,
        report: 92,
        presentation: 90
      },
      configSnapshot: state.gradingConfigs[0],
      finalPercent: 93,
      status: "Approved",
      updatedAt: "2026-04-28T12:00:00"
    };

    state = {
      ...state,
      applications: [...filteredApps, newApp],
      logbookEntries: [...filteredLogs, ...mockLogs],
      siteVisitations: [...filteredVisits, mockVisit],
      industrialAssessments: [...filteredAssessments, mockAssessment],
      reportScores: [...filteredReports, mockReport],
      compiledGrades: [...filteredCompiled, mockCompiled],
    };
  }

  notify();
}

// --- Mutations ---

export function updateApplication(id: string, updates: Partial<Application>) {
  state = {
    ...state,
    applications: state.applications.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    ),
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
    companies: state.companies.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
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
    branches: state.branches.map((b) =>
      b.id === id ? { ...b, ...updates } : b
    ),
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
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  };
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
  state = {
    ...state,
    terms: state.terms.map((t) => (t.id === id ? { ...t, ...updates } : t)),
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
    logbookEntries: state.logbookEntries.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    ),
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