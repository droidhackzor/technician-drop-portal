# Technician Drop Portal

Technician Drop Portal is a full-stack field reporting application designed for technicians, supervisors, and leadership teams to capture, review, and manage field issues such as cut drops, trapped drops, hazardous drops, and MDU-related issues.

---

## Features

### 📸 Submission Capture
Create submissions with:

- Issue type (Cut Drop, Trapped Drop, Hazardous Drop, MDU)
- Department
- Region / State / FFO
- Address
- GPS coordinates
- Notes
- One or more uploaded photos

---

### 🧠 Metadata Extraction
Automatically extracts from images (when available):

- GPS coordinates  
- Timestamp  
- Device metadata  
- Address-like data  

---

### 🔄 Workflow Management

Submission statuses:

- **Open**
- **Complete**
- **Not Valid**

#### Technician Permissions
- Create submissions  
- View submissions  
- Mark Complete *(requires notes)*  
- Mark Not Valid *(requires notes)*  

#### Supervisor / Leadership Permissions
- All technician permissions  
- Reopen submissions  
- Delete submissions  

---

### 🖼 Image System
- Thumbnail previews  
- Click-to-expand modal view  
- Multi-image support per submission  

---

### 📱 Mobile UI
Mobile-first layout includes:

- **New Submission View**
- **Recent Submissions View**

---

## Tech Stack

- Next.js 14  
- React 18  
- PostgreSQL  
- Prisma ORM  
- Zod (validation)  
- bcryptjs (auth)  
- JOSE (JWT sessions)  
- exifr (metadata extraction)  

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd technician-drop-portal
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://username:password@host:port/dbname
JWT_SECRET=your-secret-key
UPLOAD_DIR=./uploads
```

---

### 4. Setup Database

Generate Prisma client:

```bash
npx prisma generate
```

Push schema to database:

```bash
npx prisma db push
```

(Optional) Seed database if applicable:

```bash
npx prisma db seed
```

---

### 5. Run Development Server

```bash
npm run dev
```

App will be available at:

```
http://localhost:3000
```

---

## Production

### Build

```bash
npm run build
```

### Start

```bash
npm run start
```

---

## Docker / Railway Deployment

### Required Environment Variables

```
DATABASE_URL
JWT_SECRET
UPLOAD_DIR (recommended)
```

### Optional Microsoft login

The portal can also offer a **Continue with Microsoft** sign-in path while still using the same internal session cookie.
Users must already exist in the local `User` table; Microsoft login matches by email and signs in the existing account.

Required env vars for Microsoft login:

```env
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=https://your-domain.example/api/auth/microsoft/callback
NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED=true
```

Notes:
- create an Azure app registration with a web redirect URI matching `MICROSOFT_REDIRECT_URI`
- if the email returned by Microsoft does not already exist in the portal database, login is denied
- local email/password login still works alongside Microsoft login

### Railway-recommended upload persistence

For Railway, do **not** keep uploads inside the container filesystem alone.
Attach a persistent volume and point uploads at that mount path.

Recommended setting:

```env
UPLOAD_DIR=/uploads
```

Recommended Railway setup:

1. Add a persistent volume to the service.
2. Mount it at `/uploads`.
3. Set `UPLOAD_DIR=/uploads`.
4. Redeploy the service.

What this solves:
- uploaded images survive rebuilds and restarts
- Prisma/database records keep matching real files on disk
- `/api/images/[id]` can still read files after deploys

What it does **not** solve:
- images that were already lost from older ephemeral containers are not recoverable unless you have a backup or can re-upload them

### Important Notes

- Always run:
  ```bash
  npx prisma db push
  ```
- Use persistent storage for uploads
- Without persistence, images will be lost on redeploy
- The startup script now creates the upload directory automatically from `UPLOAD_DIR` before the app boots

---

## Demo Accounts (if enabled)

```
tech@example.com
leader@example.com

Password:
MasterPass123
```

⚠️ Remove demo users before production use.

---

## Project Structure

```
app/
  api/
  dashboard/
  login/

lib/
prisma/
public/
```

---

## ⚠️ Intended Use

This application is intended **strictly for controlled internal field operations**, including:

- Technician field reporting  
- Supervisor validation workflows  
- Leadership oversight and review  

It is **not intended for public distribution, open use, or commercial reuse** without explicit authorization.

---

## ⚖️ Ownership & Restrictions

**All content, source code, architecture, UI/UX design, workflows, logic, assets, and associated materials in this project are the exclusive property of Joseph Engelmann.**

**All rights are reserved.**

### 🚫 Strict Prohibition

The following actions are strictly prohibited without explicit prior written permission:

- Use of the software  
- Copying or duplication  
- Modification or derivative works  
- Distribution or sharing  
- Deployment (public or private)  
- Hosting or resale  
- Reverse engineering  
- Reproduction in whole or in part  

No license is granted or implied by access, possession, or viewing of this repository.

Unauthorized use may result in legal action.

---

## Disclaimer

This software is provided for controlled use only. Improper deployment, misuse, or unauthorized access is not permitted.
