import { z } from "zod";

export const userRoles = ["teacher", "student"] as const;
export type UserRole = (typeof userRoles)[number];

export const taskTypes = ["text_file", "quiz"] as const;
export type TaskType = (typeof taskTypes)[number];

export const questionTypes = ["multiple_choice"] as const;
export type QuestionType = (typeof questionTypes)[number];

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
  taskType: "text",
  dueDate: "text",
  fileUrl: "text",
};

export const questions = {
  id: "text",
  taskId: "text",
  questionText: "text",
  questionType: "text",
  options: "text",
  correctAnswer: "text",
  order: "integer",
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

export const questionResponses = {
  id: "text",
  submissionId: "text",
  questionId: "text",
  answer: "text",
  isCorrect: "text",
};

export const announcements = {
  id: "text",
  groupId: "text",
  teacherId: "text",
  message: "text",
  createdAt: "text",
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

export const questionSchema = z.object({
  questionText: z.string().min(1, "Question is required"),
  questionType: z.enum(questionTypes),
  options: z.string().optional(),
  correctAnswer: z.string().min(1, "Correct answer is required"),
}).passthrough();

export const insertTextTaskSchema = z.object({
  groupId: z.string(),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string(),
  taskType: z.literal("text_file").default("text_file"),
});

export const insertQuizTaskSchema = z.object({
  groupId: z.string(),
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string(),
  taskType: z.literal("quiz").default("quiz"),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
});

export const insertSubmissionSchema = z.object({
  taskId: z.string(),
  textContent: z.string().optional(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })).optional(),
});

export const insertAnnouncementSchema = z.object({
  groupId: z.string(),
  message: z.string().min(1, "Message is required"),
});

export const updateScoreSchema = z.object({
  score: z.number().min(0).max(100),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type JoinGroup = z.infer<typeof joinGroupSchema>;
export type Question = z.infer<typeof questionSchema>;
export type InsertTextTask = z.infer<typeof insertTextTaskSchema>;
export type InsertQuizTask = z.infer<typeof insertQuizTaskSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
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
  taskType: TaskType;
  dueDate: string;
  fileUrl: string | null;
}

export interface QuestionItem {
  id: string;
  taskId: string;
  questionText: string;
  questionType: QuestionType;
  options: string | null;
  correctAnswer: string;
  order: number;
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

export interface QuestionResponse {
  id: string;
  submissionId: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
}

export interface Announcement {
  id: string;
  groupId: string;
  teacherId: string;
  message: string;
  createdAt: string;
}

export interface AnnouncementWithTeacher extends Announcement {
  teacherName: string;
  isRead: boolean;
}

export interface GroupWithMembers extends Group {
  memberCount: number;
  ownerName: string;
}

export interface TaskWithSubmissionStatus extends Task {
  submissionStatus?: "not_submitted" | "submitted" | "graded";
  submissionCount?: number;
  totalStudents?: number;
  score?: number | null;
  questions?: QuestionItem[];
}

export interface SubmissionWithStudent extends Submission {
  studentName: string;
  studentEmail: string;
}

export interface AuthResponse {
  user: Omit<User, "passwordHash">;
  token: string;
}
