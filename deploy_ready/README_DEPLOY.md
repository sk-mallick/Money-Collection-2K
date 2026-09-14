# Deployment Guide — EnglishJibi Classes Management System (MCMS)

This `deploy_ready` folder contains the fully compiled, production-optimized build of the Money Collection Management System (MCMS), Student Report Cards, and Home Work Report & Evaluation modules.

---

## What is in this folder?

```
deploy_ready/
├── backend/                  # PHP API endpoints, auth, and database migrations
│   ├── api/                  # 15 REST API controllers (students, groups, receipts, homework, results...)
│   ├── auth/                 # Login and JWT verification
│   ├── data/                 # Protected log directory with .htaccess
│   ├── database/             # Database migration SQL schema (migrate.sql)
│   └── includes/             # DB connection, auth helper, JWT, functions
├── dist/                     # Compiled React frontend bundle (Vite + TS)
│   ├── assets/               # JS chunks, CSS stylesheets, images
│   ├── favicon.png / .svg    # Favicons
│   ├── icons.svg             # Application icons
│   ├── manifest.json         # PWA Manifest
│   └── index.html            # Entry HTML
├── .env                      # Pre-configured production environment variables
├── .env.production           # Production environment backup template
├── .env.example              # Environment variables documentation
├── .htaccess                 # Apache routing, HTTPS enforcement & security headers
├── icon.png                  # System logo icon
├── index.php                 # Dynamic SPA fallback with base href injection
├── setup.php                 # Database initialization & table migration runner
├── deploy_ready.zip          # Complete production zip package (ready for upload)
├── MCMS 2K.zip               # Complete production zip package (alternate name)
└── README_DEPLOY.md          # This guide
```

---

## Quick Deployment Steps

### Option A: Direct Folder Upload (FTP / File Manager)

1. Open your hosting File Manager (e.g., InfinityFree, cPanel, or Hostinger).
2. Navigate to your website's root web directory:
   - InfinityFree: `htdocs/`
   - cPanel: `public_html/`
3. Upload all files and folders from inside `deploy_ready/` directly into that directory.
   *(Make sure hidden files like `.htaccess` and `.env` are uploaded).*

### Option B: Zip Upload (Fastest)

1. Upload `deploy_ready.zip` to your host's web root (`htdocs/` or `public_html/`).
2. Extract the zip file directly on the server.
3. If files extracted into a subfolder, move them into the root `htdocs/` folder.

---

## First-Time Database Setup

1. Open your browser and visit:
   `https://YOUR-DOMAIN.com/setup`
   *(e.g., `https://tatsangam.gamer.gd/setup`)*
2. The setup script will:
   - Check database connectivity
   - Create any missing tables (`students`, `payments`, `receipts`, `groups`, `settings`, `result_*`, etc.)
   - Run any pending migrations
3. Once completed, your application is 100% operational!
