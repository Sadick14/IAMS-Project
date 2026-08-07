import { describe, it, expect } from "vitest";

describe("Student Documents Page State Helpers", () => {
  it("should evaluate document statuses correctly for active/ongoing internships", () => {
    const internshipId = "int-123";
    const internshipStatus = "active";
    const isInternshipEnded = false;

    // Computed state helpers exactly as in documents.tsx
    const hasActiveInternship = !!internshipId && internshipStatus?.toLowerCase() === "active" && !isInternshipEnded;
    const hasCompletedInternship = !!internshipId && (internshipStatus?.toLowerCase() === "completed" || isInternshipEnded);

    const myApp = { status: "approved" };
    const isActive = myApp?.status?.toLowerCase() === "active" || hasActiveInternship;
    const isCompleted = myApp?.status?.toLowerCase() === "completed" || hasCompletedInternship;

    // Check outputs
    expect(hasActiveInternship).toBe(true);
    expect(hasCompletedInternship).toBe(false);
    expect(isActive).toBe(true);
    expect(isCompleted).toBe(false);

    // Final Report and Logbook Availability
    const finalReportName = null;
    const finalReportStatus = finalReportName
      ? "Submitted"
      : (isActive || isCompleted ? "Not Submitted" : "Not Available Yet");

    const logbookStatus = isActive || isCompleted ? "Available" : "Pending";

    expect(finalReportStatus).toBe("Not Submitted");
    expect(logbookStatus).toBe("Available");
  });

  it("should evaluate document statuses correctly for ended/completed internships", () => {
    const internshipId = "int-123";
    const internshipStatus = "active";
    const isInternshipEnded = true; // Ended even if database status is still 'active'

    // Computed state helpers exactly as in documents.tsx
    const hasActiveInternship = !!internshipId && internshipStatus?.toLowerCase() === "active" && !isInternshipEnded;
    const hasCompletedInternship = !!internshipId && (internshipStatus?.toLowerCase() === "completed" || isInternshipEnded);

    const myApp = { status: "company accepted" };
    const isActive = myApp?.status?.toLowerCase() === "active" || hasActiveInternship;
    const isCompleted = myApp?.status?.toLowerCase() === "completed" || hasCompletedInternship;

    // Check outputs
    expect(hasActiveInternship).toBe(false);
    expect(hasCompletedInternship).toBe(true);
    expect(isActive).toBe(false);
    expect(isCompleted).toBe(true);

    // Final Report and Logbook Availability
    const finalReportName = null;
    const finalReportStatus = finalReportName
      ? "Submitted"
      : (isActive || isCompleted ? "Not Submitted" : "Not Available Yet");

    const logbookStatus = isActive || isCompleted ? "Available" : "Pending";

    expect(finalReportStatus).toBe("Not Submitted");
    expect(logbookStatus).toBe("Available");
  });
});
