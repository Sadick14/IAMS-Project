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
      const updateData = {
        name: fullName,
        phone,
        emergency_contact: emergencyContact,
        emergency_phone: emergencyPhone,
        student_id: studentId,
        department,
        level,
        cgpa: parseFloat(cgpa) || null,
        technical_skills: technicalSkills,
        soft_skills: softSkills,
        languages,
        certifications,
        past_experience: pastExperience,
        interests,
        preferred_start_date: preferredStartDate,
        preferred_end_date: preferredEndDate,
        preferred_industries: preferredIndustries,
        desired_roles: desiredRoles,
        career_goals: careerGoals,
        salary_expectations: salaryExpectations,
        major_subjects: majorSubjects,
        current_courses: currentCourses,
        profile_complete: true,
      };

      const res = await apiClient.updateUser(user?.id || "", updateData);
      if (res.success) {
        // Mark profile as complete in localStorage
        localStorage.setItem(`student_profile_complete_${user?.id}`, "true");

        toast.success("Profile completed successfully! Redirecting to dashboard...");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate("/student", { replace: true });
        }, 1500);
      } else {
        toast.error("Failed to save profile");
      }
    } catch (error) {
      toast.error("Error saving profile");
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <h1 className="text-3xl font-bold">Complete Your Internship Profile</h1>
        <p className="text-muted-foreground mt-2">
          Before you can apply for internships, we need you to complete your profile. This helps us match you with the best opportunities based on your skills, interests, and preferences.
        </p>
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-300 dark:border-blue-700">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            ℹ️ This is a required step to activate your account. Your information will be used to recommend suitable internships and help supervisors understand your background.
          </p>
        </div>
      </div>

      {/* Completion Progress */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            {completionPercentage === 100 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
            Profile Completion
          </h3>
          <span className="text-lg font-bold text-primary">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-blue-600 h-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-muted-foreground text-sm mt-2">
          {completionPercentage === 100
            ? "✓ Your profile is complete!"
            : `Complete ${100 - completionPercentage}% more to unlock better matching`}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4 inline mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Personal Information Tab */}
        {activeTab === "personal" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Email *</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-muted/30"
                    style={{ fontSize: "0.9rem" }}
                  />
                  <p className="text-muted-foreground text-xs mt-1">Managed via Google SSO</p>
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Phone Number *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 50 123 4567"
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Emergency Contact Name *</label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Name of emergency contact"
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Emergency Contact Phone *</label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="+233 50 000 0000"
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Academic Information Tab */}
        {activeTab === "academic" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Book className="w-5 h-5 text-primary" />
                Academic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Student ID *</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g., STU/2021/001"
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
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
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Current Level *</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  >
                    <option value="100">100 Level (1st Year)</option>
                    <option value="200">200 Level (2nd Year)</option>
                    <option value="300">300 Level (3rd Year)</option>
                    <option value="400">400 Level (4th Year)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Current CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    placeholder="3.75"
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                  <p className="text-muted-foreground text-xs mt-1">Out of 4.0</p>
                </div>

                <div className="md:col-span-2">
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Current Courses/Modules</label>
                  <textarea
                    value={currentCourses}
                    onChange={(e) => setCurrentCourses(e.target.value)}
                    placeholder="List your current courses (comma-separated)"
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Major Subjects/Specializations</label>
                  <textarea
                    value={majorSubjects}
                    onChange={(e) => setMajorSubjects(e.target.value)}
                    placeholder="e.g., Web Development, Database Design, Cloud Computing"
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Internship Preferences Tab */}
        {activeTab === "internship" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Internship Preferences
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Preferred Start Date *</label>
                  <input
                    type="date"
                    value={preferredStartDate}
                    onChange={(e) => setPreferredStartDate(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Preferred End Date</label>
                  <input
                    type="date"
                    value={preferredEndDate}
                    onChange={(e) => setPreferredEndDate(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Preferred Industries *</label>
                  <textarea
                    value={preferredIndustries}
                    onChange={(e) => setPreferredIndustries(e.target.value)}
                    placeholder="e.g., FinTech, E-commerce, Healthcare, Telecommunications"
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Desired Roles</label>
                  <textarea
                    value={desiredRoles}
                    onChange={(e) => setDesiredRoles(e.target.value)}
                    placeholder="e.g., Software Developer, Data Analyst, Business Analyst"
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Career Goals</label>
                  <textarea
                    value={careerGoals}
                    onChange={(e) => setCareerGoals(e.target.value)}
                    placeholder="What do you hope to achieve during this internship?"
                    rows={3}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Salary Expectations</label>
                  <input
                    type="text"
                    value={salaryExpectations}
                    onChange={(e) => setSalaryExpectations(e.target.value)}
                    placeholder="e.g., GHS 1000-2000 per month (or negotiable)"
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skills & Experience Tab */}
        {activeTab === "skills" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Skills & Experience
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Technical Skills *</label>
                  <textarea
                    value={technicalSkills}
                    onChange={(e) => setTechnicalSkills(e.target.value)}
                    placeholder="e.g., Python, JavaScript, React, Java, SQL, Git, Linux"
                    rows={3}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Soft Skills *</label>
                  <textarea
                    value={softSkills}
                    onChange={(e) => setSoftSkills(e.target.value)}
                    placeholder="e.g., Communication, Problem-solving, Team work, Leadership, Time management"
                    rows={3}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Languages</label>
                  <textarea
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="e.g., English (Fluent), Twi (Native), French (Intermediate)"
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Certifications & Achievements</label>
                  <textarea
                    value={certifications}
                    onChange={(e) => setCertifications(e.target.value)}
                    placeholder="e.g., Google Cloud Certified, AWS Solutions Architect, etc."
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Past Work/Project Experience</label>
                  <textarea
                    value={pastExperience}
                    onChange={(e) => setPastExperience(e.target.value)}
                    placeholder="Describe relevant projects, internships, or freelance work"
                    rows={3}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem" }} className="font-medium">Personal Interests & Hobbies</label>
                  <textarea
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="What are you passionate about? Any hobbies or interests?"
                    rows={2}
                    className="w-full mt-1.5 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex gap-3 justify-end sticky bottom-6">
        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Profile
            </>
          )}
        </button>
      </div>

      {/* Required Fields Note */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
        <p className="text-amber-900 dark:text-amber-100 text-sm font-medium">
          * All required fields must be completed to activate your account and access internship applications
        </p>
      </div>
    </div>
  );
}
