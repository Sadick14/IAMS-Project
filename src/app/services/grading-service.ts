// Grading service — replaces grade-service.ts
// Implements assessment-score-flow.md (per-department config, 4-component grading)

import {
  getState,
  upsertGradingConfig,
  upsertIndustrialAssessment,
  upsertSiteVisitation,
  upsertReportScore,
  upsertPresentationScore,
  upsertCompiledGrade,
  upsertWeeklyRubric,
  addAuditLog,
  updateApplication,
  updateTerm,
} from "../lib/store";
import {
  DEFAULT_STRUCTURE,
  DEFAULT_STRUCTURE_WEIGHTS,
  DEFAULT_SECTION_WEIGHTS,
  INDUSTRIAL_CRITERIA,
} from "../lib/constants";
import type {
  DepartmentGradingConfig,
  GradingActor,
  GradingStructure,
  StructureWeights,
  SectionWeights,
  IndustrialSupervisorAssessment,
  SiteVisitationScore,
  ReportScore,
  PresentationScore,
  CompiledGrade,
  CompiledGradeComponents,
  CriterionRating,
  WeeklyRubricEntry,
  WeeklyRubricRatings,
  VisitationCriterionKey,
  VisitationCriterionRating
} from "../types/grading";

export interface ServiceResult<T = void> {
  success: boolean;
  message: string;
  data?: T;
}

// ── Internal helpers ────────────────────────────────────────────────

function nowIso() {
  return new Date().toISOString();
}

function findActiveTermId(): string {
  const t = getState().terms.find((x) => x.status === "Active");
  return t?.id ?? "t1";
}

function audit(actor: GradingActor, action: string, target: string, details: string) {
  addAuditLog({
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user: actor.name,
    action,
    target,
    timestamp: nowIso(),
    details,
  });
}

// ── Validation ───────────────────────────────────────────────────────

export function validateStructureWeights(
  structure: GradingStructure,
  w: StructureWeights
): string | null {
  // W1 (Industrial Supervisor) and W2 (Departmental Supervisor) are always ≥ 1.
  for (const k of ["w1", "w2"] as const) {
    const v = w[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1) {
      return `Industrial and Departmental Supervisor weights must each be ≥ 1%.`;
    }
  }

  if (structure === "A" || structure === "B") {
    // 3-component: w3 ≥ 1, w4 must not be present.
    if (typeof w.w3 !== "number" || !Number.isInteger(w.w3) || w.w3 < 1) {
      return `The third component weight must be a whole number ≥ 1%.`;
    }
    if (w.w4 !== undefined && w.w4 !== null && w.w4 !== 0) {
      return `Structure ${structure} should not include a 4th weight.`;
    }
    const sum = w.w1 + w.w2 + w.w3;
    if (sum !== 100) return `Weights must sum to exactly 100% (currently ${sum}%).`;
    return null;
  }

  if (structure === "C") {
    // 4-component, all ≥ 1.
    if (typeof w.w3 !== "number" || !Number.isInteger(w.w3) || w.w3 < 1) {
      return `Report weight must be a whole number ≥ 1% in Structure C.`;
    }
    if (typeof w.w4 !== "number" || !Number.isInteger(w.w4) || w.w4 < 1) {
      return `Presentation weight must be a whole number ≥ 1% in Structure C.`;
    }
    const sum = w.w1 + w.w2 + w.w3 + w.w4;
    if (sum !== 100) return `Weights must sum to exactly 100% (currently ${sum}%).`;
    return null;
  }

  // Structure D — fully custom. W3 / W4 may be 0 (excludes that component).
  if (typeof w.w3 !== "number" || !Number.isInteger(w.w3) || w.w3 < 0) {
    return `Report weight must be a whole number ≥ 0%.`;
  }
  if (typeof w.w4 !== "number" || !Number.isInteger(w.w4) || w.w4 < 0) {
    return `Presentation weight must be a whole number ≥ 0%.`;
  }
  const sumD = w.w1 + w.w2 + w.w3 + w.w4;
  if (sumD !== 100) return `Weights must sum to exactly 100% (currently ${sumD}%).`;
  return null;
}

export function validateSectionWeights(s: SectionWeights): string | null {
  for (const v of [s.a, s.b, s.c, s.d]) {
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1) {
      return `Each section weight must be a positive whole number (≥ 1).`;
    }
  }
  const sum = s.a + s.b + s.c + s.d;
  if (sum !== 100) return `Section weights must sum to exactly 100% (currently ${sum}%).`;
  return null;
}

// ── Authorization ────────────────────────────────────────────────────

function canEditConfig(actor: GradingActor, departmentId: string): boolean {
  if (actor.role === "clo") return true;
  if (actor.role === "dlo") return actor.department === departmentId;
  return false;
}

function canApproveConfig(actor: GradingActor, departmentId: string): boolean {
  return actor.role === "hod" && actor.department === departmentId;
}

// ── Config: read ─────────────────────────────────────────────────────

export function hasActiveConfig(departmentId: string, termId?: string): boolean {
  const tId = termId ?? findActiveTermId();
  return !!getState().gradingConfigs.find(
    (c) => c.departmentId === departmentId && c.termId === tId && c.status === "active"
  );
}

export function getActiveConfig(
  departmentId: string,
  termId?: string
): DepartmentGradingConfig {
  const tId = termId ?? findActiveTermId();
  const found = getState().gradingConfigs.find(
    (c) => c.departmentId === departmentId && c.termId === tId && c.status === "active"
  );
  if (found) return found;

  // Fall back to a synthetic default — never persisted until edited.
  return {
    id: `default-${departmentId}-${tId}`,
    departmentId,
    termId: tId,
    structure: DEFAULT_STRUCTURE,
    structureWeights: { ...DEFAULT_STRUCTURE_WEIGHTS },
    sectionWeights: { ...DEFAULT_SECTION_WEIGHTS },
    status: "active",
    createdBy: "system",
    createdAt: nowIso(),
    updatedBy: "system",
    updatedAt: nowIso(),
  };
}

export function getConfigForEditing(
  departmentId: string,
  termId?: string
): DepartmentGradingConfig {
  const tId = termId ?? findActiveTermId();
  const all = getState().gradingConfigs.filter(
    (c) => c.departmentId === departmentId && c.termId === tId
  );
  // Prefer an in-progress draft / pending_approval; otherwise fall back to active or synthetic.
  return (
    all.find((c) => c.status === "draft") ||
    all.find((c) => c.status === "pending_approval") ||
    all.find((c) => c.status === "active") ||
    getActiveConfig(departmentId, tId)
  );
}

// ── Config: write ────────────────────────────────────────────────────

export interface SaveConfigInput {
  departmentId: string;
  termId?: string;
  structure: GradingStructure;
  structureWeights: StructureWeights;
  sectionWeights: SectionWeights;
}

export function saveDraft(
  input: SaveConfigInput,
  actor: GradingActor
): ServiceResult<DepartmentGradingConfig> {
  if (!canEditConfig(actor, input.departmentId)) {
    return { success: false, message: "You do not have permission to edit this department's grading configuration." };
  }
  const structureErr = validateStructureWeights(input.structure, input.structureWeights);
  if (structureErr) return { success: false, message: structureErr };
  const sectionErr = validateSectionWeights(input.sectionWeights);
  if (sectionErr) return { success: false, message: sectionErr };

  const tId = input.termId ?? findActiveTermId();

  // Locked once active for the term — cannot replace mid-term (Q6).
  const existingActive = getState().gradingConfigs.find(
    (c) => c.departmentId === input.departmentId && c.termId === tId && c.status === "active"
  );
  if (existingActive) {
    return {
      success: false,
      message: "Grading configuration for this term is already approved and locked. Changes are only possible at the start of a new term.",
    };
  }

  const existingDraft = getState().gradingConfigs.find(
    (c) => c.departmentId === input.departmentId && c.termId === tId && (c.status === "draft" || c.status === "pending_approval")
  );

  // Structures C and D both carry a w4 (Presentation). A and B drop w4 entirely.
  const cleanedWeights: StructureWeights =
    input.structure === "C" || input.structure === "D"
      ? {
          w1: input.structureWeights.w1,
          w2: input.structureWeights.w2,
          w3: input.structureWeights.w3,
          w4: input.structureWeights.w4 ?? 0,
        }
      : { w1: input.structureWeights.w1, w2: input.structureWeights.w2, w3: input.structureWeights.w3 };

  const config: DepartmentGradingConfig = existingDraft
    ? {
        ...existingDraft,
        structure: input.structure,
        structureWeights: cleanedWeights,
        sectionWeights: input.sectionWeights,
        status: "draft",
        updatedBy: actor.name,
        updatedAt: nowIso(),
        submittedForApprovalBy: undefined,
        submittedForApprovalAt: undefined,
      }
    : {
        id: `gc-${Date.now()}`,
        departmentId: input.departmentId,
        termId: tId,
        structure: input.structure,
        structureWeights: cleanedWeights,
        sectionWeights: input.sectionWeights,
        status: "draft",
        createdBy: actor.name,
        createdAt: nowIso(),
        updatedBy: actor.name,
        updatedAt: nowIso(),
      };

  upsertGradingConfig(config);
  audit(actor, "Saved Grading Config Draft", `${input.departmentId} (${tId})`, `Structure ${input.structure}`);
  return { success: true, message: "Draft saved.", data: config };
}

export function submitForApproval(configId: string, actor: GradingActor): ServiceResult {
  const cfg = getState().gradingConfigs.find((c) => c.id === configId);
  if (!cfg) return { success: false, message: "Configuration not found." };
  if (!canEditConfig(actor, cfg.departmentId)) {
    return { success: false, message: "You do not have permission to submit this configuration." };
  }
  if (cfg.status !== "draft") {
    return { success: false, message: `Cannot submit — current status is "${cfg.status}".` };
  }
  upsertGradingConfig({
    ...cfg,
    status: "pending_approval",
    submittedForApprovalBy: actor.name,
    submittedForApprovalAt: nowIso(),
    updatedBy: actor.name,
    updatedAt: nowIso(),
  });
  audit(actor, "Submitted Grading Config for Approval", `${cfg.departmentId} (${cfg.termId})`, `Structure ${cfg.structure}`);
  return { success: true, message: "Configuration submitted to HOD for approval." };
}

export function approveConfig(configId: string, actor: GradingActor): ServiceResult {
  const cfg = getState().gradingConfigs.find((c) => c.id === configId);
  if (!cfg) return { success: false, message: "Configuration not found." };
  if (!canApproveConfig(actor, cfg.departmentId)) {
    return { success: false, message: "Only the HOD of this department can approve the configuration." };
  }
  if (cfg.status !== "pending_approval") {
    return { success: false, message: `Cannot approve — current status is "${cfg.status}".` };
  }
  // Demote any prior active config for the same dept+term (shouldn't exist per Q6 but be safe).
  getState().gradingConfigs
    .filter((c) => c.departmentId === cfg.departmentId && c.termId === cfg.termId && c.status === "active" && c.id !== configId)
    .forEach((c) => upsertGradingConfig({ ...c, status: "draft" }));

  upsertGradingConfig({
    ...cfg,
    status: "active",
    approvedBy: actor.name,
    approvedAt: nowIso(),
    lockedAt: nowIso(),
    updatedBy: actor.name,
    updatedAt: nowIso(),
  });
  audit(actor, "Approved Grading Config", `${cfg.departmentId} (${cfg.termId})`, `Structure ${cfg.structure} locked for term`);
  return { success: true, message: "Configuration approved and locked for the term." };
}

// ── Score calculations ─────────────────────────────────────────────

/**
 * Section-weighted Industrial Supervisor score out of 100.
 * Each section's average rating (1–5) is normalised to /100, then weighted.
 */
export function calculateIndustrialScore(
  ratings: Record<string, CriterionRating>,
  sectionWeights: SectionWeights
): number {
  const bySection: Record<"A" | "B" | "C" | "D", number[]> = { A: [], B: [], C: [], D: [] };
  INDUSTRIAL_CRITERIA.forEach((c) => {
    const r = ratings[c.key];
    if (typeof r === "number") bySection[c.section].push(r);
  });
  const sectionPercent = (arr: number[]) =>
    arr.length === 0 ? 0 : (arr.reduce((s, n) => s + n, 0) / (arr.length * 5)) * 100;

  const aPct = sectionPercent(bySection.A);
  const bPct = sectionPercent(bySection.B);
  const cPct = sectionPercent(bySection.C);
  const dPct = sectionPercent(bySection.D);

  const total =
    (aPct * sectionWeights.a + bPct * sectionWeights.b + cPct * sectionWeights.c + dPct * sectionWeights.d) / 100;

  return Math.round(total * 100) / 100;
}

export function compileFinalPercent(
  components: CompiledGradeComponents,
  config: DepartmentGradingConfig
): number | null {
  const { structure, structureWeights: w } = config;
  const ind = components.industrial;
  const dept = components.departmental;
  const rep = components.report;
  const pres = components.presentation;

  if (ind === undefined || dept === undefined) return null;

  if (structure === "A") {
    if (rep === undefined) return null;
    return round2((ind * w.w1 + dept * w.w2 + rep * w.w3) / 100);
  }
  if (structure === "B") {
    if (pres === undefined) return null;
    return round2((ind * w.w1 + dept * w.w2 + pres * w.w3) / 100);
  }
  if (structure === "C") {
    if (rep === undefined || pres === undefined) return null;
    return round2((ind * w.w1 + dept * w.w2 + rep * w.w3 + pres * (w.w4 || 0)) / 100);
  }

  // Structure D — fully custom. Components with weight 0 are excluded entirely;
  // components with weight > 0 must have a score before the grade can be compiled.
  const w3 = w.w3 || 0;
  const w4 = w.w4 || 0;
  if (w3 > 0 && rep === undefined) return null;
  if (w4 > 0 && pres === undefined) return null;
  return round2(
    (ind * w.w1 +
      dept * w.w2 +
      (w3 > 0 ? (rep || 0) * w3 : 0) +
      (w4 > 0 ? (pres || 0) * w4 : 0)) /
      100
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ── Compilation ────────────────────────────────────────────────────

function recompileGrade(applicationId: string) {
  const s = getState();
  const app = s.applications.find((a) => a.id === applicationId);
  if (!app) return;
  const configActive = hasActiveConfig(app.department);
  const config = getActiveConfig(app.department);

  const ind = s.industrialAssessments.find((x) => x.applicationId === applicationId);
  const visit = s.siteVisitations.find((x) => x.applicationId === applicationId);
  const rep = s.reportScores.find((x) => x.applicationId === applicationId);
  const pres = s.presentationScores.find((x) => x.applicationId === applicationId);

  const components: CompiledGradeComponents = {
    industrial: ind ? calculateIndustrialScore(ind.ratings, config.sectionWeights) : undefined,
    departmental: visit?.score,
    report: rep?.score,
    presentation: pres?.score,
  };

  const finalPercent = configActive ? compileFinalPercent(components, config) : null;
  const blockedReason = configActive
    ? undefined
    : `No approved grading configuration exists for ${app.department}. The DLO must configure and the HOD must approve the department's grading structure before final grades can be compiled.`;
  const existing = s.compiledGrades.find((g) => g.applicationId === applicationId);

  const compiled: CompiledGrade = {
    applicationId,
    components,
    configSnapshot: existing?.configSnapshot ?? config,
    finalPercent,
    blockedReason,
    status: existing?.status === "Approved" ? "Approved" : finalPercent !== null ? "Submitted" : "Pending",
    updatedAt: nowIso(),
    approvedBy: existing?.approvedBy,
    approvedAt: existing?.approvedAt,
  };

  upsertCompiledGrade(compiled);

  // Mirror status onto the application for legacy views.
  updateApplication(applicationId, {
    grade: finalPercent !== null ? `${finalPercent}%` : undefined,
    gradeStatus: compiled.status,
  });
}

// ── Score submissions ──────────────────────────────────────────────

export function submitIndustrialAssessment(
  applicationId: string,
  ratings: Record<string, CriterionRating>,
  comments: string,
  actor: GradingActor
): ServiceResult {
  if (actor.role !== "supervisor") {
    return { success: false, message: "Only the assigned Industrial Supervisor can submit this assessment." };
  }
  const missing = INDUSTRIAL_CRITERIA.filter((c) => !ratings[c.key]);
  if (missing.length > 0) {
    return { success: false, message: `Please rate all ${INDUSTRIAL_CRITERIA.length} criteria. Missing: ${missing.map((m) => m.key).join(", ")}` };
  }
  upsertIndustrialAssessment({
    id: `ind-${Date.now()}`,
    applicationId,
    ratings: ratings as IndustrialSupervisorAssessment["ratings"],
    comments,
    submittedBy: actor.name,
    submittedAt: nowIso(),
  });
  recompileGrade(applicationId);
  audit(actor, "Submitted Industrial Supervisor Assessment", applicationId, `${INDUSTRIAL_CRITERIA.length}-criterion assessment`);
  return { success: true, message: "Industrial Supervisor assessment submitted." };
}

export function submitSiteVisitation(
  applicationId: string,
  ratings: Record<VisitationCriterionKey, VisitationCriterionRating>,
  comments: string,
  actor: GradingActor
): ServiceResult {
  if (actor.role !== "academic") {
    return { success: false, message: "Only the Departmental Supervisor can submit a site visitation score." };
  }
  
  // Calculate score scaling to 100
  const maxPossible = 30; // 10 criteria * 3 max rating
  const totalRaw = Object.values(ratings).reduce((acc, r) => acc + r, 0);
  const score = (totalRaw / maxPossible) * 100;

  upsertSiteVisitation({
    id: `sv-${Date.now()}`,
    applicationId,
    ratings,
    score,
    comments,
    visitedAt: nowIso(),
    submittedBy: actor.name,
  });
  recompileGrade(applicationId);
  audit(actor, "Submitted Site Visitation Score", applicationId, `Score: ${score.toFixed(1)}/100`);
  return { success: true, message: "Site visitation score submitted successfully." };
}

export function overrideSiteVisitation(
  applicationId: string,
  ratings: Record<VisitationCriterionKey, VisitationCriterionRating>,
  comments: string,
  overrideComments: string,
  actor: GradingActor
): ServiceResult {
  if (actor.role !== "dlo") {
    return { success: false, message: "Only the DLO can override site visitation scores." };
  }
  
  const existing = getSiteVisitation(applicationId);
  if (!existing) {
    return { success: false, message: "No existing visitation score to override." };
  }

  const maxPossible = 30;
  const totalRaw = Object.values(ratings).reduce((acc, r) => acc + r, 0);
  const score = (totalRaw / maxPossible) * 100;

  upsertSiteVisitation({
    ...existing,
    ratings,
    score,
    comments,
    overriddenBy: actor.name,
    overrideComments,
  });
  recompileGrade(applicationId);
  audit(actor, "Overrode Site Visitation Score", applicationId, `New Score: ${score.toFixed(1)}/100`);
  return { success: true, message: "Site visitation score overridden successfully." };
}

export function submitReportScore(
  applicationId: string,
  score: number,
  comments: string,
  actor: GradingActor
): ServiceResult {
  if (actor.role !== "dlo" && actor.role !== "clo") {
    return { success: false, message: "Only the DLO can submit the report score." };
  }
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { success: false, message: "Score must be between 0 and 100." };
  }
  upsertReportScore({
    id: `rs-${Date.now()}`,
    applicationId,
    score,
    comments,
    submittedBy: actor.name,
    submittedAt: nowIso(),
  });
  recompileGrade(applicationId);
  audit(actor, "Submitted Report Score", applicationId, `Score: ${score}/100`);
  return { success: true, message: "Attachment report score submitted." };
}

export function submitPresentationScore(
  applicationId: string,
  score: number,
  comments: string,
  actor: GradingActor
): ServiceResult {
  if (actor.role !== "dlo" && actor.role !== "clo") {
    return { success: false, message: "Only the DLO can submit the presentation score." };
  }
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { success: false, message: "Score must be between 0 and 100." };
  }
  upsertPresentationScore({
    id: `ps-${Date.now()}`,
    applicationId,
    score,
    comments,
    submittedBy: actor.name,
    submittedAt: nowIso(),
  });
  recompileGrade(applicationId);
  audit(actor, "Submitted Presentation Score", applicationId, `Score: ${score}/100`);
  return { success: true, message: "Presentation score submitted." };
}

// ── Approval / revision of compiled grade ──────────────────────────

export function approveCompiledGrade(applicationId: string, actor: GradingActor): ServiceResult {
  if (actor.role !== "dlo" && actor.role !== "clo") {
    return { success: false, message: "Only the DLO can finalise a grade." };
  }
  const g = getState().compiledGrades.find((x) => x.applicationId === applicationId);
  if (!g) return { success: false, message: "No compiled grade for this student." };
  if (g.finalPercent === null) {
    return { success: false, message: "Cannot approve — not all required components have been submitted." };
  }
  upsertCompiledGrade({
    ...g,
    status: "Approved",
    approvedBy: actor.name,
    approvedAt: nowIso(),
    updatedAt: nowIso(),
  });
  updateApplication(applicationId, { gradeStatus: "Approved", status: "Completed" });
  audit(actor, "Approved Final Grade", applicationId, `Final: ${g.finalPercent}%`);
  return { success: true, message: `Final grade ${g.finalPercent}% approved.` };
}

export function requestGradeRevision(
  applicationId: string,
  reason: string,
  actor: GradingActor
): ServiceResult {
  const g = getState().compiledGrades.find((x) => x.applicationId === applicationId);
  if (!g) return { success: false, message: "No compiled grade for this student." };
  upsertCompiledGrade({ ...g, status: "Pending", updatedAt: nowIso() });
  updateApplication(applicationId, { gradeStatus: "Pending" });
  audit(actor, "Requested Grade Revision", applicationId, reason || "No reason provided");
  return { success: true, message: "Revision requested." };
}

// ── Read helpers for UI ────────────────────────────────────────────

export function getCompiledGrade(applicationId: string): CompiledGrade | undefined {
  return getState().compiledGrades.find((g) => g.applicationId === applicationId);
}

export function getIndustrialAssessment(applicationId: string) {
  return getState().industrialAssessments.find((a) => a.applicationId === applicationId);
}

export function getSiteVisitation(applicationId: string) {
  return getState().siteVisitations.find((a) => a.applicationId === applicationId);
}

export function getReportScore(applicationId: string) {
  return getState().reportScores.find((a) => a.applicationId === applicationId);
}

export function getPresentationScore(applicationId: string) {
  return getState().presentationScores.find((a) => a.applicationId === applicationId);
}

// ── Term lifecycle ─────────────────────────────────────────────────

/**
 * Advances the academic cycle: marks the current active term as Completed
 * and promotes the next Upcoming term to Active. Approved configs from the
 * previous term remain frozen as historical record (configSnapshot on each
 * compiled grade preserves them). Departments can then save fresh drafts
 * for the new term.
 */
export function startNewTerm(actor: GradingActor): ServiceResult<{ newActiveTermId?: string }> {
  if (actor.role !== "clo") {
    return { success: false, message: "Only the CLO can start a new term." };
  }
  const s = getState();
  const current = s.terms.find((t) => t.status === "Active");
  const next = s.terms.find((t) => t.status === "Upcoming");

  if (!current && !next) {
    return { success: false, message: "No active or upcoming term to advance." };
  }

  if (current) {
    updateTerm(current.id, { status: "Completed" });
  }
  if (next) {
    updateTerm(next.id, { status: "Active" });
  }

  audit(
    actor,
    "Started New Term",
    next?.name ?? "(no upcoming term)",
    `Previous: ${current?.name ?? "none"} → Active: ${next?.name ?? "none"}. Department grading configs reset for new term.`
  );

  return {
    success: true,
    message: next
      ? `Term advanced. "${next.name}" is now active. Departments can configure fresh grading rules.`
      : `Previous term marked completed. No upcoming term was queued.`,
    data: { newActiveTermId: next?.id },
  };
}

// ── Weekly Assessment Rubric (qualitative — NOT scored) ──────────────
//
// The number of weeks in an attachment is auto-derived from the active term's
// internshipStart and internshipEnd. Weeks are Mon–Sun aligned to keep entries
// stable regardless of the actual calendar day a supervisor opens the form.

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 = Sun … 6 = Sat
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface TermWeek {
  weekNumber: number;
  weekStart: string; // ISO date (Monday)
  weekEnd: string;   // ISO date (Sunday)
}

/**
 * Returns the Mon–Sun weeks that overlap an attachment's date window.
 * Used to drive the Weekly Rubric form for the Industrial Supervisor.
 */
export function getWeeksForApplication(applicationId: string): TermWeek[] {
  const s = getState();
  const app = s.applications.find((a) => a.id === applicationId);
  if (!app) return [];
  const term = s.terms.find((t) => t.id === (app as any).termId) ?? s.terms.find((t) => t.status === "Active");
  if (!term) return [];

  const start = startOfWeekMonday(new Date(term.internshipStart));
  const end = new Date(term.internshipEnd);
  const weeks: TermWeek[] = [];
  let cursor = start;
  let n = 1;
  while (cursor <= end) {
    const weekEnd = addDays(cursor, 6);
    weeks.push({ weekNumber: n, weekStart: isoDate(cursor), weekEnd: isoDate(weekEnd) });
    cursor = addDays(cursor, 7);
    n++;
  }
  return weeks;
}

/** The week index (1-based) that today's date falls into for the given application. 0 if before/after. */
export function getCurrentWeekNumber(applicationId: string): number {
  const weeks = getWeeksForApplication(applicationId);
  const today = isoDate(new Date());
  const found = weeks.find((w) => today >= w.weekStart && today <= w.weekEnd);
  return found?.weekNumber ?? 0;
}

export function getWeeklyRubrics(applicationId: string): WeeklyRubricEntry[] {
  return getState()
    .weeklyRubrics.filter((w) => w.applicationId === applicationId)
    .sort((a, b) => a.weekNumber - b.weekNumber);
}

export function getWeeklyRubric(applicationId: string, weekNumber: number): WeeklyRubricEntry | undefined {
  return getState().weeklyRubrics.find(
    (w) => w.applicationId === applicationId && w.weekNumber === weekNumber
  );
}

export function submitWeeklyRubric(
  applicationId: string,
  weekNumber: number,
  ratings: WeeklyRubricRatings,
  notes: string,
  actor: GradingActor
): ServiceResult<WeeklyRubricEntry> {
  if (actor.role !== "supervisor") {
    return { success: false, message: "Only the assigned Industrial Supervisor can submit weekly rubrics." };
  }

  const weeks = getWeeksForApplication(applicationId);
  const week = weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) {
    return { success: false, message: `Week ${weekNumber} is outside the attachment period.` };
  }

  // All 6 criteria must be filled.
  const required: (keyof WeeklyRubricRatings)[] = ["WR1", "WR2", "WR3", "WR4", "WR5", "WR6"];
  const missing = required.filter((k) => !ratings[k]);
  if (missing.length > 0) {
    return { success: false, message: `Please rate all 6 criteria. Missing: ${missing.join(", ")}` };
  }

  const s = getState();
  const app = s.applications.find((a) => a.id === applicationId);
  const termId = (app as any)?.termId ?? s.terms.find((t) => t.status === "Active")?.id ?? "t1";

  const entry: WeeklyRubricEntry = {
    id: `wr-${applicationId}-w${weekNumber}`,
    applicationId,
    termId,
    weekNumber,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    ratings,
    notes,
    submittedBy: actor.name,
    submittedAt: nowIso(),
  };

  upsertWeeklyRubric(entry);
  audit(actor, "Submitted Weekly Assessment Rubric", applicationId, `Week ${weekNumber} (${week.weekStart} → ${week.weekEnd})`);
  return { success: true, message: `Week ${weekNumber} rubric saved.`, data: entry };
}

export interface OverdueWeeklyRubric {
  applicationId: string;
  studentName: string;
  studentId: string;
  companyName: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  daysOverdue: number;
}

/**
 * Returns weekly rubrics that should have been filled by now but weren't.
 * "Overdue" = the week has fully ended (weekEnd < today) and no entry exists.
 * Optional companyName filter scopes results to a single industrial supervisor.
 */
export function getOverdueWeeklyRubrics(opts?: { companyName?: string }): OverdueWeeklyRubric[] {
  const s = getState();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = isoDate(today);

  const apps = s.applications.filter((a) => {
    if (a.status !== "Active" && a.status !== "Completed") return false;
    if (opts?.companyName && a.companyName !== opts.companyName) return false;
    return true;
  });

  const out: OverdueWeeklyRubric[] = [];
  for (const app of apps) {
    const weeks = getWeeksForApplication(app.id);
    for (const w of weeks) {
      if (w.weekEnd >= todayIso) continue; // week not finished
      const filled = s.weeklyRubrics.some(
        (r) => r.applicationId === app.id && r.weekNumber === w.weekNumber
      );
      if (filled) continue;
      const days = Math.floor(
        (today.getTime() - new Date(w.weekEnd).getTime()) / (1000 * 60 * 60 * 24)
      );
      out.push({
        applicationId: app.id,
        studentName: app.studentName,
        studentId: app.studentId,
        companyName: app.companyName,
        weekNumber: w.weekNumber,
        weekStart: w.weekStart,
        weekEnd: w.weekEnd,
        daysOverdue: days,
      });
    }
  }
  // Most overdue first.
  return out.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function getDepartmentAveragePercent(departmentId: string): number | null {
  const apps = getState().applications.filter((a) => a.department === departmentId);
  const compiled = getState().compiledGrades.filter(
    (g) => apps.some((a) => a.id === g.applicationId) && g.finalPercent !== null && g.status === "Approved"
  );
  if (compiled.length === 0) return null;
  const sum = compiled.reduce((s, g) => s + (g.finalPercent || 0), 0);
  return round2(sum / compiled.length);
}
