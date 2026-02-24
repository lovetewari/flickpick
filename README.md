# 🎬 FlickPick v2 — Movie & Web Series Picker

Swipe together, find what everyone wants to watch.

**Three modes**: Pick a **Movie**, pick a **Web Series**, or pick from **Both**.

---

## How It Works

```
┌─ Home ─────────────────────────────────┐
│  Sign in with Google (optional)        │
│  → Create Room  or  Join Room          │
└────────────────────────────────────────┘
              ↓
┌─ Lobby (Host configures) ──────────────┐
│                                        │
│  ① What does your group want?          │
│     🍿 Movies Only                     │
│     📺 Web Series Only                 │
│     🎬 Both                            │
│                                        │
│  ② Pick a Category                     │
│     Movies  → Trending / Popular /     │
│               Top Rated / In Theaters  │
│               / Coming Soon            │
│     Series  → Trending / Most Watched  │
│               / Top Rated / Airing     │
│               Today / New Seasons      │
│     Both    → Trending / Popular /     │
│               Top Rated                │
│                                        │
│  ③ Select Streaming Platforms          │
│  ④ Genre Filter                        │
│  ⑤ "Load Content" → Fetches from TMDB │
│     Preview: 5 Movies + 3 Series ✓     │
│  ⑥ "Start Swiping"                    │
└────────────────────────────────────────┘
              ↓
┌─ Swiping ──────────────────────────────┐
│  Each player swipes through cards      │
│  Cards show:                           │
│  • Movies: poster, rating, runtime,    │
│    year, genre, OTT platforms          │
│  • Series: poster, rating, seasons,    │
│    episodes, status (Ongoing/Ended),   │
│    network, OTT platforms              │
│  Pass phone between players            │
└────────────────────────────────────────┘
              ↓
┌─ Results ──────────────────────────────┐
│  🤝 Perfect Matches (everyone liked)   │
│  🏆 Top Picks (ranked by votes)        │
│  👥 Everyone (individual likes)        │
│  All items tagged 🍿 Movie or 📺 Series│
└────────────────────────────────────────┘
```

---

## ⚡ Step-by-Step Setup Guide

Everything is free. Total time: ~15 minutes.

---

### STEP 1: Get a TMDB API Key (2 min)

TMDB gives you real-time movie and series data — posters, ratings, seasons, episodes, streaming platforms.

1. Go to **https://www.themoviedb.org/signup** → create free account
2. Go to **https://www.themoviedb.org/settings/api**
3. Click **"Create"** → choose **"Developer"**
4. Fill in the form:
   - App Name: `FlickPick`
   - App URL: `https://example.com` (you'll update later)
   - Description: `Movie picker for friends`
5. Copy your **API Key (v3 auth)** — save it

---

### STEP 2: Create Supabase Project (3 min)

Supabase gives you a free PostgreSQL database + real-time + Google Auth.

1. Go to **https://supabase.com** → sign up (free)
2. Click **"New Project"**
   - Name: `flickpick`
   - Database Password: *(choose strong, save it)*
   - Region: closest to you
   - Click **"Create new project"** → wait ~2 min

3. **Create tables:**
   - Left sidebar → **SQL Editor**
   - Click **"New Query"**
   - Open `supabase-schema.sql` from this project
   - Copy the ENTIRE file contents, paste into editor
   - Click **"Run"** → should see Success

4. **Save your credentials:**
   - Left sidebar → **Settings** (gear icon) → **API**
   - Copy **Project URL** → e.g. `https://abc123.supabase.co`
   - Copy **anon public key** → long `eyJ...` string

---

### STEP 3: Set Up Google Login (5 min)

#### 3a. Google Cloud Console

1. Go to **https://console.cloud.google.com**
2. Top bar → **Select a project** → **New Project**
   - Name: `FlickPick` → Create
3. Left menu → **APIs & Services** → **OAuth consent screen**
   - Choose **External** → Create
   - App name: `FlickPick`
   - Support email: your email
   - Developer email: your email
   - Click **Save and Continue** through all steps → **Back to Dashboard**
4. Left menu → **APIs & Services** → **Credentials**
   - Click **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `FlickPick`
   - **Authorized redirect URIs** → click **+ Add URI**:
     ```
     https://YOUR-SUPABASE-PROJECT-ID.supabase.co/auth/v1/callback
     ```
     *(replace YOUR-SUPABASE-PROJECT-ID with your actual project ID from the Supabase URL)*
   - Click **Create**
5. Copy **Client ID** and **Client Secret**

#### 3b. Enable in Supabase

1. Supabase Dashboard → **Authentication** (left sidebar) → **Providers**
2. Find **Google** → click to expand
3. Toggle **Enable**
4. Paste **Client ID** and **Client Secret**
5. Click **Save**

---

### STEP 4: Push to GitHub (2 min)

1. Create a new repo: **https://github.com/new** → name it `flickpick`
2. On your computer:

```bash
cd flickpick
git init
git add .
git commit -m "FlickPick v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flickpick.git
git push -u origin main
```

---

### STEP 5: Deploy to Vercel (3 min)

1. Go to **https://vercel.com** → sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Select your `flickpick` repo
4. Framework: **Next.js** (auto-detected)
5. **Environment Variables** — add these 3:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (your anon key) |
| `TMDB_API_KEY` | Your TMDB v3 API key |

6. Click **Deploy** → wait 1-2 min

---

### STEP 6: Final Config (1 min)

1. Vercel gives you a URL like `https://flickpick-xyz.vercel.app`
2. Go to Vercel → **Settings** → **Environment Variables** → add:
   - `NEXT_PUBLIC_APP_URL` = `https://flickpick-xyz.vercel.app`
3. Go to Vercel → **Deployments** → click **⋯** on latest → **Redeploy**

---

## ✅ Done! Your App Is Live

Open your Vercel URL and test:

1. ✅ Sign in with Google works
2. ✅ Create a room → see room code
3. ✅ Select "🍿 Movies" → see movie categories
4. ✅ Select "📺 Web Series" → see series categories (Most Watched, New Seasons, etc.)
5. ✅ Select "🎬 Both" → see combined categories
6. ✅ Pick platforms → "Load Content" → see preview with movie/series badges
7. ✅ Series cards show: seasons, episodes, Ongoing/Ended status, network
8. ✅ Start swiping → results show type badges everywhere

---

## 💰 Cost: $0/month

| Service | Free Tier |
|---------|-----------|
| **Supabase** | 500MB DB, 50K users, Realtime, Auth |
| **Vercel** | 100GB bandwidth, serverless functions |
| **TMDB** | 1M API requests/day |
| **Google OAuth** | Unlimited |

---

## 🔧 Local Development

```bash
npm install
cp .env .env.local   # fill in your keys
npm run dev                         # http://localhost:3000
```

---

## 📁 Project Structure

```
flickpick/
├── src/
│   ├── app/
│   │   ├── page.js              # Home — create/join (auth-aware)
│   │   ├── login/page.js        # Google sign-in page
│   │   ├── profile/page.js      # User profile + watch history
│   │   ├── room/[code]/page.js  # ★ Full game flow (lobby→swipe→results)
│   │   ├── join/[code]/page.js  # Invite link landing
│   │   └── api/
│   │       ├── tmdb/            # Fetches live content from TMDB
│   │       ├── auth/callback/   # Google OAuth handler
│   │       ├── create-room/     # POST: create room
│   │       ├── join-room/       # POST: join room
│   │       ├── swipe/           # POST: record swipe, PATCH: mark done
│   │       └── results/[code]/  # GET: results, PATCH: update room
│   ├── components/
│   │   ├── SwipeCard.jsx        # ★ Movie vs Series card (different metadata)
│   │   ├── StarBG.jsx           # Animated star background
│   │   └── Toast.jsx            # Notification toasts
│   └── lib/
│       ├── tmdb.js              # ★ TMDB API (movies + series + providers)
│       ├── constants.js         # ★ Content types, categories per type
│       └── supabase.js          # Database client
├── supabase-schema.sql          # Database tables (run once)
└── ...configs
```
