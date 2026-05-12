# HabitX PWA

Track habits, build streaks. Simple, fast, offline-ready.

## Files

```
habitx/
├── index.html          ← Main app
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (offline support)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── .github/
    └── workflows/
        └── deploy.yml  ← Auto deploy to GitHub Pages
```

## Deploy to GitHub Pages

### Option A – Automatic (GitHub Actions)

1. Create a new GitHub repo (e.g. `habitx`)
2. Push all files to the `main` branch
3. Go to **Settings → Pages → Source** → select **GitHub Actions**
4. Push any change — it auto-deploys to `https://yourusername.github.io/habitx/`

### Option B – Manual

1. Push files to `main`
2. Go to **Settings → Pages → Source** → select **Deploy from branch → main → / (root)**
3. Wait ~1 min, then visit `https://yourusername.github.io/habitx/`

## Install as App

- **Android**: Open in Chrome → Menu → "Add to Home Screen"
- **iPhone**: Open in Safari → Share → "Add to Home Screen"
- **Desktop**: Chrome address bar → install icon on the right

## Features

- Sidebar navigation (hamburger on mobile)
- Light / Dark mode toggle
- Habit tracking with streaks
- Category filter
- Stats & heatmap
- 30-day progress tracking
- Fully offline (service worker)
- localStorage persistence
