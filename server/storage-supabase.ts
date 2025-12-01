import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import type {
  User,
  Group,
  GroupMember,
  Task,
  Submission,
  Announcement,
  AnnouncementWithTeacher,
  InsertUser,
  InsertGroup,
  InsertTask,
  InsertSubmission,
  InsertAnnouncement,
  GroupWithMembers,
  TaskWithSubmissionStatus,
  SubmissionWithStudent,
} from "@shared/schema";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;

  createGroup(ownerId: string, group: InsertGroup): Promise<Group>;
  getGroupById(id: string): Promise<Group | undefined>;
  getGroupByJoinCode(joinCode: string): Promise<Group | undefined>;
  getGroupsForUser(userId: string, role: string): Promise<GroupWithMembers[]>;
  deleteGroup(id: string): Promise<void>;

  addMemberToGroup(groupId: string, userId: string): Promise<GroupMember>;
  removeMemberFromGroup(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<{ id: string; userId: string; name: string; email: string }[]>;
  isMemberOfGroup(groupId: string, userId: string): Promise<boolean>;

  createTask(task: InsertTask, fileUrl?: string): Promise<Task>;
  getTaskById(id: string): Promise<Task | undefined>;
  getTasksForGroup(groupId: string, userId: string, role: string): Promise<TaskWithSubmissionStatus[]>;
  deleteTask(id: string): Promise<void>;

  createSubmission(submission: InsertSubmission, studentId: string, fileUrl?: string): Promise<Submission>;
  getSubmissionById(id: string): Promise<Submission | undefined>;
  getSubmissionForTask(taskId: string, studentId: string): Promise<Submission | undefined>;
  getSubmissionsForTask(taskId: string): Promise<SubmissionWithStudent[]>;
  getAllSubmissionsForTeacher(teacherId: string): Promise<(SubmissionWithStudent & { taskTitle: string; groupName: string; taskId: string })[]>;
  updateSubmissionScore(id: string, score: number): Promise<Submission>;

  getTeacherStats(teacherId: string): Promise<{ pendingSubmissions: number; totalTasks: number }>;
  getUpcomingTasksForStudent(studentId: string): Promise<TaskWithSubmissionStatus[]>;

  getUnreadSubmissionCount(teacherId: string): Promise<number>;
  getUnreadTaskCount(studentId: string): Promise<number>;

  createAnnouncement(announcement: InsertAnnouncement, teacherId: string): Promise<Announcement>;
  getAnnouncementsForGroup(groupId: string, studentId?: string): Promise<AnnouncementWithTeacher[]>;
  markAnnouncementAsRead(announcementId: string, studentId: string): Promise<void>;
}

export class SupabaseStorage implements IStorage {
  async createUser(userData: InsertUser): Promise<User> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert({
        id,
        name: userData.name,
        email: userData.email,
        password_hash: passwordHash,
        role: userData.role,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash: data.password_hash,
      role: data.role,
    };
  }

  async getUserById(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash, role")
      .eq("id", id)
      .single();

    if (error) return undefined;
    return data
      ? {
          id: data.id,
          name: data.name,
          email: data.email,
          passwordHash: data.password_hash,
          role: data.role,
        }
      : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, password_hash, role")
      .eq("email", email)
      .single();

    if (error) return undefined;
    return data
      ? {
          id: data.id,
          name: data.name,
          email: data.email,
          passwordHash: data.password_hash,
          role: data.role,
        }
      : undefined;
  }

  async createGroup(ownerId: string, groupData: InsertGroup): Promise<Group> {
    const id = randomUUID();
    let joinCode = generateJoinCode();

    let existing = await this.getGroupByJoinCode(joinCode);
    while (existing) {
      joinCode = generateJoinCode();
      existing = await this.getGroupByJoinCode(joinCode);
    }

    const { data, error } = await supabase
      .from("groups")
      .insert({
        id,
        name: groupData.name,
        owner_id: ownerId,
        join_code: joinCode,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      ownerId: data.owner_id,
      joinCode: data.join_code,
    };
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, owner_id, join_code")
      .eq("id", id)
      .single();

    if (error) return undefined;
    return data
      ? {
          id: data.id,
          name: data.name,
          ownerId: data.owner_id,
          joinCode: data.join_code,
        }
      : undefined;
  }

  async getGroupByJoinCode(joinCode: string): Promise<Group | undefined> {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, owner_id, join_code")
      .eq("join_code", joinCode)
      .single();

    if (error) return undefined;
    return data
      ? {
          id: data.id,
          name: data.name,
          ownerId: data.owner_id,
          joinCode: data.join_code,
        }
      : undefined;
  }

  async getGroupsForUser(userId: string, role: string): Promise<GroupWithMembers[]> {
    if (role === "teacher") {
      const { data, error } = await supabase
        .from("groups")
        .select(`
          id, name, owner_id, join_code,
          group_members(count)
        `)
        .eq("owner_id", userId)
        .order("name");

      if (error) throw error;
      return (data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        ownerId: g.owner_id,
        joinCode: g.join_code,
        ownerName: "",
        memberCount: g.group_members?.[0]?.count || 0,
      }));
    } else {
      const { data, error } = await supabase
        .from("group_members")
        .select(`
          group_id,
          groups(id, name, owner_id, join_code, users(name))
        `)
        .eq("user_id", userId)
        .order("groups(name)");

      if (error) throw error;
      return (data || []).map((gm: any) => ({
        id: gm.groups.id,
        name: gm.groups.name,
        ownerId: gm.groups.owner_id,
        joinCode: gm.groups.join_code,
        ownerName: gm.groups.users?.name || "",
        memberCount: 0,
      }));
    }
  }

  async deleteGroup(id: string): Promise<void> {
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) throw error;
  }

  async addMemberToGroup(groupId: string, userId: string): Promise<GroupMember> {
    const id = randomUUID();
    const { data, error } = await supabase
      .from("group_members")
      .insert({ id, group_id: groupId, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      groupId: data.group_id,
      userId: data.user_id,
    };
  }

  async removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async getGroupMembers(
    groupId: string
  ): Promise<{ id: string; userId: string; name: string; email: string }[]> {
    const { data, error } = await supabase
      .from("group_members")
      .select("id, user_id, users(name, email)")
      .eq("group_id", groupId);

    if (error) throw error;
    return (data || []).map((gm: any) => ({
      id: gm.id,
      userId: gm.user_id,
      name: gm.users?.name || "",
      email: gm.users?.email || "",
    }));
  }

  async isMemberOfGroup(groupId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    return !error && !!data;
  }

  async createTask(task: InsertTask, fileUrl?: string): Promise<Task> {
    const id = randomUUID();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        id,
        group_id: task.groupId,
        title: task.title,
        description: task.description,
        task_type: task.taskType,
        due_date: task.dueDate,
        file_url: fileUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      groupId: data.group_id,
      title: data.title,
      description: data.description,
      taskType: data.task_type,
      dueDate: data.due_date,
      fileUrl: data.file_url,
    };
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, group_id, title, description, task_type, due_date, file_url")
      .eq("id", id)
      .single();

    if (error) return undefined;
    return data
      ? {
          id: data.id,
          groupId: data.group_id,
          title: data.title,
          description: data.description,
          taskType: data.task_type,
          dueDate: data.due_date,
          fileUrl: data.file_url,
        }
      : undefined;
  }

  async getTasksForGroup(groupId: string, userId: string, role: string): Promise<TaskWithSubmissionStatus[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        id, group_id, title, description, task_type, due_date, file_url,
        submissions(id, student_id, score)
      `
      )
      .eq("group_id", groupId)
      .order("due_date", { ascending: true });

    if (error) throw error;

    return (data || []).map((task: any) => {
      const submission = task.submissions?.find((s: any) => s.student_id === userId);
      let submissionStatus = "not_submitted";
      if (submission) {
        submissionStatus = submission.score !== null ? "graded" : "submitted";
      }

      return {
        id: task.id,
        groupId: task.group_id,
        title: task.title,
        description: task.description,
        taskType: task.task_type,
        dueDate: task.due_date,
        fileUrl: task.file_url,
        submissionStatus,
        submissionCount: task.submissions?.length || 0,
        totalStudents: 0,
        score: submission?.score || null,
      };
    });
  }

  async deleteTask(id: string): Promise<void> {
    const { data: submissionCount, error: countError } = await supabase
      .from("submissions")
      .select("id", { count: "exact" })
      .eq("task_id", id);

    if (countError) throw countError;
    if ((submissionCount?.length || 0) > 0) {
      throw new Error("Cannot delete task with student submissions. Please contact administrator.");
    }

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  }

  async createSubmission(
    submissionData: InsertSubmission,
    studentId: string,
    fileUrl?: string
  ): Promise<Submission> {
    const id = randomUUID();
    const submittedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        id,
        task_id: submissionData.taskId,
        student_id: studentId,
        text_content: submissionData.textContent || null,
        file_url: fileUrl || null,
        submitted_at: submittedAt,
        score: null,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      taskId: data.task_id,
      studentId: data.student_id,
      textContent: data.text_content,
      fileUrl: data.file_url,
      submittedAt: data.submitted_at,
      score: data.score,
    };
  }

  async getSubmissionById(id: string): Promise<Submission | undefined> {
    const { data, error } = await supabase
      .from("submissions")
      .select("id, task_id, student_id, text_content, file_url, submitted_at, score")
      .eq("id", id)
      .single();

    if (error) return undefined;
    return data
      ? {
          id: data.id,
          taskId: data.task_id,
          studentId: data.student_id,
          textContent: data.text_content,
          fileUrl: data.file_url,
          submittedAt: data.submitted_at,
          score: data.score,
        }
      : undefined;
  }

  async getSubmissionForTask(taskId: string, studentId: string): Promise<Submission | undefined> {
    const { data, error } = await supabase
      .from("submissions")
      .select("id, task_id, student_id, text_content, file_url, submitted_at, score")
      .eq("task_id", taskId)
      .eq("student_id", studentId)
      .single();

    if (error) return undefined;
    return data
      ? {
          id: data.id,
          taskId: data.task_id,
          studentId: data.student_id,
          textContent: data.text_content,
          fileUrl: data.file_url,
          submittedAt: data.submitted_at,
          score: data.score,
        }
      : undefined;
  }

  async getSubmissionsForTask(taskId: string): Promise<SubmissionWithStudent[]> {
    const { data, error } = await supabase
      .from("submissions")
      .select("id, task_id, student_id, text_content, file_url, submitted_at, score, users(name, email)")
      .eq("task_id", taskId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((s: any) => ({
      id: s.id,
      taskId: s.task_id,
      studentId: s.student_id,
      textContent: s.text_content,
      fileUrl: s.file_url,
      submittedAt: s.submitted_at,
      score: s.score,
      studentName: s.users?.name || "",
      studentEmail: s.users?.email || "",
    }));
  }

  async getAllSubmissionsForTeacher(
    teacherId: string
  ): Promise<(SubmissionWithStudent & { taskTitle: string; groupName: string; taskId: string })[]> {
    const { data, error } = await supabase
      .from("submissions")
      .select(
        `
        id, task_id, student_id, text_content, file_url, submitted_at, score,
        users(name, email),
        tasks(title, group_id, groups(name))
      `
      )
      .eq("tasks.groups.owner_id", teacherId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((s: any) => ({
      id: s.id,
      taskId: s.task_id,
      studentId: s.student_id,
      textContent: s.text_content,
      fileUrl: s.file_url,
      submittedAt: s.submitted_at,
      score: s.score,
      studentName: s.users?.name || "",
      studentEmail: s.users?.email || "",
      taskTitle: s.tasks?.title || "",
      groupName: s.tasks?.groups?.name || "",
    }));
  }

  async updateSubmissionScore(id: string, score: number): Promise<Submission> {
    const { data, error } = await supabase
      .from("submissions")
      .update({ score })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      taskId: data.task_id,
      studentId: data.student_id,
      textContent: data.text_content,
      fileUrl: data.file_url,
      submittedAt: data.submitted_at,
      score: data.score,
    };
  }

  async getTeacherStats(
    teacherId: string
  ): Promise<{ pendingSubmissions: number; totalTasks: number }> {
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, groups(owner_id)")
      .eq("groups.owner_id", teacherId);

    if (tasksError) throw tasksError;

    const taskIds = (tasks || []).map((t: any) => t.id);
    if (taskIds.length === 0) {
      return { pendingSubmissions: 0, totalTasks: 0 };
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, score")
      .in("task_id", taskIds);

    if (submissionsError) throw submissionsError;

    const pendingSubmissions = (submissions || []).filter((s: any) => s.score === null).length;

    return {
      pendingSubmissions,
      totalTasks: taskIds.length,
    };
  }

  async getUpcomingTasksForStudent(studentId: string): Promise<TaskWithSubmissionStatus[]> {
    const { data: groupMembers, error: membersError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", studentId);

    if (membersError) throw membersError;

    const groupIds = (groupMembers || []).map((gm: any) => gm.group_id);
    if (groupIds.length === 0) return [];

    const now = new Date();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, group_id, title, description, task_type, due_date, file_url, submissions(score)")
      .in("group_id", groupIds)
      .gt("due_date", now.toISOString())
      .order("due_date", { ascending: true });

    if (error) throw error;

    return (data || []).map((task: any) => {
      const submission = task.submissions?.[0];
      let submissionStatus = "not_submitted";
      if (submission) {
        submissionStatus = submission.score !== null ? "graded" : "submitted";
      }

      return {
        id: task.id,
        groupId: task.group_id,
        title: task.title,
        description: task.description,
        taskType: task.task_type,
        dueDate: task.due_date,
        fileUrl: task.file_url,
        submissionStatus,
      };
    });
  }

  async getUnreadSubmissionCount(teacherId: string): Promise<number> {
    // This is a simplified version - full implementation would track read status
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, groups(owner_id)")
      .eq("groups.owner_id", teacherId);

    if (tasksError) return 0;

    const taskIds = (tasks || []).map((t: any) => t.id);
    if (taskIds.length === 0) return 0;

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id", { count: "exact" })
      .in("task_id", taskIds)
      .is("score", null);

    if (submissionsError) return 0;
    return submissions?.length || 0;
  }

  async getUnreadTaskCount(studentId: string): Promise<number> {
    const { data: groupMembers, error: membersError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", studentId);

    if (membersError) return 0;

    const groupIds = (groupMembers || []).map((gm: any) => gm.group_id);
    if (groupIds.length === 0) return 0;

    const now = new Date();
    const { data, error } = await supabase
      .from("tasks")
      .select("id")
      .in("group_id", groupIds)
      .gt("due_date", now.toISOString());

    if (error) return 0;
    return data?.length || 0;
  }

  async createAnnouncement(
    announcement: InsertAnnouncement,
    teacherId: string
  ): Promise<Announcement> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        id,
        group_id: announcement.groupId,
        teacher_id: teacherId,
        message: announcement.message,
        created_at: createdAt,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      groupId: data.group_id,
      teacherId: data.teacher_id,
      message: data.message,
    };
  }

  async getAnnouncementsForGroup(groupId: string, studentId?: string): Promise<AnnouncementWithTeacher[]> {
    const { data, error } = await supabase
      .from("announcements")
      .select("id, group_id, teacher_id, message, created_at, users(name)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    let announcements = (data || []).map((a: any) => ({
      id: a.id,
      groupId: a.group_id,
      teacherId: a.teacher_id,
      message: a.message,
      teacherName: a.users?.name || "Unknown",
    }));

    if (studentId) {
      const { data: readData } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("student_id", studentId);

      const readIds = new Set((readData || []).map((r: any) => r.announcement_id));
      announcements = announcements.map((a: any) => ({
        ...a,
        isRead: readIds.has(a.id),
      }));
    }

    return announcements;
  }

  async markAnnouncementAsRead(announcementId: string, studentId: string): Promise<void> {
    await supabase.from("announcement_reads").insert({
      id: randomUUID(),
      announcement_id: announcementId,
      student_id: studentId,
    });
  }
}

export const storage = new SupabaseStorage();
