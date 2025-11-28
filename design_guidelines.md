# Classroom Management System - Design Guidelines

## Design Approach
**System-Based Approach**: Material Design 3 principles with inspiration from Google Classroom and Notion for educational productivity workflows. Focus on clarity, efficiency, and role-based information architecture.

## Typography System
- **Headings**: Inter or Work Sans
  - H1: 2xl (dashboard titles)
  - H2: xl (section headers)
  - H3: lg (card titles, task names)
- **Body**: System font stack (SF Pro, Segoe UI, Inter)
  - Base: text-base (general content)
  - Small: text-sm (metadata, timestamps, helper text)
  - Extra small: text-xs (badges, status indicators)
- **Monospace**: JetBrains Mono (file names, join codes)

## Layout & Spacing System
**Spacing Scale**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Card spacing: p-6
- Form field spacing: space-y-4
- Dashboard margins: px-6 py-8 (desktop), px-4 py-6 (mobile)

**Grid System**:
- Main layout: Sidebar (w-64 fixed) + Content area (flex-1)
- Cards grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Tables: Full-width responsive with horizontal scroll on mobile

## Component Library

### Navigation
**Sidebar Navigation** (Desktop):
- Fixed left sidebar (w-64, h-screen)
- Logo/school name at top (p-6)
- Role indicator badge below logo
- Navigation items with icons + labels (py-3 px-4)
- Active state with left border accent
- Logout at bottom

**Mobile Navigation**:
- Top app bar with hamburger menu
- Collapsible drawer overlay
- Bottom action button for primary tasks

### Dashboards

**Teacher Dashboard**:
- Stats cards row (3-column grid): Total Groups, Active Tasks, Pending Submissions
- "Your Groups" section with card grid showing group name, member count, join code
- Quick actions: "+ Create Group" prominent button (top-right)

**Student Dashboard**:
- Enrolled groups card grid
- "Upcoming Tasks" list showing due dates, group name, status
- "+ Join Group" prominent action button

### Group Detail Page (Shared View)

**Header Section**:
- Group name (H1)
- Join code display (monospace, copy button for teachers)
- Member count badge
- Teacher: "Delete Group" + "Create Task" buttons
- Student: "Leave Group" button

**Two-Column Layout** (lg: and up):
- Left column (w-2/3): Tasks list/table
- Right sidebar (w-1/3): Members list

**Mobile**: Stack vertically (tasks first, members below)

**Tasks Display**:
- Table format with columns: Task Title, Due Date, Status, Actions
- Each row expandable to show description
- File attachment indicator icon
- Student: Shows submission status (Not Submitted/Submitted/Graded)
- Teacher: Shows submission count (e.g., "5/12 submitted")

### Task Creation/Edit (Teacher)
- Full-width form layout (max-w-2xl mx-auto)
- Fields in vertical stack (space-y-6):
  - Task Title (text-input)
  - Description (textarea, h-32)
  - Due Date (date picker)
  - File Upload (dropzone area with file preview)
- Action buttons bottom-right: Cancel (ghost), Save (primary)

### Task Submission (Student)
- Task details card showing title, description, teacher's file
- Submission form below:
  - Text content (textarea, h-40)
  - File upload dropzone
  - Submit button
- If already submitted: Show submission with score if graded

### Submission Review (Teacher)
- Student submissions as card grid (2 columns desktop, 1 mobile)
- Each card shows:
  - Student name (H3)
  - Submission timestamp
  - Text content preview
  - File download link (if present)
  - Score input field (number, /100)
  - "Save Score" button
- Filter tabs: All / Not Graded / Graded

### Forms & Inputs
- Input fields: border, rounded-md, p-3, w-full
- Labels: text-sm, font-medium, mb-2
- Error states: border-red, text-xs error message below
- File upload zones: border-dashed, p-8, centered icon + text
- File previews: Compact row with icon, name, size, remove button

### Cards
- Standard card: rounded-lg, border, p-6, shadow-sm
- Hover: subtle shadow increase (shadow-md)
- Action cards: Include primary action button bottom-right
- Info cards: Icon top-left, title, description, metadata bottom

### Tables
- Zebra striping for rows (every other row)
- Header row: font-medium, sticky top on scroll
- Cell padding: px-4 py-3
- Actions column: Icon buttons (Edit, Delete)
- Responsive: Horizontal scroll on small screens with sticky first column

### Buttons
- Primary: rounded-md, px-4 py-2, font-medium
- Secondary: border variant
- Ghost: Transparent with hover state
- Icon buttons: p-2, rounded-full
- Button groups: space-x-2

### Status Indicators
- Badges: px-3 py-1, text-xs, rounded-full, font-medium
- Due date badges: Show urgency (Overdue/Due Soon/Upcoming)
- Submission status: Not Submitted/Pending Review/Graded

### Modals/Dialogs
- Overlay: Semi-transparent backdrop
- Dialog: max-w-md, centered, rounded-lg, p-6
- Header + Content + Actions layout
- Close icon top-right

## Authentication Pages
- Centered card layout (max-w-md mx-auto)
- Logo/title top
- Form in card body
- Toggle between Login/Register
- Role selection (Radio buttons: Teacher/Student) on register

## Responsive Breakpoints
- Mobile: Base styles (< 768px)
- Tablet: md: (768px+) - 2-column grids
- Desktop: lg: (1024px+) - Sidebar + 3-column grids, tables expand

## Accessibility
- Focus states: Ring offset on all interactive elements
- ARIA labels on icon-only buttons
- Semantic HTML (nav, main, section, article)
- Sufficient contrast ratios
- Keyboard navigation support

## Images
No hero images needed. This is a functional dashboard application. Use icons throughout for:
- File type indicators
- Navigation items
- Empty states (large centered icon + text when no data)
- Task/submission status