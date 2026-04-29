# SFit — Shahnawaz's Fitness Dashboard

A personal PWA for tracking lifting, running, swimming, and recovery. Works offline, saves to home screen on iPhone.

## Setup

**1. Create a Supabase project**
Go to [supabase.com](https://supabase.com) → New project. Free tier is enough.

**2. Run the database setup**
In your Supabase project → SQL Editor → paste and run `setup.sql`.

**3. Add your credentials**
Edit `config.js`:
```js
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```
Find these in Supabase → Project Settings → API.

**4. Open in Safari on iPhone**
Either open the file locally or host it (see below).

**5. Add to Home Screen**
Safari → Share button → "Add to Home Screen" → name it "SFit" → Add.

Done. It's a PWA on your home screen and works offline.

---

## Hosting (optional but recommended)

For a real URL (required for push notifications and some PWA features):

**GitHub Pages (free):**
1. Push this folder to a GitHub repo
2. Settings → Pages → Source: main branch, root folder
3. Your app is live at `https://yourusername.github.io/repo-name`

**Any static host works:** Netlify, Vercel, Cloudflare Pages.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Entire app — HTML, CSS, JS |
| `manifest.json` | PWA manifest (name, icons, display) |
| `sw.js` | Service worker — offline caching |
| `config.js` | Your Supabase credentials (keep private) |
| `setup.sql` | Database schema — run once in Supabase |
| `icon-192.png` | PWA icon |
| `icon-512.png` | PWA icon |

**Note:** Add `config.js` to `.gitignore` if you push to a public repo.
