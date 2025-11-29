import { z } from "zod";

export const userRoles = ["teacher", "student"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = {
  id: "text",
  name: "text",
  email: "text",
  passwordHash: "text",
  role: "text",
};

export const groups = {
  id: "text",
  name: "text",
  ownerId: "text",
  joinCode: "text",
};

export const groupMembers = {
  id: "text",
  groupId: "text",
  userId: "text",
};

export const tasks = {
  id: "text",
  groupId: "text",
  title: "text",
  description: "text",
  dueDate: "text",
  fileUrl: "text",
};

export const submissions = {
  id: "text",
  taskId: "text",
  studentId: "text",
  textContent: "text",
  fileUrl: "text",
  submittedAt: "text",
  score: "integer",
};

export const insertUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(userRoles),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
});

export const joinGroupSchema = z.object({
  joinCode: z.string().min(6, "Join code must be 6 characters").max(6),
});

export const insertTaskSchema = z.object({
  groupId: z.string(),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string(),
});

export const insertSubmissionSchema = z.object({
  taskId: z.string(),
  textContent: z.string().optional(),
});

export const updateScoreSchema = z.object({
  score: z.number().min(0).max(100),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type JoinGroup = z.infer<typeof joinGroupSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type UpdateScore = z.infer<typeof updateScoreSchema>;

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  joinCode: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
}

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description: string;
  dueDate: string;
  fileUrl: string | null;
}

export interface Submission {
  id: string;
  taskId: string;
  studentId: string;
  textContent: string | null;
  fileUrl: string | null;
  submittedAt: string;
  score: number | null;
}

export interface GroupWithMembers extends Group {
  memberCount: number;
  ownerName: string;
}

export interface TaskWithSubmissionStatus extends Task {
  submissionStatus?: "not_submitted" | "submitted" | "graded";
  submissionCount?: number;
  totalStudents?: number;
  score?: number | null;lo
}

export interface SubmissionWithStudent extends Submission {
  studentName: string;
  studentEmail: string;
}

export interface AuthResponse {
  user: Omit<User, "passwordHash">;
  token: string;
}
