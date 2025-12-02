import { db } from "./db";
import { users, groups, groupMembers, tasks, submissions, announcements } from "./schema";
import { eq, and, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type {
  User,
  InsertUser,
  Group,
  InsertGroup,
  Task,
  InsertTextTask,
  Submission,
  InsertSubmission,
  Announcement,
  InsertAnnouncement,
} from "@shared/schema";

export interface IStorage {
  createUser(data: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createGroup(ownerId: string, data: InsertGroup): Promise<Group>;
  getGroupById(id: string): Promise<Group | undefined>;
  getGroupByJoinCode(joinCode: string): Promise<Group | undefined>;
  getGroupsForUser(userId: string, role: string): Promise<Group[]>;
  getGroupMembers(groupId: string): Promise<User[]>;
  isMemberOfGroup(groupId: string, userId: string): Promise<boolean>;
  addMemberToGroup(groupId: string, userId: string): Promise<void>;
  removeMemberFromGroup(groupId: string, userId: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  createTask(groupId: string, data: InsertTextTask, fileUrl?: string): Promise<Task>;
  getTaskById(id: string): Promise<Task | undefined>;
  getTasksForGroup(groupId: string, userId: string, role: string): Promise<Task[]>;
  getUpcomingTasksForStudent(studentId: string): Promise<Task[]>;
  getAllTasksForStudent(studentId: string): Promise<Task[]>;
  deleteTask(id: string): Promise<void>;
  createSubmission(data: InsertSubmission, studentId: string, fileUrl?: string): Promise<Submission>;
  getSubmissionForTask(taskId: string, studentId: string): Promise<Submission | undefined>;
  getSubmissionById(id: string): Promise<Submission | undefined>;
  getSubmissionsForTask(taskId: string): Promise<Submission[]>;
  getSubmissionsForGroup(groupId: string): Promise<Submission[]>;
  getAllSubmissionsForTeacher(teacherId: string): Promise<Submission[]>;
  updateSubmissionScore(submissionId: string, score: number): Promise<Submission>;
  createAnnouncement(data: InsertAnnouncement, teacherId: string): Promise<Announcement>;
  getAnnouncementsForGroup(groupId: string, studentId?: string): Promise<Announcement[]>;
  markAnnouncementAsRead(announcementId: string, studentId: string): Promise<void>;
  getTeacherStats(teacherId: string): Promise<any>;
  getAnalyticsForTeacher(teacherId: string): Promise<any>;
  getAnalyticsForStudent(studentId: string): Promise<any>;
}

export class SQLiteStorage implements IStorage {
  async createUser(data: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const id = randomUUID();

    const [user] = await db
      .insert(users)
      .values({
        id,
        name: data.name,
        email: data.email,
        passwordHash: hashedPassword,
        role: data.role,
      })
      .returning();

    return user as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user as User | undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user as User | undefined;
  }

  async createGroup(ownerId: string, data: InsertGroup): Promise<Group> {
    const id = randomUUID();
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const [group] = await db
      .insert(groups)
      .values({
        id,
        name: data.name,
        ownerId,
        joinCode,
      })
      .returning();

    return group as Group;
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);
    return group as Group | undefined;
  }

  async getGroupByJoinCode(joinCode: string): Promise<Group | undefined> {
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.joinCode, joinCode))
      .limit(1);
    return group as Group | undefined;
  }

  async getGroupsForUser(userId: string, role: string): Promise<Group[]> {
    if (role === "teacher") {
      return await db.select().from(groups).where(eq(groups.ownerId, userId));
    } else {
      const memberGroups = await db
        .select({ groupId: groupMembers.groupId })
        .from(groupMembers)
        .where(eq(groupMembers.userId, userId));
      
      const groupIds = memberGroups.map((m) => m.groupId);
      if (groupIds.length === 0) return [];
      
      return await db.select().from(groups).where(inArray(groups.id, groupIds));
    }
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    const memberIds = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    const usersList: User[] = [];
    for (const { userId } of memberIds) {
      const user = await this.getUserById(userId);
      if (user) usersList.push(user);
    }
    return usersList;
  }

  async isMemberOfGroup(groupId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
      .limit(1);
    return !!member;
  }

  async addMemberToGroup(groupId: string, userId: string): Promise<void> {
    const exists = await this.isMemberOfGroup(groupId, userId);
    if (!exists) {
      await db.insert(groupMembers).values({
        id: randomUUID(),
        groupId,
        userId,
      });
    }
  }

  async removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async deleteGroup(groupId: string): Promise<void> {
    await db.delete(groups).where(eq(groups.id, groupId));
  }

  async createTask(groupId: string, data: InsertTextTask, fileUrl?: string): Promise<Task> {
    const id = randomUUID();

    const [task] = await db
      .insert(tasks)
      .values({
        id,
        groupId: data.groupId,
        title: data.title,
        description: data.description,
        taskType: data.taskType,
        dueDate: data.dueDate,
        fileUrl: fileUrl || null,
      })
      .returning();

    return task as Task;
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    return task as Task | undefined;
  }

  async getTasksForGroup(groupId: string, userId: string, role: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.groupId, groupId));
  }

  async getUpcomingTasksForStudent(studentId: string): Promise<Task[]> {
    const memberGroups = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, studentId));

    const groupIds = memberGroups.map((m) => m.groupId);
    if (groupIds.length === 0) return [];

    return await db.select().from(tasks).where(inArray(tasks.groupId, groupIds));
  }

  async getAllTasksForStudent(studentId: string): Promise<Task[]> {
    return await this.getUpcomingTasksForStudent(studentId);
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async createSubmission(data: InsertSubmission, studentId: string, fileUrl?: string): Promise<Submission> {
    const id = randomUUID();

    const [submission] = await db
      .insert(submissions)
      .values({
        id,
        taskId: data.taskId,
        studentId,
        textContent: data.textContent || null,
        fileUrl: fileUrl || null,
        submittedAt: new Date().toISOString(),
        score: null,
      })
      .returning();

    return submission as Submission;
  }

  async getSubmissionForTask(taskId: string, studentId: string): Promise<Submission | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(eq(submissions.taskId, taskId), eq(submissions.studentId, studentId)))
      .limit(1);
    return submission as Submission | undefined;
  }

  async getSubmissionById(id: string): Promise<Submission | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);
    return submission as Submission | undefined;
  }

  async getSubmissionsForTask(taskId: string): Promise<Submission[]> {
    return await db.select().from(submissions).where(eq(submissions.taskId, taskId));
  }

  async getSubmissionsForGroup(groupId: string): Promise<Submission[]> {
    const groupTasks = await db.select().from(tasks).where(eq(tasks.groupId, groupId));
    const taskIds = groupTasks.map((t) => t.id);
    if (taskIds.length === 0) return [];
    
    return await db.select().from(submissions).where(inArray(submissions.taskId, taskIds));
  }

  async getAllSubmissionsForTeacher(teacherId: string): Promise<Submission[]> {
    const teacherGroups = await db.select().from(groups).where(eq(groups.ownerId, teacherId));
    const groupIds = teacherGroups.map((g) => g.id);
    if (groupIds.length === 0) return [];

    const groupTasks = await db.select().from(tasks).where(inArray(tasks.groupId, groupIds));
    const taskIds = groupTasks.map((t) => t.id);
    if (taskIds.length === 0) return [];

    return await db.select().from(submissions).where(inArray(submissions.taskId, taskIds));
  }

  async updateSubmissionScore(submissionId: string, score: number): Promise<Submission> {
    await db
      .update(submissions)
      .set({ score })
      .where(eq(submissions.id, submissionId));

    const submission = await this.getSubmissionById(submissionId);
    return submission!;
  }

  async createAnnouncement(data: InsertAnnouncement, teacherId: string): Promise<Announcement> {
    const id = randomUUID();

    const [announcement] = await db
      .insert(announcements)
      .values({
        id,
        groupId: data.groupId,
        teacherId,
        message: data.message,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return announcement as Announcement;
  }

  async getAnnouncementsForGroup(groupId: string, studentId?: string): Promise<Announcement[]> {
    return await db.select().from(announcements).where(eq(announcements.groupId, groupId));
  }

  async markAnnouncementAsRead(announcementId: string, studentId: string): Promise<void> {
    // Simplified for now
  }

  async getTeacherStats(teacherId: string): Promise<any> {
    const teacherGroups = await db.select().from(groups).where(eq(groups.ownerId, teacherId));
    const groupIds = teacherGroups.map((g) => g.id);

    let totalTasks = 0;
    let pendingSubmissions = 0;

    if (groupIds.length > 0) {
      const groupTasks = await db.select().from(tasks).where(inArray(tasks.groupId, groupIds));
      totalTasks = groupTasks.length;
      const taskIds = groupTasks.map((t) => t.id);

      if (taskIds.length > 0) {
        const allSubs = await db.select().from(submissions).where(inArray(submissions.taskId, taskIds));
        pendingSubmissions = allSubs.filter((s) => s.score === null).length;
      }
    }

    return { pendingSubmissions, totalTasks };
  }

  async getAnalyticsForTeacher(teacherId: string): Promise<any> {
    const teacherGroups = await db.select().from(groups).where(eq(groups.ownerId, teacherId));
    const groupIds = teacherGroups.map((g) => g.id);

    let totalGroups = teacherGroups.length;
    let totalTasks = 0;
    let totalSubmissions = 0;
    let totalScore = 0;
    let gradedCount = 0;
    const groupStats: any[] = [];

    if (groupIds.length > 0) {
      const groupTasks = await db.select().from(tasks).where(inArray(tasks.groupId, groupIds));
      totalTasks = groupTasks.length;
      const taskIds = groupTasks.map((t) => t.id);

      if (taskIds.length > 0) {
        const allSubs = await db.select().from(submissions).where(inArray(submissions.taskId, taskIds));
        totalSubmissions = allSubs.length;
        allSubs.forEach((sub) => {
          if (sub.score !== null) {
            totalScore += sub.score;
            gradedCount++;
          }
        });
      }

      // Build group stats
      for (const group of teacherGroups) {
        const groupTaskList = groupTasks.filter((t) => t.groupId === group.id);
        const groupTaskIds = groupTaskList.map((t) => t.id);
        let groupSubmissions = 0;
        let groupScore = 0;
        let groupGradedCount = 0;

        if (groupTaskIds.length > 0) {
          const groupSubs = await db
            .select()
            .from(submissions)
            .where(inArray(submissions.taskId, groupTaskIds));
          groupSubmissions = groupSubs.length;
          groupSubs.forEach((sub) => {
            if (sub.score !== null) {
              groupScore += sub.score;
              groupGradedCount++;
            }
          });
        }

        groupStats.push({
          groupName: group.name,
          submissionRate:
            groupTaskList.length > 0 ? Math.round((groupSubmissions / (groupTaskList.length * 3)) * 100) : 0,
          averageScore: groupGradedCount > 0 ? Math.round(groupScore / groupGradedCount) : 0,
          taskCount: groupTaskList.length,
        });
      }
    }

    const submissionRate = totalTasks > 0 ? Math.round((totalSubmissions / (totalTasks * 3)) * 100) : 0;
    const averageScore = gradedCount > 0 ? Math.round(totalScore / gradedCount) : 0;

    return {
      totalGroups,
      totalTasks,
      totalSubmissions,
      averageScore,
      submissionRate,
      groupStats,
    };
  }

  async getAnalyticsForStudent(studentId: string): Promise<any> {
    const tasks = await this.getUpcomingTasksForStudent(studentId);
    const taskIds = tasks.map((t) => t.id);
    let completed = 0;
    let total = tasks.length;
    let totalScore = 0;
    let gradedCount = 0;

    if (taskIds.length > 0) {
      const subs = await db.select().from(submissions).where(inArray(submissions.taskId, taskIds));
      const studentSubs = subs.filter((s) => s.studentId === studentId);
      completed = studentSubs.length;
      studentSubs.forEach((sub) => {
        if (sub.score !== null) {
          totalScore += sub.score;
          gradedCount++;
        }
      });
    }

    return {
      totalGroups: 0,
      totalTasks: total,
      totalSubmissions: completed,
      averageScore: gradedCount > 0 ? Math.round(totalScore / gradedCount) : 0,
      submissionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      groupStats: [],
    };
  }
}

export const storage = new SQLiteStorage();
