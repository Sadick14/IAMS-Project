// Settings store — persists local app preferences (appearance, attachment rules,
// university info, notification toggles) to localStorage so they survive reloads.
// These are per-browser preferences, not synced to the backend.

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

const STORAGE_KEY = "iams.settings";

export interface SystemSettings {
  // Appearance
  darkMode: boolean;
  // CLO general / university info
  uniName: string;
  contactEmail: string;
  contactPhone: string;
  // Attachment rules
  inactivityThresholdDays: number;
  autoFlagEnabled: boolean;
  allowSelfPlacement: boolean;
  maxSupervisorLoad: number;
  // DLO-specific attachment rules
  deptMaxLoad: number;
  deptDeadline: string;
  // Notification preferences
  emailNotifs: boolean;
  inAppNotifs: boolean;
  notifNewApp: boolean;
  notifCompanyApproval: boolean;
  notifGradeSubmission: boolean;
  notifIssueEscalation: boolean;
  notifLogbookFlag: boolean;
  notifAnnouncements: boolean;
  digestFrequency: string;
}

const defaults: SystemSettings = {
  darkMode: false,
  uniName: "Ho Technical University",
  contactEmail: "liaison@htu.edu.gh",
  contactPhone: "+233 362 194 410",
  inactivityThresholdDays: 3,
  autoFlagEnabled: true,
  allowSelfPlacement: true,
  maxSupervisorLoad: 8,
  deptMaxLoad: 8,
  deptDeadline: "",
  emailNotifs: true,
  inAppNotifs: true,
  notifNewApp: true,
  notifCompanyApproval: true,
  notifGradeSubmission: true,
  notifIssueEscalation: true,
  notifLogbookFlag: true,
  notifAnnouncements: true,
  digestFrequency: "daily",
};

function loadSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    // ignore malformed/unavailable storage
  }
  return { ...defaults };
}

let settings: SystemSettings = loadSettings();

export function getSettings(): SystemSettings {
  return settings;
}

export function updateSettings(updates: Partial<SystemSettings>) {
  settings = { ...settings, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage write failures (e.g. private browsing quota)
  }
  if ("darkMode" in updates) {
    applyDarkMode(settings.darkMode);
  }
  notify();
}

export function subscribeSettings(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyDarkMode(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Apply on load
applyDarkMode(settings.darkMode);
