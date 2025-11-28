#!/bin/bash

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CLASSROOM MANAGEMENT SYSTEM - CODE GUIDE${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Backend Configuration Files
echo -e "${YELLOW}[BACKEND CONFIG FILES]${NC}"
echo -e "${GREEN}server/index.ts${NC} - Main Express server entry point with auth middleware, routes setup, and database initialization"
echo -e "${GREEN}server/storage.ts${NC} - In-memory storage interface (IStorage) with all CRUD operations for users, groups, tasks, submissions"
echo -e "${GREEN}server/routes.ts${NC} - All REST API endpoints (auth, groups, tasks, submissions, analytics) with Zod validation"
echo -e "${GREEN}shared/schema.ts${NC} - Drizzle ORM schema definitions, insert/select types for all entities\n"

# Frontend Configuration Files
echo -e "${YELLOW}[FRONTEND CONFIG FILES]${NC}"
echo -e "${GREEN}client/src/App.tsx${NC} - Main app component with routing, auth context, query client setup"
echo -e "${GREEN}client/src/index.css${NC} - Global CSS with color variables for light/dark modes (primary, warning, success, overdue, etc.)"
echo -e "${GREEN}tailwind.config.ts${NC} - Tailwind config extending colors for status indicators"
echo -e "${GREEN}vite.config.ts${NC} - Vite build config with React plugin and path aliases\n"

# Frontend Pages
echo -e "${YELLOW}[FRONTEND PAGES]${NC}"
echo -e "${GREEN}pages/auth-page.tsx${NC} - Login and signup forms with JWT token handling"
echo -e "${GREEN}pages/teacher-dashboard.tsx${NC} - Teacher home showing pending submissions and active tasks"
echo -e "${GREEN}pages/student-dashboard.tsx${NC} - Student home showing task status and upcoming assignments"
echo -e "${GREEN}pages/teacher-groups.tsx${NC} - Teacher group management (create, view, delete groups)"
echo -e "${GREEN}pages/student-groups.tsx${NC} - Student groups page (join with code)"
echo -e "${GREEN}pages/group-detail.tsx${NC} - Group members and tasks view"
echo -e "${GREEN}pages/task-form.tsx${NC} - Create/edit tasks with file attachments and deadlines"
echo -e "${GREEN}pages/all-tasks.tsx${NC} - All tasks view for a group with filtering"
echo -e "${GREEN}pages/task-submission.tsx${NC} - Student task submission form"
echo -e "${GREEN}pages/all-submissions.tsx${NC} - Teacher view of all submissions for a task"
echo -e "${GREEN}pages/submission-review.tsx${NC} - Grade individual submissions"
echo -e "${GREEN}pages/analytics-dashboard.tsx${NC} - Statistics and charts for performance analysis\n"

# Frontend Components
echo -e "${YELLOW}[FRONTEND COMPONENTS]${NC}"
echo -e "${GREEN}components/deadline-reminder.tsx${NC} - Alert component showing overdue and due-soon tasks"
echo -e "${GREEN}components/ui/button.tsx${NC} - Shadcn button component"
echo -e "${GREEN}components/ui/card.tsx${NC} - Shadcn card container"
echo -e "${GREEN}components/ui/form.tsx${NC} - React Hook Form wrapper"
echo -e "${GREEN}components/ui/input.tsx${NC} - Input field component"
echo -e "${GREEN}components/ui/badge.tsx${NC} - Status badge component\n"

# Frontend Utilities
echo -e "${YELLOW}[FRONTEND UTILITIES]${NC}"
echo -e "${GREEN}lib/auth.ts${NC} - Auth context and user management"
echo -e "${GREEN}lib/queryClient.ts${NC} - TanStack Query setup with request helper"
echo -e "${GREEN}hooks/use-toast.ts${NC} - Toast notification hook\n"

# Key Features Summary
echo -e "${YELLOW}[KEY FEATURES]${NC}"
echo -e "${GREEN}✓ JWT Authentication${NC} - Secure login with token storage"
echo -e "${GREEN}✓ Role-Based Access${NC} - Teachers and students have different permissions"
echo -e "${GREEN}✓ Group Management${NC} - Auto-generated join codes for students"
echo -e "${GREEN}✓ Task Management${NC} - Create tasks with deadlines and file attachments"
echo -e "${GREEN}✓ Submissions${NC} - Students submit work, teachers grade with feedback"
echo -e "${GREEN}✓ File Storage${NC} - Local file system storage for attachments"
echo -e "${GREEN}✓ Deadline Tracking${NC} - Color-coded alerts for overdue/urgent tasks"
echo -e "${GREEN}✓ Analytics${NC} - Charts showing submission rates and grades"
echo -e "${GREEN}✓ Data Preservation${NC} - SET NULL foreign keys preserve audit trails\n"

# Database Schema
echo -e "${YELLOW}[DATABASE ENTITIES]${NC}"
echo -e "${GREEN}users${NC} - id, email, name, role (teacher/student), password hash"
echo -e "${GREEN}groups${NC} - id, name, join_code, teacher_id, created_at"
echo -e "${GREEN}group_members${NC} - id, group_id, student_id, joined_at"
echo -e "${GREEN}tasks${NC} - id, group_id, title, description, due_date, file_attachment"
echo -e "${GREEN}submissions${NC} - id, task_id, student_id, submitted_at, file_attachment"
echo -e "${GREEN}grades${NC} - id, submission_id, score, feedback, graded_at\n"

# API Endpoints Summary
echo -e "${YELLOW}[API ENDPOINTS]${NC}"
echo -e "${GREEN}Authentication:${NC} POST /api/auth/register, POST /api/auth/login, GET /api/auth/me"
echo -e "${GREEN}Groups:${NC} GET /api/groups, POST /api/groups, DELETE /api/groups/:id, POST /api/groups/join"
echo -e "${GREEN}Tasks:${NC} GET /api/tasks, POST /api/tasks, GET /api/tasks/:id, DELETE /api/tasks/:id"
echo -e "${GREEN}Submissions:${NC} POST /api/submissions, GET /api/submissions, PATCH /api/submissions/:id/grade"
echo -e "${GREEN}Analytics:${NC} GET /api/analytics\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Command to run locally:${NC}"
echo -e "${GREEN}npm run dev${NC} - Start development server (http://localhost:5000)"
echo -e "${BLUE}========================================${NC}\n"
