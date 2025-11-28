# 🚀 MIGRATION PLAN - PostgreSQL + Cloudinary + Render + Free Frontend

## 📋 Overview

This document outlines the migration strategy from the current stack (SQLite + Local File Storage + Replit) to a production-ready stack:

**Current Stack:**
- Database: SQLite (in-memory)
- File Storage: Local filesystem
- Backend: Replit
- Frontend: Replit

**Target Stack:**
- Database: PostgreSQL (Neon or Supabase)
- File Storage: Cloudinary
- Backend: Render.com
- Frontend: Vercel, Netlify, or GitHub Pages

---

## 📊 PHASE 1: DATABASE MIGRATION (PostgreSQL)

### 1.1 Why PostgreSQL?

| Feature | SQLite | PostgreSQL |
|---------|--------|-----------|
| **Scalability** | Single file | Horizontal scaling |
| **Concurrency** | Limited | Full ACID compliance |
| **Data Types** | Basic | Rich types (arrays, JSON) |
| **Foreign Keys** | Limited | Full support with CASCADE/SET NULL |
| **Backups** | Manual | Automated snapshots |
| **Cost (Free Tier)** | ✓ Local | ✓ Neon/Supabase free plan |
| **Production Ready** | ✗ | ✓ Industry standard |

### 1.2 PostgreSQL Provider Options

#### Option A: **Neon** (Recommended)
- Free tier: 0.5 GB storage
- Automated backups
- Serverless PostgreSQL
- Pay-as-you-go ($0.30/GB/month)
- URL: https://neon.tech

**Pros:**
- Easiest setup
- Serverless (scales automatically)
- Free tier sufficient for most projects

**Cons:**
- Regional availability (check your region)

#### Option B: **Supabase** (Alternative)
- Free tier: 500MB storage
- Built-in authentication (extras)
- Real-time subscriptions
- URL: https://supabase.com

**Pros:**
- More storage than Neon
- Auth integration

**Cons:**
- More complex setup

#### Option C: **Railway** (Another Option)
- Free tier: $5/month credit
- Simple deployment
- URL: https://railway.app

### 1.3 Migration Steps

#### Step 1: Create PostgreSQL Database

```bash
# 1. Go to https://neon.tech (or your chosen provider)
# 2. Sign up with GitHub
# 3. Create project (e.g., "classroom-management")
# 4. Create database (e.g., "classroom_db")
# 5. Copy connection string:
#    postgresql://user:password@host/database?sslmode=require

# Store as environment variable:
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

#### Step 2: Update Drizzle Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "postgresql", // Changed from sqlite
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

#### Step 3: Generate & Run Migrations

```bash
# Generate migration files (one-time)
npx drizzle-kit generate

# Push schema to PostgreSQL
npx drizzle-kit push

# Verify schema created
npx drizzle-kit studio  # Opens UI to inspect database
```

#### Step 4: Update Database Connection in server/index.ts

```typescript
// OLD (SQLite)
// import Database from "better-sqlite3";
// const db = new Database("classroom.db");

// NEW (PostgreSQL)
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);
```

#### Step 5: Install PostgreSQL Adapter

```bash
npm install pg drizzle-orm
```

### 1.4 Data Migration (if existing data)

```bash
# Export SQLite data
# SQLite → JSON → PostgreSQL

# 1. Export from SQLite as JSON
sqlite3 classroom.db ".mode json" ".output data.json" "SELECT * FROM users; SELECT * FROM groups; ..."

# 2. Create Python/Node script to import to PostgreSQL
# 3. Run import script
node import-data.js

# 4. Verify data integrity
# Check row counts, unique IDs, etc.
```

**Risk Level: ⚠️ MEDIUM**
- Need to preserve all data
- Foreign key constraints must be valid
- Test on staging first

---

## 📸 PHASE 2: FILE STORAGE MIGRATION (Cloudinary)

### 2.1 Why Cloudinary?

| Feature | Local Files | Cloudinary |
|---------|------------|-----------|
| **Storage** | Limited by server | Unlimited (paid) |
| **Bandwidth** | Limited | Unlimited (paid) |
| **CDN** | None | Global CDN included |
| **Image Optimization** | Manual | Automatic |
| **Free Tier** | ✓ | ✓ 25 GB/month |
| **Security** | Manual | Built-in |
| **Backups** | Manual | Automatic |

### 2.2 Cloudinary Setup

#### Step 1: Create Account

```
1. Go to https://cloudinary.com
2. Sign up (free tier)
3. Go to Dashboard
4. Copy credentials:
   - Cloud Name
   - API Key
   - API Secret
```

#### Step 2: Store Credentials as Environment Variables

```bash
# .env or environment variables
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=your_preset_name (optional)
```

#### Step 3: Install Cloudinary SDK

```bash
npm install cloudinary
```

#### Step 4: Create Upload Service

```typescript
// server/services/fileService.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadFile(file: Express.Multer.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "classroom-management",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result?.secure_url || "");
      }
    );

    upload.end(file.buffer);
  });
}

export async function deleteFile(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
```

#### Step 5: Update File Upload Routes

```typescript
// Before: Save to /uploads
const filePath = path.join(uploadsDir, filename);
fs.writeFileSync(filePath, file.buffer);
return `/uploads/${filename}`;

// After: Upload to Cloudinary
const fileUrl = await uploadFile(file);
return fileUrl; // Returns: https://res.cloudinary.com/...
```

### 2.3 Multer to Cloudinary Adapter

```typescript
// server/routes.ts
import { uploadFile } from "./services/fileService";

// Update multer configuration (optional, can use memory storage now)
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory, upload to Cloudinary
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB (Cloudinary can handle)
});

// Update file handling
router.post("/api/tasks", upload.single("file"), async (req, res) => {
  if (req.file) {
    const fileUrl = await uploadFile(req.file);
    // Save fileUrl to database
  }
});
```

### 2.4 File Migration (Existing Files)

```bash
# 1. Generate list of existing files
ls -la uploads/ > file-list.txt

# 2. Create migration script
# Node script to read local files and upload to Cloudinary

# 3. Update database with new Cloudinary URLs
UPDATE tasks SET fileUrl = NEW_CLOUDINARY_URL WHERE fileUrl LIKE '%uploads%';
UPDATE submissions SET fileUrl = NEW_CLOUDINARY_URL WHERE fileUrl LIKE '%uploads%';

# 4. Verify all URLs are valid

# 5. Delete local /uploads directory
rm -rf uploads/
```

**Risk Level: ⚠️ LOW-MEDIUM**
- Need to update all file URLs in database
- Must verify each file still accessible
- Keep backups before deletion

---

## 🚀 PHASE 3: BACKEND DEPLOYMENT (Render)

### 3.1 Why Render?

| Feature | Replit | Render | Railway | Fly.io |
|---------|--------|--------|---------|--------|
| **Free Tier** | ✓ 3GB RAM | ✓ Limited | ✓ $5/mo | ✗ |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Production Ready** | Partial | ✓ | ✓ | ✓ |
| **Auto-deploy from Git** | ✓ | ✓ | ✓ | ✓ |
| **Database Hosting** | Limited | ✓ | ✓ | ✓ |
| **Environment Variables** | ✓ | ✓ | ✓ | ✓ |
| **Custom Domain** | ✓ | ✓ | ✓ | ✓ |

### 3.2 Render Setup Steps

#### Step 1: Prepare GitHub Repository

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/classroom-management.git
git branch -M main
git push -u origin main
```

**Required Files:**
- `package.json` with start script
- `server/index.ts` or `server.ts`
- `.env` file (add to .gitignore)

#### Step 2: Update package.json

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "start": "node --loader tsx server/index.ts",
    "dev": "npm run dev"
  }
}
```

#### Step 3: Create Render Configuration

```bash
# Create render.yaml (optional, for infrastructure-as-code)
services:
  - type: web
    name: classroom-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        scope: build,runtime
      - key: CLOUDINARY_CLOUD_NAME
        scope: build,runtime
      - key: CLOUDINARY_API_KEY
        scope: build,runtime
      - key: CLOUDINARY_API_SECRET
        scope: build,runtime
      - key: SESSION_SECRET
        scope: build,runtime
```

#### Step 4: Deploy to Render

```
1. Go to https://render.com
2. Sign up with GitHub
3. New → Web Service
4. Connect GitHub repository
5. Configure:
   - Name: classroom-management-api
   - Build Command: npm install && npm run build
   - Start Command: npm start
   - Environment: Node
6. Add Environment Variables:
   - DATABASE_URL = (your PostgreSQL URL)
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
   - SESSION_SECRET
7. Click Deploy
```

#### Step 5: Verify Deployment

```bash
# After deployment completes
# Test API endpoints:
curl https://classroom-management-api.onrender.com/api/auth/me
curl https://classroom-management-api.onrender.com/api/health

# Check logs in Render dashboard
# Monitor for errors
```

### 3.3 Environment Variables for Render

```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SESSION_SECRET=your_random_secret_key
NODE_ENV=production
```

### 3.4 Backend Modifications

**Update CORS for frontend origin:**

```typescript
// server/index.ts
import cors from "cors";

app.use(
  cors({
    origin: [
      "http://localhost:5000", // Dev
      "https://your-frontend.vercel.app", // Prod
    ],
    credentials: true,
  })
);
```

**Update API URLs in frontend:**

```typescript
// client/src/lib/queryClient.ts
const API_BASE_URL = 
  process.env.VITE_API_URL || 
  (process.env.NODE_ENV === "production" 
    ? "https://classroom-management-api.onrender.com" 
    : "http://localhost:5000");

export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  // ... rest of implementation
};
```

**Risk Level: ⚠️ LOW**
- Render deployment is straightforward
- Easy rollback if issues
- Can keep Replit as backup during transition

---

## 🎨 PHASE 4: FRONTEND DEPLOYMENT (Free Options)

### 4.1 Frontend Hosting Options

#### Option 1: **Vercel** (Recommended)
- **Free Tier:** Unlimited deployments
- **Auto-deploy:** From GitHub
- **Performance:** Global CDN
- **URL:** https://vercel.com

**Pros:**
- Easiest setup for React/Vite
- Fastest builds
- Best integration with Git

**Cons:**
- American-based (check latency)

#### Option 2: **Netlify**
- **Free Tier:** 300 build minutes/month
- **Auto-deploy:** From GitHub
- **URL:** https://netlify.com

**Pros:**
- Similar to Vercel
- Good build cache

**Cons:**
- Limited build minutes

#### Option 3: **GitHub Pages**
- **Free Tier:** Static hosting only
- **Auto-deploy:** From GitHub
- **URL:** username.github.io

**Pros:**
- Completely free
- Simple for static sites

**Cons:**
- Static only (SPA might need workarounds)
- Limited features

#### Option 4: **Cloudflare Pages**
- **Free Tier:** Unlimited deployments
- **Auto-deploy:** From GitHub
- **URL:** pages.cloudflare.com

**Pros:**
- Unlimited builds
- Global CDN

**Cons:**
- Newer platform

### 4.2 Vercel Setup (Recommended)

#### Step 1: Prepare Frontend Build

```bash
# Test local build
npm run build

# Check vite.config.ts has correct base
export default defineConfig({
  base: '/',
  // ... rest of config
});
```

#### Step 2: Deploy to Vercel

```
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import Git Repository
4. Select repository: classroom-management
5. Configure:
   - Framework: Vite
   - Build Command: npm run build
   - Output Directory: dist
6. Add Environment Variables:
   - VITE_API_URL=https://classroom-management-api.onrender.com
7. Click Deploy
```

#### Step 3: Configure Environment Variables

```bash
# vercel.json (optional)
{
  "env": {
    "VITE_API_URL": "@api_url"
  }
}
```

Or use Vercel dashboard:
```
Settings → Environment Variables
Add: VITE_API_URL = https://classroom-management-api.onrender.com
```

#### Step 4: Update Vite Config

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
});
```

### 4.3 Update API URLs

```typescript
// client/src/lib/queryClient.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const defaultQueryFn = async ({ queryKey }: { queryKey: string[] }) => {
  const response = await fetch(`${API_BASE_URL}${queryKey[0]}`);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { queryFn: defaultQueryFn },
  },
});
```

**Risk Level: ⚠️ LOW**
- Frontend changes minimal
- Can keep Replit frontend as backup
- Easy rollback to previous host

---

## 📋 COMPLETE MIGRATION CHECKLIST

### Pre-Migration Testing
- [ ] Test application locally with all changes
- [ ] Verify PostgreSQL connection works
- [ ] Test Cloudinary uploads locally
- [ ] Run all test suites
- [ ] Backup current SQLite database
- [ ] Export/backup all current files

### Phase 1: Database
- [ ] Create PostgreSQL instance (Neon/Supabase)
- [ ] Update `drizzle.config.ts` to PostgreSQL
- [ ] Generate migrations with Drizzle
- [ ] Test schema creation on PostgreSQL
- [ ] Migrate existing data (if any)
- [ ] Verify data integrity in PostgreSQL
- [ ] Update `server/index.ts` connection code
- [ ] Test database operations in dev

### Phase 2: File Storage
- [ ] Create Cloudinary account
- [ ] Store credentials as environment variables
- [ ] Install Cloudinary SDK
- [ ] Create file upload service
- [ ] Test file upload to Cloudinary
- [ ] Update routes to use Cloudinary
- [ ] Migrate existing files to Cloudinary
- [ ] Update database URLs
- [ ] Test file access (view, download)
- [ ] Delete local `/uploads` directory

### Phase 3: Backend Deployment
- [ ] Push code to GitHub
- [ ] Create Render account
- [ ] Set up GitHub integration
- [ ] Configure build/start commands
- [ ] Add environment variables to Render
- [ ] Deploy backend to Render
- [ ] Test API endpoints on Render
- [ ] Monitor logs for errors
- [ ] Test database connection from Render
- [ ] Test file uploads from Render

### Phase 4: Frontend Deployment
- [ ] Update API URLs to Render backend
- [ ] Test API calls in local dev
- [ ] Build frontend for production
- [ ] Create Vercel account
- [ ] Set up GitHub integration
- [ ] Configure build settings
- [ ] Add environment variables
- [ ] Deploy frontend to Vercel
- [ ] Test all features on Vercel
- [ ] Verify file uploads work end-to-end
- [ ] Check performance and load times

### Post-Migration
- [ ] Monitor error logs for 24 hours
- [ ] Test all user workflows (auth, groups, tasks, submissions)
- [ ] Check mobile responsiveness
- [ ] Verify file downloads/previews work
- [ ] Test on different browsers
- [ ] Update documentation with new URLs
- [ ] Set up monitoring/alerts
- [ ] Plan regular backups
- [ ] Schedule database maintenance
- [ ] Keep Replit as backup (optional)

---

## 📊 COST ANALYSIS

### Current Stack (Replit)
- Free: $0/month
- With resources: $7/month (Pro)

### New Stack (Production)

| Service | Free Tier | Estimated Cost |
|---------|-----------|-----------------|
| **Neon (PostgreSQL)** | 0.5 GB | $0-5/month |
| **Cloudinary** | 25 GB/month | $0/month (free tier covers most uses) |
| **Render (Backend)** | ✗ Limited | $7/month minimum |
| **Vercel (Frontend)** | Unlimited | $0/month |
| **Domain (optional)** | - | $10-15/year |
| **Total** | - | **~$7-12/month** |

### Break-even Analysis
- Migration effort: ~4-8 hours
- Ongoing maintenance: Reduced
- Scalability: Significantly improved
- ROI: High (production-ready infrastructure)

---

## ⚠️ RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Data loss during migration** | Critical | Backup first, test in staging |
| **API/database connection errors** | High | Update connection strings, test thoroughly |
| **Cloudinary upload failures** | Medium | Implement retry logic, error handling |
| **CORS issues** | Medium | Update allowed origins, test from frontend |
| **Environment variable misconfiguration** | High | Use .env templates, double-check values |
| **Database constraint violations** | High | Validate foreign keys, test imports |
| **Performance degradation** | Medium | Monitor metrics, optimize queries |
| **Service provider downtime** | Low | Have fallback plans, redundancy |

---

## 🔄 ROLLBACK PLAN

If migration fails:

1. **Database Rollback:**
   - Keep SQLite backup
   - Revert `drizzle.config.ts` to SQLite
   - Restore backup data

2. **File Storage Rollback:**
   - Keep local `/uploads` backup
   - Update file URLs back to local paths
   - Redeploy backend to Replit

3. **Backend Rollback:**
   - Revert GitHub push
   - Redeploy to Replit
   - Update frontend API URLs

4. **Frontend Rollback:**
   - Revert to Replit
   - Update API URLs back

**Estimated rollback time:** 1-2 hours

---

## 📚 RESOURCES

### PostgreSQL
- Neon: https://neon.tech/docs
- Drizzle ORM PostgreSQL: https://orm.drizzle.team/docs/postgres

### Cloudinary
- Upload API: https://cloudinary.com/documentation/image_upload_api_reference
- Node.js SDK: https://github.com/cloudinary/cloudinary_npm

### Render
- Getting Started: https://render.com/docs
- Environment Variables: https://render.com/docs/environment-variables
- Deployment Guide: https://render.com/docs/deploy-node-express-app

### Vercel
- Getting Started: https://vercel.com/docs
- Vite Guide: https://vercel.com/docs/frameworks/vite

---

## ✅ SUMMARY

| Phase | Current | Target | Timeline |
|-------|---------|--------|----------|
| **Database** | SQLite → PostgreSQL | Neon | 1-2 hours |
| **Files** | Local → Cloudinary | Cloudinary CDN | 1-2 hours |
| **Backend** | Replit → Render | render.com | 1 hour |
| **Frontend** | Replit → Vercel | vercel.com | 30 mins |
| **Total Migration** | - | - | **3-6 hours** |

**Recommended Approach:**
1. Set up all new services first (no downtime yet)
2. Test locally with all new services
3. Deploy backend to Render
4. Update frontend to use Render API
5. Deploy frontend to Vercel
6. Monitor for 24 hours
7. Decommission Replit (keep as backup for 1 month)

This is a **low-risk, high-reward migration** with clear rollback plan!
