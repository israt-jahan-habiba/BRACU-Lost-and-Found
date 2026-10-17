# BRACU Lost & Found

A full-stack web app where BRAC University students report lost items, post found items, search, and
recover belongings through a claim → ownership verification → handover workflow.

**Stack:** React (Vite) · Node.js + Express · SQLite (built-in `node:sqlite`, no native build tools needed) · JWT auth · bcrypt · multer uploads

## Features

| Area | What's implemented |
|---|---|
| Auth | Register / login, BRACU-email restriction, bcrypt hashing, forgot/reset password, profile + change password, suspended-user blocking |
| Reports | Lost & found reports with photo (JPG/PNG/WEBP, max 5 MB), predefined campus locations, categories, urgent flag for IDs/wallets/keys/phones, "handed to security" flag, duplicate warning, edit/delete/resolve |
| Search | Keyword search + filters (lost/found, category, location, date range, status), pagination |
| Claims | Claim a found item / respond to a lost one, **ownership verification** (claimant describes hidden details; finder compares with private notes), accept/reject, auto-reject others, in-app chat (no phone numbers exposed), handover confirmation, cancel |
| Smart matching | Explainable score (category, location, keyword overlap, date proximity); owners are notified of strong matches |
| Notifications | In-app bell (polling) for claims, messages, matches, status changes |
| Dashboard | My reports, sent/received claims, saved items, profile settings |
| Admin | Analytics (counts, avg resolution time, top categories/locations), flagged-post moderation, remove/restore posts, suspend users |
| Extras | Favorites, report abuse, FAQ/guidelines page, responsive + dark-mode UI, keyboard/aria accessibility |

Privacy: public listings never include email, phone, student ID, or the private "hidden details".

## Quick start

Requires **Node.js 22.13 or newer** (uses the built-in `node:sqlite`; works on Node 24).

```bash
npm run install:all
npm run seed          # creates admin + demo data
npm run dev:server    # terminal 1 -> API on :4000
npm run dev:client    # terminal 2 -> UI on http://localhost:5173
```

Demo logins (from `npm run seed`): `admin@bracu.ac.bd / admin12345`, `nusrat@g.bracu.ac.bd / password123`,
`tanvir@g.bracu.ac.bd / password123`. **Change the admin password before deploying.**

### Single-process production mode

```bash
npm run build
npm start     # Express serves API + built UI on :4000 (set JWT_SECRET in the environment first)
```

### Tests

`npm test` runs 35 end-to-end API checks on a throwaway database (auth, permissions, privacy, matching, claims, admin).

## Structure

```
server/src/
  index.js        app setup, security headers, rate limiting, static serving
  db.js           SQLite schema (users, items, claims, messages, notifications, abuse_reports, favorites)
  auth.js         JWT middleware        matching.js   similarity scoring
  routes/         auth, items, claims, admin, misc
  seed.js         demo data             smoke-test.js API tests
client/src/
  App.jsx         layout, routes, notification bell      api.js, auth.jsx   fetch + auth context
  pages/          Home, Browse, ItemDetail, ReportForm, Dashboard, ClaimPage, AuthPages, Admin, Guidelines
```

## Known limitations / next steps

- **Email verification and reset emails:** no mail server is bundled. Reset tokens are printed to the server console;
  add Nodemailer in `routes/auth.js`. Registration only checks the `@bracu.ac.bd` domain, not mailbox ownership.
- Notifications use polling; Socket.IO would make them real-time.
- Images are stored on local disk (`server/uploads`); use Cloudinary/S3 on hosts with ephemeral disks.
- SQLite suits a portfolio/demo; for MySQL/Postgres replace `db.js` and the SQL in `routes/`.
- Matching is keyword-based; text/image embeddings are a natural upgrade.

## CV blurb (edit to match what you actually ship)

**BRACU Lost & Found — University Lost-and-Found Web Application** · React, Node.js/Express, SQLite, JWT
- Built a full-stack platform for BRAC University students to report, search, and recover lost belongings.
- Implemented authentication, category/location/date filters, image uploads, and per-user dashboards.
- Designed a claim workflow with ownership verification, in-app chat, and handover confirmation that keeps contact details private.
- Added explainable item matching, notifications, an admin moderation/analytics panel, and a 35-check automated API test suite.
