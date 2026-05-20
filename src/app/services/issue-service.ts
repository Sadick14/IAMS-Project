// Issue & Escalation Tracking Service
// Covers STU-19, STU-20, DLO-25, CLO-23, SYS-16, SYS-17

export type IssueType = "academic" | "company" | "logbook" | "supervisor" | "other";
export type IssueStatus = "Open" | "In Progress" | "Escalated" | "Resolved";
export type IssuePriority = "Low" | "Medium" | "High";

export interface Issue {
  id: string;
  type: IssueType;
  title: string;
  description: string;
  raisedBy: string;
  raisedByRole: string;
  department: string;
  studentId?: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignedTo?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  notes: IssueNote[];
}

export interface IssueNote {
  id: string;
  author: string;
  authorRole: string;
  content: string;
  timestamp: string;
}

// Mock issues
let issues: Issue[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }
export function subscribeIssues(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIssues(filters?: { department?: string; status?: IssueStatus; raisedBy?: string }): Issue[] {
  let result = [...issues];
  if (filters?.department) result = result.filter((i) => i.department === filters.department);
  if (filters?.status) result = result.filter((i) => i.status === filters.status);
  if (filters?.raisedBy) result = result.filter((i) => i.raisedBy === filters.raisedBy);
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getIssueById(id: string): Issue | undefined {
  return issues.find((i) => i.id === id);
}

export function createIssue(
  type: IssueType,
  title: string,
  description: string,
  raisedBy: string,
  raisedByRole: string,
  department: string,
  studentId?: string
): { success: boolean; message: string } {
  const issue: Issue = {
    id: `iss-${Date.now()}`,
    type,
    title,
    description,
    raisedBy,
    raisedByRole,
    department,
    studentId,
    status: "Open",
    priority: "Medium",
    assignedTo: type === "company" ? "CLO" : "DLO",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: [],
  };
  issues = [issue, ...issues];
  notify();
  return { success: true, message: "Issue reported successfully. It has been routed for review." };
}

export function addIssueNote(
  issueId: string,
  author: string,
  authorRole: string,
  content: string
): { success: boolean; message: string } {
  issues = issues.map((i) =>
    i.id === issueId
      ? {
          ...i,
          updatedAt: new Date().toISOString(),
          notes: [
            ...i.notes,
            { id: `in-${Date.now()}`, author, authorRole, content, timestamp: new Date().toISOString() },
          ],
        }
      : i
  );
  notify();
  return { success: true, message: "Note added." };
}

export function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
  resolution?: string
): { success: boolean; message: string } {
  issues = issues.map((i) =>
    i.id === issueId
      ? { ...i, status, resolution: resolution || i.resolution, updatedAt: new Date().toISOString() }
      : i
  );
  notify();
  return { success: true, message: `Issue status updated to ${status}.` };
}

export function escalateIssue(issueId: string, escalatedBy: string): { success: boolean; message: string } {
  issues = issues.map((i) =>
    i.id === issueId
      ? {
          ...i,
          status: "Escalated" as IssueStatus,
          assignedTo: "CLO",
          updatedAt: new Date().toISOString(),
          notes: [
            ...i.notes,
            { id: `in-${Date.now()}`, author: escalatedBy, authorRole: "DLO", content: "Issue escalated to CLO for resolution.", timestamp: new Date().toISOString() },
          ],
        }
      : i
  );
  notify();
  return { success: true, message: "Issue escalated to CLO." };
}
