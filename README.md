# Technician Drop Portal

A standalone full-stack Next.js portal for cable technicians and leadership to upload incident photos, read embedded photo metadata, and search submissions by address, GPS, region, state, FFO, department, and submission date.

## What this does

- Upload one or more photos for a single incident
- Extract GPS and address-like data from image metadata when available
- Save searchable incident records in PostgreSQL
- Sort newest submissions first
- Filter by region, state, FFO, and department
- Support technician and leadership logins
- Run as a standalone Next.js app on standard Linux servers, Docker hosts, and Raspberry Pi-class devices

## Stack

- Next.js 14 App Router
- PostgreSQL
- Prisma ORM
- Cookie-based JWT auth
- Local file storage for uploads
- Docker-first deployment with a standalone Next.js runtime

## Demo accounts

- Technician: `tech@example.com` / `tech1234`
- Leadership: `leader@example.com` / `leader1234`

## Metadata behavior

The app reads embedded metadata from the **first uploaded image** in a submission and tries to auto-fill:

- GPS latitude and longitude
- capture timestamp
- address-style fields when they actually exist in the photo metadata
- raw metadata JSON for later review

GPS is common in phone photos when location tagging is enabled. Full street addresses are **not** consistently stored in standard image metadata, so address auto-fill is best-effort.

## Local development

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Start PostgreSQL:

```bash
docker compose up -d db
```

3. Install dependencies:

```bash
npm install
```

4. Run migrations and seed demo data:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

5. Start the app:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Docker deployment

```bash
docker compose up --build
```

The container starts the app, runs Prisma migrations automatically, and seeds the demo users automatically.

## Railway deployment with the least manual work

### Important note about Git providers

Railway's dashboard repo import flow is documented around **GitHub repos**, while Railway also supports deploying code directly with the **Railway CLI**. Since this repository lives on GitLab, the simplest setup is:

1. clone this repo locally
2. create a new Railway project from the CLI
3. add PostgreSQL
4. deploy

### One-time local prerequisites

- A Railway account
- Railway CLI installed
- Docker **not** required for Railway deployment

Install the Railway CLI:

```bash
npm i -g @railway/cli
railway login
```

### Fast Railway setup

From the project root:

```bash
railway init
railway add postgresql
railway up
```

Then in the Railway dashboard:

1. Open the app service
2. Go to **Variables**
3. Add this one variable only:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

4. Go to **Settings > Networking**
5. Click **Generate Domain**

That is enough to get the app live.

### Why this is minimal

This repo already includes:

- a `Dockerfile` Railway will use automatically
- automatic Prisma migrations on container start
- automatic demo-user seeding on container start
- a health endpoint at `/api/health`
- a `railway.toml` with deploy healthcheck settings

### Optional but recommended on Railway

Uploads are stored on the service filesystem. They will survive restarts of the same instance, but on many hosted platforms they are not guaranteed to persist forever across rebuilds or redeployments. For better durability, attach a Railway volume and mount it to:

```text
/app/public/uploads
```

The app is already configured to use that path by default inside Docker.

## Standard Linux / reverse proxy hosting

You can also run this app on your own server with PostgreSQL and place it behind:

- Nginx
- Nginx Proxy Manager
- Caddy
- Apache
- Traefik

For direct Node hosting:

```bash
npm install
npm run build
npx prisma migrate deploy
npm run prisma:seed
npm run start
```

## Environment variables

See `.env.example` for local development defaults.

Main variables:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=change-this-to-a-long-random-string
UPLOAD_DIR=public/uploads
SEED_ON_STARTUP=true
```

## Notes for production

- Change `JWT_SECRET`
- Replace demo accounts with real users
- Use a persistent upload volume or object storage
- Add TLS through your reverse proxy or hosting platform
