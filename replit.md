# Classroom Management System

## Overview

A full-stack classroom management platform enabling teachers to create groups, assign tasks with file attachments, and review student submissions. Students can join groups via unique codes, submit assignments with text and file uploads, and receive scores. Built with Express.js backend, React frontend using shadcn/ui components, and SQLite database with local file storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**
- React 18 with TypeScript
- Vite as build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and data fetching
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design system

**Design System**
- Material Design 3 principles inspired by Google Classroom and Notion
- Custom CSS variables for theming (light/dark mode support)
- Typography: Inter/Work Sans for headings, system fonts for body, JetBrains Mono for code
- Spacing scale based on Tailwind units (2, 4, 6, 8, 12, 16)
- "New York" shadcn style variant with custom elevation system

**State Management**
- Authentication state managed via React Context (`AuthContext`)
- JWT tokens stored in localStorage
- Server state cached and synchronized via TanStack Query
- Form state handled by react-hook-form with Zod validation

**Routing Structure**
- `/auth` - Login and registration
- `/dashboard` - Role-based dashboard (teacher vs student views)
- `/groups/:id` - Group detail page with members and tasks
- `/tasks/new/:groupId` - Create new task
- `/tasks/edit/:taskId` - Edit existing task
- `/tasks/:taskId/submit` - Student submission form
- `/tasks/:taskId/review` - Teacher submission review
- `/submissions` - All submissions overview (teacher only)

**Component Organization**
- Page components in `client/src/pages/`
- Reusable UI components in `client/src/components/ui/` (shadcn)
- Layout components like `AppSidebar` and `ThemeToggle`
- Protected routes wrapped with authentication checks

### Backend Architecture

**Technology Stack**
- Express.js as web framework
- Better-sqlite3 for database (synchronous SQLite operations)
- JWT for authentication
- bcrypt.js for password hashing
- Multer for multipart/form-data file uploads
- TypeScript for type safety

**Database Schema**
- `users` - User accounts with role (teacher/student)
- `groups` - Classroom groups with unique join codes
- `group_members` - Many-to-many relationship between users and groups
- `tasks` - Assignments with optional file attachments
- `submissions` - Student work with text content, files, and scores

**API Design Pattern**
- RESTful endpoints returning JSON
- JWT-based authentication via Bearer tokens
- Role-based access control middleware
- File uploads handled through multipart form data
- Error responses with appropriate HTTP status codes

**Key API Endpoints**
- `POST /api/register` - User registration
- `POST /api/login` - Authentication
- `GET /api/user` - Current user profile
- `POST /api/groups` - Create group (teacher only)
- `POST /api/groups/join` - Join group by code (student)
- `POST /api/tasks` - Create task (teacher only)
- `POST /api/tasks/:taskId/submit` - Submit assignment (student)
- `PATCH /api/submissions/:id/score` - Grade submission (teacher)

**Authentication & Authorization**
- JWT tokens signed with SESSION_SECRET environment variable
- Middleware validates tokens on protected routes
- Role-based permissions enforced (teachers can create/grade, students can submit)
- Group membership verified before allowing access to group resources

**File Storage**
- Local filesystem storage in `/uploads` directory
- Files saved with unique timestamps and random suffixes
- 10MB file size limit enforced by Multer
- Allowed file types: images, PDFs, documents, ZIP archives
- File URLs stored in database as relative paths

### Data Storage

**SQLite Database**
- Single-file database: `classroom.db`
- Schema managed through raw SQL (not using Drizzle ORM despite config presence)
- Synchronous operations via better-sqlite3
- Foreign key constraints for referential integrity
- Cascade deletes (e.g., deleting group removes all tasks and members)

**Migration Strategy**
- Schema defined in `server/storage.ts` with CREATE TABLE IF NOT EXISTS
- Database initialized on server startup
- Drizzle Kit configured but not actively used (PostgreSQL dialect configured for potential future migration)

### External Dependencies

**Core Dependencies**
- `@neondatabase/serverless` - Neon Postgres driver (configured but not actively used)
- `better-sqlite3` - Embedded SQLite database
- `drizzle-orm` - ORM framework (configured but schema not using it)
- `jsonwebtoken` - JWT token generation and validation
- `bcryptjs` - Password hashing
- `multer` - File upload handling
- `express` - Web server framework

**Frontend Libraries**
- `@tanstack/react-query` - Server state management
- `react-hook-form` - Form handling
- `@hookform/resolvers` - Zod integration for form validation
- `zod` - Schema validation
- `wouter` - Lightweight routing
- `date-fns` - Date formatting and manipulation
- All `@radix-ui/*` packages - Headless UI primitives for shadcn components

**UI & Styling**
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variant management
- `clsx` & `tailwind-merge` - Conditional class name utilities
- `lucide-react` - Icon library

**Development Tools**
- `vite` - Build tool and dev server
- `typescript` - Type safety
- `tsx` - TypeScript execution for build scripts
- `@replit/*` packages - Replit-specific development plugins (cartographer, dev banner, runtime error overlay)

**Build Process**
- Client built with Vite to `dist/public`
- Server bundled with esbuild to `dist/index.cjs`
- Selected dependencies bundled to reduce cold start times
- Static files served from built client directory in production
- Development mode uses Vite middleware with HMR