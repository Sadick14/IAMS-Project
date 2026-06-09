import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useNavigate } from "react-router";
import { User, Book, Briefcase, Loader2, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";

export function StudentProfileSetup() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "internship">("personal");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  // Personal Information
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Academic Information
  const [studentId, setStudentId] = useState(user?.studentId || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState("200");
  const [languages, setLanguages] = useState("");

  // Internship Preferences
  const [preferredIndustries, setPreferredIndustries] = useState("");
  const [desiredRoles, setDesiredRoles] = useState("");

  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const draftKey = `profile_setup_draft_${user?.id}`;

  // Sync email from user context whenever it changes
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  // Load draft or backend profile on mount
  useEffect(() => {
    const load = async () => {
      try {
        const saved = localStorage.getItem(draftKey);
        const profileCompleteKey = `student_profile_complete_${user?.id}`;
        const isProfileSaved = localStorage.getItem(profileCompleteKey) === "true";

        if (saved) {
          const d = JSON.parse(saved);
          setFullName(d.fullName || user?.name || "");
          setPhone(d.phone || "");
          setEmergencyContact(d.emergencyContact || "");
          setEmergencyPhone(d.emergencyPhone || "");
          setStudentId(d.studentId || (user?.email ? user.email.split("@")[0] : ""));
          setDepartment(d.department || "");
          setProgram(d.program || "");
          setLevel(d.level || "200");
          setLanguages(d.languages || "");
          setPreferredIndustries(d.preferredIndustries || "");
          setDesiredRoles(d.desiredRoles || "");
          setIsProfileComplete(isProfileSaved);
          // Always show view page first, user clicks Edit to modify
          setIsEditMode(false);
        } else if (user?.id) {
          const res = await apiClient.getStudentProfile(String(user.id));
          if (res.success && res.data) {
            const p = res.data;
            setFullName(p.name || p.user?.name || user?.name || "");
            setPhone(p.phone || "");
            setEmergencyContact(p.emergency_contact || p.emergency_contact_name || "");
            setEmergencyPhone(p.emergency_contact_phone || "");
            setStudentId(p.student_id || (user?.email ? user.email.split("@")[0] : ""));
            setDepartment(p.department_name || (typeof p.department === "string" ? p.department : p.department?.name) || "");
            setProgram(p.program || "");
            setLevel(String(p.level || "200"));
            setLanguages(p.languages || p.profile_data?.languages || "");
            setPreferredIndustries(p.preferred_industries || p.profile_data?.preferred_industries || "");
            setDesiredRoles(p.desired_roles || p.profile_data?.desired_roles || "");
            setLastSaved(new Date());
            const isComplete = p.profile_completed || false;
            setIsProfileComplete(isComplete);
            // Always show view page first - whether complete or not
            setIsEditMode(false);
          } else if (user?.email) {
            setStudentId(user.email.split("@")[0]);
            // No profile found - still show view page with empty/placeholder data
            setIsEditMode(false);
          }
        }
      } catch {
        if (user?.email) setStudentId(user.email.split("@")[0]);
        // On error, still show view page
        setIsEditMode(false);
      }
    };
    load();
  }, [user?.id, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = { fullName, phone, emergencyContact, emergencyPhone, studentId, department, program, level, languages, preferredIndustries, desiredRoles };
    try { localStorage.setItem(draftKey, JSON.stringify(draft)); setLastSaved(new Date()); } catch {}
  }, [fullName, phone, emergencyContact, emergencyPhone, studentId, department, program, level, languages, preferredIndustries, desiredRoles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Completion: count filled fields out of 9 required
  useEffect(() => {
    const fields = [fullName, phone, emergencyContact, emergencyPhone, studentId, department, program, level];
    const filled = fields.filter(f => String(f).trim()).length;
    setCompletionPercentage(Math.round((filled / fields.length) * 100));
  }, [fullName, phone, emergencyContact, emergencyPhone, studentId, department, program, level]);

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
  };

  const handleSave = async () => {
    if (!fullName.trim() || !phone.trim() || !emergencyContact.trim() || !emergencyPhone.trim()) {
      toast.error("Please fill in all personal information fields");
      setActiveTab("personal");
      return;
    }
    if (!studentId.trim() || !department || !level || !program.trim()) {
      toast.error("Please fill in all academic information fields");
      setActiveTab("academic");
      return;
    }

    setIsSaving(true);
    try {
      const data: Record<string, any> = {
        name: fullName,
        phone,
        emergency_contact: emergencyContact,
        emergency_phone: emergencyPhone,
        student_id: studentId,
        department,
        program,
        level,
        profile_complete: true,
      };
      if (languages.trim()) data.languages = languages;
      if (preferredIndustries.trim()) data.preferred_industries = preferredIndustries;
      if (desiredRoles.trim()) data.desired_roles = desiredRoles;

      const res = await apiClient.updateUser(String(user?.id || ""), data);
      if (res.success) {
        localStorage.setItem(`student_profile_complete_${user?.id}`, "true");
        // Update user object to mark profile as complete
        if (user) {
          setUser({ ...user, profileComplete: true });
        }
        clearDraft();
        toast.success("Profile saved!");
        setTimeout(() => navigate("/student", { replace: true }), 1200);
      } else {
        toast.error(res.message || "Failed to save profile.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "personal" as const, label: "Personal", icon: User },
    { id: "academic" as const, label: "Academic", icon: Book },
    { id: "internship" as const, label: "Preferences", icon: Briefcase },
  ];

  // ── VIEW MODE ──
  if (!isEditMode) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-muted-foreground text-xs mt-1">{isProfileComplete ? "Your profile is complete" : "Your profile (click Edit to complete)"}</p>
          </div>
          <button
            onClick={() => setIsEditMode(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold text-sm flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><User className="w-4 h-4 text-primary" /> Personal</h3>
            <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{fullName}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{email}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{phone || "—"}</span></div>
            <div><span className="text-muted-foreground">Emergency Contact:</span> <span className="font-medium">{emergencyContact || "—"}</span></div>
            <div><span className="text-muted-foreground">Emergency Phone:</span> <span className="font-medium">{emergencyPhone || "—"}</span></div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Book className="w-4 h-4 text-primary" /> Academic</h3>
            <div><span className="text-muted-foreground">Student ID:</span> <span className="font-medium">{studentId}</span></div>
            <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{department || "—"}</span></div>
            <div><span className="text-muted-foreground">Program:</span> <span className="font-medium">{program || "—"}</span></div>
            <div><span className="text-muted-foreground">Level:</span> <span className="font-medium">{level} Level</span></div>
            {languages && <div><span className="text-muted-foreground">Languages:</span> <span className="font-medium">{languages}</span></div>}
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Briefcase className="w-4 h-4 text-primary" /> Preferences</h3>
            <div><span className="text-muted-foreground">Industries:</span> <span className="font-medium">{preferredIndustries || "—"}</span></div>
            <div><span className="text-muted-foreground">Desired Roles:</span> <span className="font-medium">{desiredRoles || "—"}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // ── EDIT / SETUP MODE ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isEditMode ? "Edit Profile" : "Complete Profile"}</h1>
          <p className="text-muted-foreground text-xs mt-1">
            {isEditMode ? "Update your information" : "Complete your profile to apply for internships"}
          </p>
        </div>
        {lastSaved && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap flex items-center gap-1 ml-4">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
        {completionPercentage === 100
          ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground">Profile completion</span>
            <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${completionPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PERSONAL TAB ── */}
      {activeTab === "personal" && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div>
            <label className="text-xs font-medium">Full Name *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Email</label>
            <input type="email" value={email} disabled
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-sm text-muted-foreground" />
            <p className="text-muted-foreground text-xs mt-0.5">Managed via Google SSO</p>
          </div>
          <div>
            <label className="text-xs font-medium">Phone Number *</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+233 50 123 4567"
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Emergency Contact Name *</label>
              <input type="text" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="Parent / Guardian name"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Emergency Contact Phone *</label>
              <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+233 50 000 0000"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* ── ACADEMIC TAB ── */}
      {activeTab === "academic" && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Student ID *</label>
              <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g., STU/2021/001"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Level *</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm">
                <option value="100">100 Level (1st Year)</option>
                <option value="200">200 Level (2nd Year)</option>
                <option value="300">300 Level (3rd Year)</option>
                <option value="400">400 Level (4th Year)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Department *</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm">
              <option value="">Select Department</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Software Engineering">Software Engineering</option>
              <option value="Electrical Engineering">Electrical Engineering</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
              <option value="Business Administration">Business Administration</option>
              <option value="Accounting">Accounting</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Program / Degree *</label>
            <input type="text" value={program} onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g., BSc. Computer Science"
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Languages</label>
            <input type="text" value={languages} onChange={(e) => setLanguages(e.target.value)}
              placeholder="e.g., English, Twi, French"
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
          </div>
        </div>
      )}

      {/* ── INTERNSHIP PREFERENCES TAB ── */}
      {activeTab === "internship" && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div>
            <label className="text-xs font-medium">Preferred Industries</label>
            <textarea value={preferredIndustries} onChange={(e) => setPreferredIndustries(e.target.value)}
              placeholder="e.g., FinTech, E-commerce, Healthcare, Software Development"
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Desired Roles</label>
            <textarea value={desiredRoles} onChange={(e) => setDesiredRoles(e.target.value)}
              placeholder="e.g., Software Developer, Data Analyst, Network Engineer"
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
          </div>
        </div>
      )}

      {/* Save / Navigation */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          {activeTab !== "personal" && (
            <button onClick={() => setActiveTab(activeTab === "academic" ? "personal" : "academic")}
              className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent">
              ← Back
            </button>
          )}
          {activeTab !== "internship" && (
            <button onClick={() => setActiveTab(activeTab === "personal" ? "academic" : "internship")}
              className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-accent">
              Next →
            </button>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> Save Profile</>}
        </button>
      </div>
    </div>
  );
}
