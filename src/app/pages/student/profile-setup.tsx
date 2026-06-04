import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useNavigate } from "react-router";
import { User, Book, Briefcase, Award, FileText, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function StudentProfileSetup() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "internship" | "skills">("personal");
  const [isFirstTime, setIsFirstTime] = useState(true);

  // Personal Information
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  // Academic Information
  const [studentId, setStudentId] = useState(user?.studentId || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [level, setLevel] = useState("200");
  const [currentCourses, setCurrentCourses] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [majorSubjects, setMajorSubjects] = useState("");

  // Internship Preferences
  const [preferredStartDate, setPreferredStartDate] = useState("");
  const [preferredEndDate, setPreferredEndDate] = useState("");
  const [preferredIndustries, setPreferredIndustries] = useState("");
  const [desiredRoles, setDesiredRoles] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [salaryExpectations, setSalaryExpectations] = useState("");

  // Skills & Interests
  const [technicalSkills, setTechnicalSkills] = useState("");
  const [softSkills, setSoftSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [certifications, setCertifications] = useState("");
  const [pastExperience, setPastExperience] = useState("");
  const [interests, setInterests] = useState("");

  // Form completion tracking
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load draft from localStorage on mount and auto-fill student ID from email
  useEffect(() => {
    const draftKey = `profile_setup_draft_${user?.id}`;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        setFullName(draft.fullName || "");
        setEmail(draft.email || user?.email || "");
        setPhone(draft.phone || "");
        setEmergencyContact(draft.emergencyContact || "");
        setEmergencyPhone(draft.emergencyPhone || "");
        setStudentId(draft.studentId || (user?.email ? user.email.split("@")[0] : ""));
        setDepartment(draft.department || "");
        setLevel(draft.level || "200");
        setCurrentCourses(draft.currentCourses || "");
        setCgpa(draft.cgpa || "");
        setMajorSubjects(draft.majorSubjects || "");
        setPreferredStartDate(draft.preferredStartDate || "");
        setPreferredEndDate(draft.preferredEndDate || "");
        setPreferredIndustries(draft.preferredIndustries || "");
        setDesiredRoles(draft.desiredRoles || "");
        setCareerGoals(draft.careerGoals || "");
        setSalaryExpectations(draft.salaryExpectations || "");
        setTechnicalSkills(draft.technicalSkills || "");
        setSoftSkills(draft.softSkills || "");
        setLanguages(draft.languages || "");
        setCertifications(draft.certifications || "");
        setPastExperience(draft.pastExperience || "");
        setInterests(draft.interests || "");
      } else {
        // If no draft, still auto-fill student ID from email
        if (user?.email) {
          setStudentId(user.email.split("@")[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load draft:", err);
    }
  }, [user?.id, user?.email]);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftKey = `profile_setup_draft_${user?.id}`;
    const draft = {
      fullName, email, phone, emergencyContact, emergencyPhone,
      studentId, department, level, currentCourses, cgpa, majorSubjects,
      preferredStartDate, preferredEndDate, preferredIndustries, desiredRoles, careerGoals, salaryExpectations,
      technicalSkills, softSkills, languages, certifications, pastExperience, interests,
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSaved(new Date());
    } catch (err) {
      console.error("Failed to save draft:", err);
    }
  }, [fullName, email, phone, emergencyContact, emergencyPhone, studentId, department, level, currentCourses, cgpa, majorSubjects, preferredStartDate, preferredEndDate, preferredIndustries, desiredRoles, careerGoals, salaryExpectations, technicalSkills, softSkills, languages, certifications, pastExperience, interests, user?.id]);

  useEffect(() => {
    calculateCompletion();
  }, [fullName, email, phone, emergencyContact, studentId, department, level, currentCourses, preferredStartDate, preferredIndustries, technicalSkills, softSkills]);

  const calculateCompletion = () => {
    let filled = 0;
    let total = 0;

    // Personal Info (5 fields)
    const personalFields = [fullName, email, phone, emergencyContact, emergencyPhone];
    total += 5;
    filled += personalFields.filter(f => f.trim()).length;

    // Academic Info (6 fields)
    const academicFields = [studentId, department, level, currentCourses, cgpa, majorSubjects];
    total += 6;
    filled += academicFields.filter(f => f.trim()).length;

    // Internship Preferences (5 fields)
    const internshipFields = [preferredStartDate, preferredEndDate, preferredIndustries, desiredRoles, careerGoals];
    total += 5;
    filled += internshipFields.filter(f => f.trim()).length;

    // Skills (6 fields)
    const skillsFields = [technicalSkills, softSkills, languages, certifications, pastExperience, interests];
    total += 6;
    filled += skillsFields.filter(f => f.trim()).length;

    setCompletionPercentage(Math.round((filled / total) * 100));
  };

  const clearDraft = () => {
    const draftKey = `profile_setup_draft_${user?.id}`;
    try {
      localStorage.removeItem(draftKey);
      setLastSaved(null);
    } catch (err) {
      console.error("Failed to clear draft:", err);
    }
  };

  const handleSaveProfile = async () => {
    // Validate required fields
    if (!fullName.trim() || !phone.trim() || !emergencyContact.trim() || !emergencyPhone.trim()) {
      toast.error("Please fill in all personal information fields");
      setActiveTab("personal");
      return;
    }

    if (!studentId.trim() || !department || !level) {
      toast.error("Please fill in all academic information fields");
      setActiveTab("academic");
      return;
    }

    if (!preferredStartDate || !preferredIndustries.trim()) {
      toast.error("Please fill in internship preferences");
      setActiveTab("internship");
      return;
    }

    if (!technicalSkills.trim() || !softSkills.trim()) {
      toast.error("Please fill in technical and soft skills");
      setActiveTab("skills");
      return;
    }

    setIsSaving(true);
    try {
      const updateData: Record<string, any> = {
        name: fullName,
        phone: phone || undefined,
        emergency_contact: emergencyContact || undefined,
        emergency_phone: emergencyPhone || undefined,
        student_id: studentId || undefined,
        department: department || undefined,
        level: level || undefined,
      };

      // Add optional fields only if they have values
      if (cgpa.trim()) updateData.cgpa = parseFloat(cgpa);
      if (technicalSkills.trim()) updateData.technical_skills = technicalSkills;
      if (softSkills.trim()) updateData.soft_skills = softSkills;
      if (languages.trim()) updateData.languages = languages;
      if (certifications.trim()) updateData.certifications = certifications;
      if (pastExperience.trim()) updateData.past_experience = pastExperience;
      if (interests.trim()) updateData.interests = interests;
      if (preferredStartDate) updateData.preferred_start_date = preferredStartDate;
      if (preferredEndDate) updateData.preferred_end_date = preferredEndDate;
      if (preferredIndustries.trim()) updateData.preferred_industries = preferredIndustries;
      if (desiredRoles.trim()) updateData.desired_roles = desiredRoles;
      if (careerGoals.trim()) updateData.career_goals = careerGoals;
      if (salaryExpectations.trim()) updateData.salary_expectations = salaryExpectations;
      if (majorSubjects.trim()) updateData.major_subjects = majorSubjects;
      if (currentCourses.trim()) updateData.current_courses = currentCourses;
      updateData.profile_complete = true;

      // Filter out undefined values
      Object.keys(updateData).forEach(key =>
        updateData[key] === undefined && delete updateData[key]
      );

      const res = await apiClient.updateUser(user?.id || "", updateData);
      if (res.success) {
        // Mark profile as complete in localStorage
        localStorage.setItem(`student_profile_complete_${user?.id}`, "true");

        // Clear draft after successful save
        clearDraft();

        toast.success("Profile completed successfully! Redirecting to dashboard...");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate("/student", { replace: true });
        }, 1500);
      } else {
        // Show detailed error from backend
        const errorMsg = res.message || "Failed to save profile. Please try again.";
        toast.error(errorMsg);
        console.error("Profile save error:", res);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error saving profile";
      toast.error(errorMsg);
      console.error("Profile save exception:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "academic", label: "Academic", icon: Book },
    { id: "internship", label: "Internship Prefs", icon: Briefcase },
    { id: "skills", label: "Skills & Experience", icon: Award },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Complete Profile</h1>
            <p className="text-muted-foreground text-xs mt-2">
              Complete all sections to apply for internships.
            </p>
          </div>
          {lastSaved && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap ml-4">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              Saved {Math.round((Date.now() - lastSaved.getTime()) / 1000) === 0 ? 'now' : 'just now'}
            </div>
          )}
        </div>
      </div>

      {/* Completion Progress */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {completionPercentage === 100 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
            Progress
          </h3>
          <span className="font-bold text-primary text-sm">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-blue-600 h-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Tab Navigation - Horizontal scroll on mobile */}
      <div className="flex gap-2 border-b border-border pb-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 font-medium text-xs whitespace-nowrap transition-colors border-b-2 flex items-center gap-1 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Personal Information Tab */}
        {activeTab === "personal" && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Personal Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Email *</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-sm"
                />
                <p className="text-muted-foreground text-xs mt-1">Managed via Google SSO</p>
              </div>

              <div>
                <label className="text-xs font-medium">Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 50 123 4567"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Emergency Contact Name *</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Name of emergency contact"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Emergency Contact Phone *</label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+233 50 000 0000"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Academic Information Tab */}
        {activeTab === "academic" && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Book className="w-4 h-4 text-primary" />
              Academic Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Student ID *</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g., STU/2021/001"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="">Select Department</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Business Administration">Business Administration</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Current Level *</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="100">100 Level (1st Year)</option>
                  <option value="200">200 Level (2nd Year)</option>
                  <option value="300">300 Level (3rd Year)</option>
                  <option value="400">400 Level (4th Year)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Current CGPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="3.75"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
                <p className="text-muted-foreground text-xs mt-1">Out of 4.0</p>
              </div>

              <div>
                <label className="text-xs font-medium">Current Courses/Modules</label>
                <textarea
                  value={currentCourses}
                  onChange={(e) => setCurrentCourses(e.target.value)}
                  placeholder="List your current courses (comma-separated)"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Major Subjects/Specializations</label>
                <textarea
                  value={majorSubjects}
                  onChange={(e) => setMajorSubjects(e.target.value)}
                  placeholder="e.g., Web Development, Database Design, Cloud Computing"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Internship Preferences Tab */}
        {activeTab === "internship" && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Internship Preferences
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Preferred Start Date *</label>
                <input
                  type="date"
                  value={preferredStartDate}
                  onChange={(e) => setPreferredStartDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Preferred End Date</label>
                <input
                  type="date"
                  value={preferredEndDate}
                  onChange={(e) => setPreferredEndDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Preferred Industries *</label>
                <textarea
                  value={preferredIndustries}
                  onChange={(e) => setPreferredIndustries(e.target.value)}
                  placeholder="e.g., FinTech, E-commerce, Healthcare"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Desired Roles</label>
                <textarea
                  value={desiredRoles}
                  onChange={(e) => setDesiredRoles(e.target.value)}
                  placeholder="e.g., Software Developer, Data Analyst"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Career Goals</label>
                <textarea
                  value={careerGoals}
                  onChange={(e) => setCareerGoals(e.target.value)}
                  placeholder="What do you hope to achieve?"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Salary Expectations</label>
                <input
                  type="text"
                  value={salaryExpectations}
                  onChange={(e) => setSalaryExpectations(e.target.value)}
                  placeholder="e.g., GHS 1000-2000/month"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Skills & Experience Tab */}
        {activeTab === "skills" && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Skills & Experience
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Technical Skills *</label>
                <textarea
                  value={technicalSkills}
                  onChange={(e) => setTechnicalSkills(e.target.value)}
                  placeholder="e.g., Python, JavaScript, React, Java, SQL"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Soft Skills *</label>
                <textarea
                  value={softSkills}
                  onChange={(e) => setSoftSkills(e.target.value)}
                  placeholder="e.g., Communication, Problem-solving, Team work"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Languages</label>
                <textarea
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="e.g., English (Fluent), Twi (Native)"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Certifications</label>
                <textarea
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  placeholder="e.g., Google Cloud Certified, AWS"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Past Experience</label>
                <textarea
                  value={pastExperience}
                  onChange={(e) => setPastExperience(e.target.value)}
                  placeholder="Projects, internships, or freelance work"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Interests & Hobbies</label>
                <textarea
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="What are you passionate about?"
                  rows={2}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex gap-2 sticky bottom-4 z-40">
        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-medium text-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>

      {/* Required Fields Note */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
        <p className="text-amber-900 dark:text-amber-100 text-xs font-medium">
          * Complete all required fields to activate your account
        </p>
      </div>
    </div>
  );
}
