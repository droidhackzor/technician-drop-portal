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

### Important Notes

- Always run:
  ```bash
  npx prisma db push
  ```
- Use persistent storage for uploads
- Without persistence, images will be lost on redeploy

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
