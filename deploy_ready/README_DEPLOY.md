# Deployment Guide — EnglishJibi Classes Management System (MCMS)

This `deploy_ready` folder contains the fully compiled, production-optimized build of the Money Collection Management System (MCMS), Student Report Cards, and Homework & Website Practice Tracking modules, along with the modernized production SQL data file.

---

## What is in this folder?

```
deploy_ready/
├── if0_42017220_mcms.sql      # Modernized production SQL data file (125 active students, 241 receipts, 19 archived students)
├── backend/                  # PHP API endpoints, auth, and database migrations
│   ├── api/                  # 15 REST API controllers (students, groups, receipts, homework, results...)
│   ├── auth/                 # Login and JWT verification
│   ├── database/             # Master database migration SQL schema (migrate.sql)
│   └── includes/             # DB connection, auth helper, JWT, utilities
├── dist/                     # Compiled React frontend bundle (Vite + TypeScript)
│   ├── assets/               # JS chunks, CSS stylesheets, images
│   ├── favicon.png / .svg    # Favicons
│   ├── manifest.json         # PWA Web Manifest
│   └── index.html            # Entry HTML
├── .env                      # Database credentials & environment config
├── .env.production           # Production environment credentials template
├── .env.example              # Environment variables documentation
├── .htaccess                 # Apache SPA routing, HTTPS enforcement & security headers
├── icon.png                  # System logo icon
├── index.php                 # Dynamic SPA fallback with base href injection
├── setup.php                 # Database initialization & table migration wizard
└── README_DEPLOY.md          # This guide
```

---

## Deployment Steps

1. Open your hosting File Manager or FTP client (e.g., InfinityFree, cPanel, Hostinger).
2. Navigate to your website root directory (`htdocs/` or `public_html/`).
3. Upload all files and folders from `deploy_ready/` directly into your web root.
   *(Make sure hidden files like `.htaccess` and `.env` are uploaded).*
4. Import `if0_42017220_mcms.sql` into your MySQL database via phpMyAdmin (or visit `/setup` to run automated migrations).
