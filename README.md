# NEXUS — Futuristic Productivity OS

A premium cyberpunk productivity platform built with Next.js 15, Firebase, and Framer Motion.

## Features

- **Dashboard** — Animated stats, activity charts, upcoming events, active tasks
- **Calendar** — Month/Week/Day views with drag-and-drop events, animated UI
- **Tasks** — Kanban board + list view with drag-and-drop, subtasks, priorities, labels
- **Notifications** — Real-time notification center + Firebase Cloud Messaging push
- **Settings** — Advanced theme engine (presets, custom colors, glass, blur, animations)
- **Pomodoro** — Focus timer with animated ring, sound effects, session tracking
- **Auth** — Email/password + Google, password reset, avatar upload
- **PWA** — Installable, offline support, background sync, app-like experience

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | Next.js 15, TypeScript            |
| Styling      | TailwindCSS, CSS Variables        |
| Animation    | Framer Motion                     |
| Drag & Drop  | @dnd-kit                          |
| Charts       | Recharts                          |
| Backend      | Firebase (Auth, Firestore, Storage, FCM) |
| Forms        | React Hook Form + Zod             |
| PWA          | next-pwa + Workbox                |

## Quick Start

### 1. Prerequisites

```bash
node --version   # v20+
npm  --version   # v10+
```

### 2. Install dependencies

```bash
cd nexus
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable the following services:
   - **Authentication** → Sign-in methods: Email/Password + Google
   - **Firestore Database** → Start in production mode
   - **Storage** → Default bucket
   - **Cloud Messaging** → Web Push Certificates (generate VAPID key)

4. Get your config from **Project Settings → General → Your apps → Web app**

5. Copy environment file and fill in your values:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

### 4. Update Firebase Messaging Service Worker

Edit `public/firebase-messaging-sw.js` and replace the Firebase config values at the top with your real values.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Firestore Schema

```
users/{uid}
  - uid, email, displayName, photoURL
  - timezone, language
  - createdAt, updatedAt, lastSeen

  settings/preferences
    - theme: ThemeConfig
    - notifications: NotificationPreferences
    - calendar: CalendarPreferences
    - todos: TodoPreferences
    - pomodoro: PomodoroSettings

  notifications/{id}
    - type, title, body, read
    - actionUrl, data, createdAt

  tokens/{token}
    - token, platform, createdAt

todos/{id}
  - userId, title, description
  - status, priority, labels
  - dueDate, reminderAt
  - subtasks[], attachments[]
  - order, completedAt

events/{id}
  - userId, title, description
  - startDate, endDate, allDay
  - color, category, location
  - recurring, reminderMinutes, attendees

activityLogs/{id}
  - userId, action, entityType, entityId
  - metadata, createdAt
```

## Firebase Deployment

### Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Deploy Firestore Rules + Indexes

```bash
firebase deploy --only firestore
```

### Deploy Storage Rules

```bash
firebase deploy --only storage
```

### Build and Deploy to Firebase Hosting

Next.js with Firebase Hosting requires Static Export mode. Alternatively, use Firebase App Hosting or Vercel.

**Option A: Static Export (Firebase Hosting Classic)**

Add to `next.config.js`:
```js
const nextConfig = {
  output: 'export',
  // ...
};
```

Then:
```bash
npm run build
firebase deploy --only hosting
```

**Option B: Vercel (Recommended for SSR)**
```bash
npm install -g vercel
vercel
```
Set all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard.

**Option C: Firebase App Hosting**
```bash
firebase init apphosting
firebase deploy --only apphosting
```

## PWA Installation

### Android (Chrome)
1. Open the app in Chrome
2. Tap the "Add to Home Screen" prompt or
3. Menu → "Install app" / "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Click the install icon in the address bar
2. Click "Install"

## Push Notifications

1. User clicks "Enable Push" in Notifications page
2. Browser asks for permission
3. FCM token is saved to Firestore
4. Background messages are handled by `firebase-messaging-sw.js`
5. Foreground messages are handled in `NotificationContext.tsx`

To send a test push from Firebase Console:
- Go to **Engage → Messaging → Send your first message**
- Target users by FCM token

## Keyboard Shortcuts

| Shortcut     | Action              |
|--------------|---------------------|
| `Ctrl+K`     | Open Command Palette |
| `Escape`     | Close any modal      |
| `↑↓`        | Navigate Command Palette |
| `Enter`      | Execute selected command |

## Theme System

The theme engine supports:
- **6 preset themes** (Cyber Blue, Neon Purple, Acid Green, Crimson, Gold, Teal)
- **Custom accent + secondary color pickers**
- **5 background styles** (particles, grid, gradient, mesh, solid)
- **Glass opacity** (0–20%)
- **Blur intensity** (0–30px)
- **Animation intensity** (none/reduced/normal/high)
- **Font family** (Inter, Orbitron, Exo 2, JetBrains Mono)
- **Dark/Light/System** color mode
- **Glow effects**, **scanlines**, **particles** toggles

All settings sync to Firestore per-user and apply in real-time without page reload.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register, Forgot Password
│   ├── (dashboard)/      # All authenticated pages
│   │   ├── dashboard/    # Main dashboard
│   │   ├── calendar/     # Calendar with multi-view
│   │   ├── todos/        # Kanban + list tasks
│   │   ├── notifications/# Notification center
│   │   ├── pomodoro/     # Focus timer
│   │   └── settings/     # Appearance, Profile, Data
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout + providers
│   └── page.tsx          # Redirect to /dashboard or /login
├── components/
│   ├── dashboard/        # StatsCard, ActivityChart, widgets
│   ├── layout/           # Sidebar, Header, DashboardLayout, CommandPalette
│   └── ui/               # GlassCard, NeonButton, NeonInput, Modal, Badge, Particles
├── contexts/             # AuthContext, ThemeContext, NotificationContext
├── hooks/                # useTodos, useCalendar, useSettings, usePomodoro, useCommandPalette
├── lib/                  # firebase.ts, firestore.ts, notifications.ts, utils.ts
└── types/                # All TypeScript types and interfaces
```

## Production Checklist

- [ ] Set all `.env.local` variables in production environment
- [ ] Update `firebase-messaging-sw.js` with real Firebase config
- [ ] Generate and add PWA icons (72, 96, 128, 144, 152, 192, 384, 512px)
- [ ] Deploy Firestore security rules
- [ ] Deploy Storage security rules
- [ ] Enable Firebase App Check for production security
- [ ] Set up Firebase Analytics
- [ ] Configure CORS on Firebase Storage if needed
- [ ] Test push notifications end-to-end
- [ ] Test PWA install on Android device
- [ ] Run Lighthouse audit (target: 95+ Performance, 100 PWA)

## License

MIT
