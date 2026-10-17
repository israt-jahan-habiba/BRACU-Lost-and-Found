<div align="center">

# BRACU Lost & Found

**A full-stack lost-and-found platform for BRAC University students**

Report lost items, post found items, search campus listings, verify ownership, communicate securely, and complete item handovers through a structured recovery workflow.

![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Authentication-000000?logo=jsonwebtokens&logoColor=white)

[Features](#features) · [Getting started](#getting-started) · [How it works](#how-it-works) · [Tech stack](#tech-stack) · [Roadmap](#roadmap)

</div>

---

## Why I built this

Lost-and-found communication on university campuses is often scattered across social media posts, group chats, and informal announcements. Important posts can easily get buried, and there is often no structured way to verify ownership or safely return an item.

**BRACU Lost & Found** provides one dedicated platform where BRAC University students can report lost and found belongings, search listings, verify ownership, communicate securely, and complete the handover process while keeping private contact information protected.

## Live Demo

🔗 **Live demo:** https://bracu-lost-and-found-zncf.onrender.com/

> After deployment, replace `Coming soon` with your public project URL.

## Features

| | Feature | Details |
|---|---|---|
| 🔐 | **Authentication** | Registration, login, BRACU email restriction, JWT authentication, password management |
| 📦 | **Lost & found reports** | Create lost/found reports with categories, campus locations, photos, status and urgent-item flags |
| 🔎 | **Search & filtering** | Search by keyword and filter by type, category, location, date range and status |
| 🤝 | **Claims system** | Claim found items or respond to lost-item reports through a structured recovery workflow |
| ✅ | **Ownership verification** | Claimants describe hidden item details so owners/finders can verify ownership |
| 💬 | **Private chat** | In-app communication without exposing phone numbers or personal contact information |
| 🧠 | **Smart matching** | Matches potentially related lost and found reports using category, location, keywords and date proximity |
| 🔔 | **Notifications** | Notifications for claims, messages, possible matches and status changes |
| 📊 | **User dashboard** | Manage reports, claims, saved items and account settings |
| 🛡️ | **Admin panel** | Moderation tools, analytics, flagged reports, user suspension and post management |
| ⭐ | **Favorites & abuse reports** | Save useful listings and report inappropriate or suspicious content |
| 🌙 | **Responsive UI** | Responsive interface with dark mode and accessibility support |

## Getting started

### Prerequisites

- Node.js
- npm

### Installation

```bash
git clone https://github.com/israt-jahan-habiba/BRACU-Lost-and-Found.git
cd BRACU-Lost-and-Found

npm run install:all
```

### Add demo data

```bash
npm run seed
```

### Run the backend

```bash
npm run dev:server
```

### Run the frontend

Open another terminal:

```bash
npm run dev:client
```

### Run tests

```bash
npm test
```

## Project structure

```text
BRACU-Lost-and-Found
├── client/
│   └── src/
├── server/
│   └── src/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## How it works

### 1. Report an item
Students can create **Lost** or **Found** reports with item details, category, location, date and other relevant information.

### 2. Search and matching
Users can search listings manually, while the system can also identify possible matches using category, location, keywords and date proximity.

### 3. Submit a claim
A user can claim an item and provide private ownership details.

### 4. Ownership verification
The item holder can review the claim and accept or reject it.

### 5. Secure communication
Users can communicate through the built-in chat without publicly exposing personal contact information.

### 6. Handover confirmation
After the item is returned, the case can be marked as resolved.

## Privacy & security

The system is designed to avoid publicly exposing sensitive user details such as:

- Email addresses
- Phone numbers
- Student IDs
- Private ownership-verification information

It also includes authentication, moderation and abuse-reporting functionality.

## Tech stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Authentication:** JWT
- **File handling:** Image uploads
- **Testing:** Automated API testing

## Project Highlights

- Built a full-stack lost-and-found platform for BRAC University students.
- Implemented authentication, searchable item listings, claims and user dashboards.
- Designed an ownership-verification and handover workflow.
- Added private messaging, notifications, admin moderation and smart item matching.
- Structured the project with separate frontend and backend modules.

## Roadmap

### Completed
- Authentication
- Lost and found reporting
- Search and filtering
- Claims workflow
- Private messaging
- Notifications
- Admin moderation
- Public deployment

### Planned
- Email verification
- Real-time notifications
- Cloud image storage
- Production database
- AI-based semantic matching
- Public deployment

## Contributing

Issues and pull requests are welcome.

---

<div align="center">

Built by <strong><a href="https://github.com/israt-jahan-habiba">Israt Jahan Habiba</a></strong>

</div>
