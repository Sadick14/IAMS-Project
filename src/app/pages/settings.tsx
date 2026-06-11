import { useState, useSyncExternalStore } from "react";
import { useAppContext } from "../lib/context";
import { apiClient } from "../lib/api-client";
import {
  Save, Upload, Shield, Bell, Settings2, User, Globe, Database,
  Monitor, Mail, Clock, Building2, GraduationCap, AlertTriangle, Moon, Sun, SlidersHorizontal
} from "lucide-react";
import { CLOGradingConfigPage } from "./clo/grading-config";
import { DLOGradingConfigPage } from "./dlo/grading-config";
import { HODGradingConfigPage } from "./hod/grading-config";
import { NotificationPreferences } from "../components/notification-preferences";
import { toast } from "sonner";
import type { ExtendedRole } from "../services/auth-service";
import { getSettings, updateSettings, subscribeSettings } from "../lib/settings-store";
import { exportToCSV } from "../lib/csv-export";

type SettingsTab = "general" | "notifications" | "system" | "profile" | "grading";

export function SettingsPage() {
  const { user } = useAppContext();
  const role = user?.role as ExtendedRole;
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getSettings);

  // Profile
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail] = useState(user?.email || "");
  const [profilePhone, setProfilePhone] = useState(user?.phone || "");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // General (CLO only)
  const [uniName, setUniName] = useState(settings.uniName);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [maxSupervisorLoad, setMaxSupervisorLoad] = useState(String(settings.maxSupervisorLoad));
  const [inactivityThreshold, setInactivityThreshold] = useState(String(settings.inactivityThresholdDays));
  const [autoFlagEnabled, setAutoFlagEnabled] = useState(settings.autoFlagEnabled);
  const [allowSelfPlacement, setAllowSelfPlacement] = useState(settings.allowSelfPlacement);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(settings.emailNotifs);
  const [inAppNotifs, setInAppNotifs] = useState(settings.inAppNotifs);
  const [notifNewApp, setNotifNewApp] = useState(settings.notifNewApp);
  const [notifCompanyApproval, setNotifCompanyApproval] = useState(settings.notifCompanyApproval);
  const [notifGradeSubmission, setNotifGradeSubmission] = useState(settings.notifGradeSubmission);
  const [notifIssueEscalation, setNotifIssueEscalation] = useState(settings.notifIssueEscalation);
  const [notifLogbookFlag, setNotifLogbookFlag] = useState(settings.notifLogbookFlag);
  const [notifAnnouncements, setNotifAnnouncements] = useState(settings.notifAnnouncements);
  const [digestFrequency, setDigestFrequency] = useState(settings.digestFrequency);

  // DLO-specific
  const [deptMaxLoad, setDeptMaxLoad] = useState(String(settings.deptMaxLoad));
  const [deptDeadline, setDeptDeadline] = useState(settings.deptDeadline);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);
    try {
      const res = await apiClient.updateUser(user.id, { name: profileName });
      if (res.success) {
        toast.success("Profile updated successfully.");
      } else {
        toast.error("Failed to update profile.");
      }
    } catch (error) {
      toast.error("Error updating profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveGeneral = () => {
    updateSettings({ uniName, contactEmail, contactPhone });
    toast.success("University settings saved.");
  };

  const handleSaveNotifications = () => {
    updateSettings({
      emailNotifs,
      inAppNotifs,
      notifNewApp,
      notifCompanyApproval,
      notifGradeSubmission,
      notifIssueEscalation,
      notifLogbookFlag,
      notifAnnouncements,
      digestFrequency,
    });
    toast.success("Notification preferences saved.");
  };

  const handleSaveRules = () => {
    updateSettings({
      inactivityThresholdDays: parseInt(inactivityThreshold) || 3,
      autoFlagEnabled,
      allowSelfPlacement,
      maxSupervisorLoad: parseInt(maxSupervisorLoad) || 8,
      deptMaxLoad: parseInt(deptMaxLoad) || 8,
      deptDeadline,
    });
    toast.success("Attachment rules saved.");
  };

  const handleExport = async (type: string) => {
    let rows: Record<string, unknown>[] = [];
    let filename = "";

    switch (type) {
      case "Export All Applications": {
        const res = await apiClient.getApplications({ per_page: 1000 });
        if (!res.success) return toast.error("Failed to load applications.");
        rows = res.data.map((a: any) => ({
          Student: a.student?.user?.name ?? a.student?.name ?? a.studentName ?? "",
          ID: a.student?.student_id ?? a.studentId ?? "",
          Department: a.student?.department?.name ?? a.student?.department ?? a.department ?? "",
          Company: a.company?.name ?? a.companyName ?? "",
          Status: a.status ?? "",
          "Date Applied": a.created_at ?? a.dateApplied ?? "",
        }));
        filename = "applications";
        break;
      }
      case "Export Grade Reports": {
        const res = await apiClient.getGrades({ per_page: 1000 });
        if (!res.success) return toast.error("Failed to load grade reports.");
        rows = res.data.map((g: any) => ({
          Student: g.internship?.student?.user?.name ?? "",
          ID: g.internship?.student?.student_id ?? "",
          Department: g.internship?.student?.department?.name ?? "",
          Company: g.internship?.company?.name ?? "",
          Score: g.total_score ?? "",
          Grade: g.letter_grade ?? "",
          Status: g.status ?? "",
        }));
        filename = "grade_reports";
        break;
      }
      case "Export Company Registry": {
        const res = await apiClient.getCompanies({ per_page: 1000 });
        if (!res.success) return toast.error("Failed to load companies.");
        rows = res.data.map((c: any) => ({
          Name: c.name,
          Industry: c.industry ?? "",
          Status: c.status ?? "",
          "Approval Status": c.approval_status ?? "",
          "Contact Person": c.contact_person_name ?? "",
          Email: c.contact_person_email ?? c.email ?? "",
          Region: c.region ?? "",
        }));
        filename = "companies";
        break;
      }
      case "Export Audit Logs": {
        const res = await apiClient.getAuditLogs({ per_page: 1000 });
        if (!res.success) return toast.error("Failed to load audit logs.");
        rows = res.data.map((l: any) => ({
          User: l.user?.name ?? "System",
          Action: l.action ?? "",
          Target: l.auditable_type ? `${String(l.auditable_type).split("\\").pop()} #${l.auditable_id ?? ""}` : "",
          Timestamp: l.created_at ?? "",
          Details: l.description ?? "",
        }));
        filename = "audit_logs";
        break;
      }
    }

    if (rows.length === 0) {
      toast.error("No data to export.");
      return;
    }

    exportToCSV(rows, filename);
    toast.success(`${type} downloaded.`);
  };

  const tabs: { key: SettingsTab; label: string; icon: typeof Settings2; roles: ExtendedRole[] }[] = [
    { key: "profile", label: "Profile", icon: User, roles: ["clo", "dlo", "student", "supervisor", "academic", "hod"] },
    { key: "general", label: "General", icon: Settings2, roles: ["clo", "dlo"] },
    { key: "grading", label: "Grading Configuration", icon: SlidersHorizontal, roles: ["clo", "dlo", "hod"] },
    { key: "notifications", label: "Notifications", icon: Bell, roles: ["clo", "dlo", "student", "supervisor", "academic", "hod"] },
    { key: "system", label: "System", icon: Database, roles: ["clo"] },
  ];

  const visibleTabs = tabs.filter((t) => t.roles.includes(role));

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${value ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} style={{ left: 0 }} />
    </button>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1>Settings</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          {role === "clo" ? "System-wide configuration & preferences" : role === "dlo" ? "Department settings & preferences" : "Your account settings"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-6 space-y-4">
            <h3 className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Your Profile</h3>

            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground" style={{ fontSize: "1.2rem" }}>
                {(user?.name || "").split(" ").map((w) => w[0]).join("")}
              </div>
              <div>
                <p style={{ fontSize: "1rem" }}>{user?.name}</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>{user?.email}</p>
                <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full mt-1 inline-block" style={{ fontSize: "0.7rem" }}>
                  {role === "clo" ? "Central Liaison Officer" : role === "dlo" ? "Departmental Liaison" : role === "student" ? "Student" : role === "supervisor" ? "Industry Supervisor" : role === "academic" ? "Academic Supervisor" : "Head of Department"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "0.8rem" }}>Full Name</label>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Email Address</label>
                <input type="email" value={profileEmail} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} disabled />
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.7rem" }}>Email is managed via Google SSO</p>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Phone Number</label>
                <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+233 50 123 4567" className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>
              {user?.department && (
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Department</label>
                  <input type="text" value={user.department} disabled className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-muted/30" style={{ fontSize: "0.85rem" }} />
                </div>
              )}
              {role === "student" && (
                <>
                  <div>
                    <label style={{ fontSize: "0.8rem" }}>Emergency Contact Name</label>
                    <input type="text" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Full name" className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.8rem" }}>Emergency Contact Phone</label>
                    <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+233 50 000 0000" className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                  </div>
                </>
              )}
            </div>

            {/* Appearance */}
            <div className="pt-3 border-t border-border">
              <h4 className="flex items-center gap-2 mb-3">{settings.darkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />} Appearance</h4>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p style={{ fontSize: "0.85rem" }}>Dark Mode</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Switch between light and dark theme</p>
                </div>
                <Toggle value={settings.darkMode} onChange={(v) => updateSettings({ darkMode: v })} />
              </div>
            </div>

            {role === "dlo" && (
              <div className="pt-3 border-t border-border">
                <label style={{ fontSize: "0.8rem" }}>Digital Signature</label>
                <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/40 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                  <p style={{ fontSize: "0.8rem" }} className="text-muted-foreground">Upload your signature for placement letters</p>
                </div>
              </div>
            )}

            <button onClick={handleSaveProfile} disabled={isSavingProfile} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
              <Save className="w-4 h-4" /> {isSavingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="space-y-4">
          {role === "clo" && (
            <div className="bg-card rounded-2xl p-6 space-y-4">
              <h3 className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> University Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label style={{ fontSize: "0.8rem" }}>University Name</label>
                  <input type="text" value={uniName} onChange={(e) => setUniName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Contact Email</label>
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Contact Phone</label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                </div>
              </div>
              <button onClick={handleSaveGeneral} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          )}

          <div className="bg-card rounded-2xl p-6 space-y-4">
            <h3 className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Attachment Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "0.8rem" }}>Max Students per Supervisor</label>
                <input type="number" value={role === "clo" ? maxSupervisorLoad : deptMaxLoad} onChange={(e) => role === "clo" ? setMaxSupervisorLoad(e.target.value) : setDeptMaxLoad(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>
              {role === "clo" && (
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Inactivity Threshold (days)</label>
                  <input type="number" value={inactivityThreshold} onChange={(e) => setInactivityThreshold(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                  <p className="text-muted-foreground mt-1" style={{ fontSize: "0.7rem" }}>Students with this many days of missing logbook entries will be auto-flagged</p>
                </div>
              )}
              {role === "dlo" && (
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Department Application Deadline</label>
                  <input type="date" value={deptDeadline} onChange={(e) => setDeptDeadline(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-border">
              {role === "clo" && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p style={{ fontSize: "0.85rem" }}>Auto-flag inactive students</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Automatically flag students with {inactivityThreshold}+ days of missing logbook entries</p>
                    </div>
                    <Toggle value={autoFlagEnabled} onChange={setAutoFlagEnabled} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p style={{ fontSize: "0.85rem" }}>Allow self-placement applications</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Students can apply to companies they find themselves</p>
                    </div>
                    <Toggle value={allowSelfPlacement} onChange={setAllowSelfPlacement} />
                  </div>
                </>
              )}
            </div>

            <button onClick={handleSaveRules} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
              <Save className="w-4 h-4" /> Save Rules
            </button>
          </div>

          {role === "clo" && (
            <div className="bg-card rounded-2xl p-6 space-y-4">
              <h3 className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Roles & Permissions</h3>
              <div className="space-y-2">
                {[
                  { roleName: "Central Liaison Officer (CLO)", perms: ["Full system access", "Override DLO decisions", "Manage terms", "Manage users", "System configuration"], color: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800" },
                  { roleName: "Departmental Liaison (DLO)", perms: ["View department data", "Approve companies", "Approve applications", "Assign supervisors", "Approve grades"], color: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800" },
                  { roleName: "Head of Department (HOD)", perms: ["View department analytics", "Final grade approval", "Override DLO decisions"], color: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800" },
                  { roleName: "Academic Supervisor", perms: ["View assigned students", "Access logbooks", "Submit evaluations", "Submit grades"], color: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800" },
                  { roleName: "Industry Supervisor", perms: ["View student logbooks", "Approve check-ins", "Submit evaluations"], color: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" },
                  { roleName: "Student", perms: ["Apply for attachment", "Submit logbook", "Upload documents", "View status", "Report issues"], color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" },
                ].map((r) => (
                  <div key={r.roleName} className={`p-3 rounded-lg border ${r.color}`}>
                    <p style={{ fontSize: "0.85rem" }} className="mb-1.5">{r.roleName}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.perms.map((p) => (
                        <span key={p} className="px-2 py-0.5 bg-white/70 dark:bg-white/10 rounded text-foreground" style={{ fontSize: "0.7rem" }}>{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grading Configuration Tab */}
      {activeTab === "grading" && (
        <div className="-mx-1">
          {role === "clo" && <CLOGradingConfigPage />}
          {role === "dlo" && <DLOGradingConfigPage />}
          {role === "hod" && <HODGradingConfigPage />}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-6 space-y-4">
            <h3 className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notification Channels</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p style={{ fontSize: "0.85rem" }}>Email Notifications</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Receive notifications via email at {user?.email}</p>
                  </div>
                </div>
                <Toggle value={emailNotifs} onChange={setEmailNotifs} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p style={{ fontSize: "0.85rem" }}>In-App Notifications</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Show notifications in the notification centre</p>
                  </div>
                </div>
                <Toggle value={inAppNotifs} onChange={setInAppNotifs} />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 space-y-4">
            <h3 className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-primary" /> Notification Preferences</h3>
            <div className="space-y-2">
              {[
                { label: "New applications submitted", desc: "When a student submits an internship application", value: notifNewApp, onChange: setNotifNewApp, roles: ["clo", "dlo"] },
                { label: "Company approval updates", desc: "When a company is approved or rejected", value: notifCompanyApproval, onChange: setNotifCompanyApproval, roles: ["clo", "dlo", "student"] },
                { label: "Grade submissions", desc: "When grades are submitted for review", value: notifGradeSubmission, onChange: setNotifGradeSubmission, roles: ["clo", "dlo", "hod", "academic"] },
                { label: "Issue escalations", desc: "When issues are escalated to your level", value: notifIssueEscalation, onChange: setNotifIssueEscalation, roles: ["clo", "dlo"] },
                { label: "Logbook inactivity flags", desc: "When students are flagged for missing logbook entries", value: notifLogbookFlag, onChange: setNotifLogbookFlag, roles: ["clo", "dlo", "academic", "supervisor"] },
                { label: "Announcements", desc: "When new announcements are sent to your role group", value: notifAnnouncements, onChange: setNotifAnnouncements, roles: ["clo", "dlo", "student", "supervisor", "academic", "hod"] },
              ]
                .filter((item) => item.roles.includes(role))
                .map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p style={{ fontSize: "0.85rem" }}>{item.label}</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{item.desc}</p>
                    </div>
                    <Toggle value={item.value} onChange={item.onChange} />
                  </div>
                ))}
            </div>
          </div>

          {emailNotifs && (
            <div className="bg-card rounded-2xl p-6 space-y-4">
              <h3 className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Email Digest</h3>
              <div className="flex gap-2 flex-wrap">
                {["realtime", "daily", "weekly", "off"].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setDigestFrequency(freq)}
                    className={`px-4 py-2 rounded-lg border capitalize transition-colors ${
                      digestFrequency === freq ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
                    }`}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {freq === "realtime" ? "Real-time" : freq === "off" ? "Off" : freq}
                  </button>
                ))}
              </div>
            </div>
          )}

          <NotificationPreferences />

          <button onClick={handleSaveNotifications} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      )}

      {/* System Tab (CLO only) */}
      {activeTab === "system" && role === "clo" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-6 space-y-4">
            <h3 className="flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Data Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: "Export All Applications", desc: "Download all application data as CSV" },
                { label: "Export Grade Reports", desc: "Download all grade data for SIS integration" },
                { label: "Export Company Registry", desc: "Download the full company database" },
                { label: "Export Audit Logs", desc: "Download complete system audit trail" },
              ].map((item) => (
                <div key={item.label} className="p-3 border border-border rounded-lg flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: "0.85rem" }}>{item.label}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{item.desc}</p>
                  </div>
                  <button onClick={() => handleExport(item.label)} className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent text-muted-foreground shrink-0" style={{ fontSize: "0.8rem" }}>
                    Export CSV
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 space-y-4">
            <h3 className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> System Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Version", value: "2.4.0" },
                { label: "Environment", value: "Production" },
                { label: "Last Updated", value: "April 15, 2026" },
                { label: "Uptime", value: "99.97%" },
              ].map((info) => (
                <div key={info.label} className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{info.label}</p>
                  <p style={{ fontSize: "0.9rem" }}>{info.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 space-y-3">
            <h3 className="text-red-800 dark:text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Danger Zone</h3>
            <p className="text-red-700 dark:text-red-400" style={{ fontSize: "0.85rem" }}>These actions are irreversible. Proceed with caution.</p>
            <div className="flex gap-3">
              <button onClick={() => toast.error("This action is disabled in demo mode.")} className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50" style={{ fontSize: "0.85rem" }}>
                Reset All Terms
              </button>
              <button onClick={() => toast.error("This action is disabled in demo mode.")} className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50" style={{ fontSize: "0.85rem" }}>
                Purge Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}