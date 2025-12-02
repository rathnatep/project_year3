import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import {
  insertUserSchema,
  loginSchema,
  insertGroupSchema,
  joinGroupSchema,
  insertTextTaskSchema,
  insertSubmissionSchema,
  insertAnnouncementSchema,
  updateScoreSchema,
} from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

const JWT_SECRET = process.env.SESSION_SECRET || "classroom-management-secret-key";

// Use disk storage for local uploads
const multerStorage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(file.originalname.split(".").pop()?.toLowerCase() || "");
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error(`Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG, GIF, ZIP (max 10MB)`));
  },
});

const uploadErrorHandler = (err: any, req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size exceeds 10MB limit" });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message || "File upload failed" });
  }
  next();
};

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = decoded as AuthenticatedRequest["user"];
    next();
  });
}

function requireTeacher(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "teacher") {
    return res.status(403).json({ message: "Teacher access required" });
  }
  next();
}

function requireStudent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "student") {
    return res.status(403).json({ message: "Student access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  }, express.static(uploadsDir));

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser(validatedData);
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const { passwordHash, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: error.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(validatedData.password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const { passwordHash, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: error.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role === "teacher") {
        const stats = await storage.getTeacherStats(req.user.id);
        res.json(stats);
      } else {
        res.json({ pendingSubmissions: 0, totalTasks: 0 });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/groups", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const groups = await storage.getGroupsForUser(req.user!.id, req.user!.role);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(req.user!.id, validatedData);
      res.status(201).json(group);
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: error.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/groups/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await storage.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const isOwner = group.ownerId === req.user!.id;
      const isMember = await storage.isMemberOfGroup(group.id, req.user!.id);

      if (!isOwner && !isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const owner = await storage.getUserById(group.ownerId);
      res.json({ ...group, ownerName: owner?.name || "Unknown" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/groups/:id", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await storage.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this group" });
      }
      await storage.deleteGroup(req.params.id);
      res.json({ message: "Group deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/groups/:id/members/:memberId", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await storage.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      await storage.removeMemberFromGroup(req.params.id, req.params.memberId);
      res.json({ message: "Student removed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups/join", authenticateToken, requireStudent, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = joinGroupSchema.parse(req.body);
      const group = await storage.getGroupByJoinCode(validatedData.joinCode);
      if (!group) {
        return res.status(404).json({ message: "Invalid join code" });
      }

      const alreadyMember = await storage.isMemberOfGroup(group.id, req.user!.id);
      if (alreadyMember) {
        return res.status(400).json({ message: "Already a member of this group" });
      }

      await storage.addMemberToGroup(group.id, req.user!.id);
      res.json({ message: "Joined group successfully", group });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: error.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups/:id/leave", authenticateToken, requireStudent, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await storage.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      await storage.removeMemberFromGroup(req.params.id, req.user!.id);
      res.json({ message: "Left group successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/groups/:id/members", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await storage.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const isOwner = group.ownerId === req.user!.id;
      const isMember = await storage.isMemberOfGroup(group.id, req.user!.id);

      if (!isOwner && !isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const members = await storage.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/groups/:id/tasks", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await storage.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const isOwner = group.ownerId === req.user!.id;
      const isMember = await storage.isMemberOfGroup(group.id, req.user!.id);

      if (!isOwner && !isMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      const tasks = await storage.getTasksForGroup(req.params.id, req.user!.id, req.user!.role);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/groups/:groupId/tasks", authenticateToken, requireTeacher, upload.single("file"), uploadErrorHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await storage.getGroupById(req.params.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (group.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const taskData = {
        groupId: req.params.groupId,
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
        taskType: "text_file" as const,
      };

      insertTextTaskSchema.parse(taskData);

      let fileUrl: string | undefined = undefined;
      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
      }

      const task = await storage.createTask(req.params.groupId, taskData, fileUrl);
      return res.status(201).json(task);
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: error.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tasks/upcoming", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "student") {
        return res.json([]);
      }
      const tasks = await storage.getUpcomingTasksForStudent(req.user.id);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tasks/urgent", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "student") {
        return res.json([]);
      }
      const tasks = await storage.getUpcomingTasksForStudent(req.user.id);
      const now = new Date();
      const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      
      const urgentTasks = tasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        return dueDate > now && dueDate <= twelveHoursFromNow && task.submissionStatus === "not_submitted";
      });
      
      res.json(urgentTasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tasks/all", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "student") {
        return res.status(403).json({ message: "Students only" });
      }
      const tasks = await storage.getAllTasksForStudent(req.user!.id);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tasks/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await storage.getTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tasks/:id/details", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await storage.getTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const group = await storage.getGroupById(task.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const teacher = await storage.getUserById(group.ownerId);

      res.json({
        ...task,
        groupName: group.name,
        teacherName: teacher?.name || "Unknown",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await storage.getTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const group = await storage.getGroupById(task.groupId);
      if (!group || group.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storage.deleteTask(req.params.id);
      res.json({ message: "Task deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tasks/:taskId/submit", authenticateToken, requireStudent, upload.single("file"), uploadErrorHandler, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await storage.getTaskById(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const isMember = await storage.isMemberOfGroup(task.groupId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not a member of this group" });
      }

      const existingSubmission = await storage.getSubmissionForTask(req.params.taskId, req.user!.id);
      if (existingSubmission) {
        return res.status(400).json({ message: "Already submitted" });
      }

      let fileUrl: string | undefined = undefined;
      if (req.file) {
        fileUrl = `/uploads/${req.file.filename}`;
      }

      const submission = await storage.createSubmission(
        { taskId: req.params.taskId, textContent: req.body.textContent },
        req.user!.id,
        fileUrl
      );

      res.status(201).json(submission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tasks/:taskId/my-submission", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const submission = await storage.getSubmissionForTask(req.params.taskId, req.user!.id);
      res.json(submission || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tasks/:taskId/submissions", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await storage.getTaskById(req.params.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const group = await storage.getGroupById(task.groupId);
      if (!group || group.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const submissions = await storage.getSubmissionsForTask(req.params.taskId);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/submissions/all", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const submissions = await storage.getAllSubmissionsForTeacher(req.user!.id);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/submissions/pending", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allSubmissions = await storage.getAllSubmissionsForTeacher(req.user!.id);
      const pendingSubmissions = allSubmissions.filter(sub => sub.score === null);
      res.json(pendingSubmissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/submissions/:id/score", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = updateScoreSchema.parse(req.body);
      
      const submission = await storage.getSubmissionById(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const task = await storage.getTaskById(submission.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const group = await storage.getGroupById(task.groupId);
      if (!group || group.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updatedSubmission = await storage.updateSubmissionScore(req.params.id, validatedData.score);
      res.json(updatedSubmission);
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: error.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/unread-counts", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({ unreadCount: 0 });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isTeacher = req.user!.role === "teacher";
      const analytics = isTeacher 
        ? await storage.getAnalyticsForTeacher(req.user!.id)
        : await storage.getAnalyticsForStudent(req.user!.id);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analytics/export-csv", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const groupId = req.query.groupId as string;
      
      if (!groupId) {
        return res.status(400).json({ message: "Group ID is required" });
      }

      const group = await storage.getGroupById(groupId);
      if (!group || group.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const submissions = await storage.getSubmissionsForGroup(groupId);
      
      let csv = "Task,Student Name,Student Email,Submitted At,Score\n";
      submissions.forEach((sub) => {
        const score = sub.score !== null ? sub.score : "Not Graded";
        const submitted = new Date(sub.submittedAt).toLocaleString();
        csv += `"${sub.taskTitle}","${sub.studentName}","${sub.studentEmail}","${submitted}","${score}"\n`;
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${group.name}-grades.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/announcements", authenticateToken, requireTeacher, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      
      const group = await storage.getGroupById(validatedData.groupId);
      if (!group || group.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const announcement = await storage.createAnnouncement(
        { groupId: validatedData.groupId, message: validatedData.message },
        req.user!.id
      );
      res.status(201).json(announcement);
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ message: error.errors[0]?.message || "Validation error" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/announcements/:groupId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const group = await storage.getGroupById(req.params.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const announcements = await storage.getAnnouncementsForGroup(req.params.groupId, req.user?.role === "student" ? req.user.id : undefined);
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/announcements/:announcementId/read", authenticateToken, requireStudent, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.markAnnouncementAsRead(req.params.announcementId, req.user!.id);
      res.json({ message: "Marked as read" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
