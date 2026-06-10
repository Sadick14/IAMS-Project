import { z } from "zod";

// --- Auth ---
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// --- Application ---
export const applicationSchema = z.object({
  company_id: z.string().min(1, "Please select a company"),
  academic_term_id: z.string().min(1, "Please select an academic term"),
  application_type: z.enum(["individual", "group"]),
  cover_letter: z.string().min(20, "Cover letter must be at least 20 characters").max(2000),
  proposed_start_date: z.string().min(1, "Please select a start date"),
});

// --- User Management ---
export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Please select a role"),
  department_id: z.string().optional(),
  staff_id: z.string().optional(),
});

// --- Term Management ---
export const termSchema = z.object({
  name: z.string().min(3, "Term name must be at least 3 characters"),
  type: z.enum(["Vacation", "Semestrial"]),
  applicationStart: z.string().min(1, "Start date is required"),
  applicationEnd: z.string().min(1, "End date is required"),
  internshipStart: z.string().min(1, "Internship start date is required"),
  internshipEnd: z.string().min(1, "Internship end date is required"),
  eligibleLevels: z.array(z.number()).min(1, "Select at least one level"),
  departments: z.array(z.string()).min(1, "Select at least one department"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type TermInput = z.infer<typeof termSchema>;
