# CLAUDE.md — Shahnawaz's Fitness Tracking PWA

## Project Overview

Build a **Progressive Web App (PWA)** fitness dashboard for a user named Shahnawaz. It must work on mobile (iPhone), be saveable to the home screen, work offline, and sync data via Supabase.

**Stack:** Plain HTML + CSS + JavaScript only. No frameworks, no npm, no build tools. Single `index.html` file with inline CSS and JS, plus a `manifest.json` and `sw.js` for PWA support.

**Database:** Supabase (Postgres). The user will provide their own `SUPABASE_URL` and `SUPABASE_ANON_KEY` via a `config.js` file (not hardcoded).

---

## Tech Requirements

### PWA Setup
- `manifest.json` with app name "Shahnawaz Fit", short_name "SFit", theme color `#185FA5`, background `#ffffff`, display `standalone`, icons at 192×192 and 512×512 (generate simple SVG-based icons or use placeholder PNGs)
- `sw.js` — service worker that caches the app shell for offline use. Cache: `index.html`, `manifest.json`, `config.js`. Network-first for Supabase calls, cache-first for static assets.
- Add to `index.html`: `<link rel="manifest" href="manifest.json">` and register the service worker in a `<script>` block.

### Supabase Setup
- Load Supabase via CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`
- User provides `config.js`:
  ```js
  const SUPABASE_URL = 'https://your-project.supabase.co';
  const SUPABASE_ANON_KEY = 'your-anon-key';
  ```
- Include `<script src="config.js"></script>` before the main script.

### Supabase Tables (include SQL in a `setup.sql` file)

```sql
-- Session logs
create table sessions (
  id uuid default gen_random_uuid() primary key,
  week int not null,
  day_index int not null,  -- 0=Mon ... 6=Sun
  date date not null,
  completed boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Strength maxes log
create table maxes (
  id uuid default gen_random_uuid() primary key,
  lift text not null,  -- 'deadlift_sumo', 'squat_lowbar', 'bench'
  weight_kg numeric not null,
  is_pre_break boolean default false,
  logged_at timestamptz default now()
);

-- Daily notes / journal
create table daily_notes (
  id uuid default gen_random_uuid() primary key,
  note_date date not null unique,
  content text,
  energy_rating int,  -- 1-10
  soreness_rating int,  -- 1-10
  updated_at timestamptz default now()
);
```

Enable Row Level Security but set permissive policies for anon key (this is a personal app):
```sql
alter table sessions enable row level security;
alter table maxes enable row level security;
alter table daily_notes enable row level security;
create policy "Allow all" on sessions for all using (true);
create policy "Allow all" on maxes for all using (true);
create policy "Allow all" on daily_notes for all using (true);
```

---

## App Structure

Single `index.html`. Navigation is a **bottom tab bar** (mobile-native feel) with these tabs:

1. **Schedule** (home/default)
2. **This Week** (session tracker)
3. **Running** (plan + prehab videos)
4. **Mobility** (post-lift videos)
5. **Maxes** (strength log)
6. **Recovery** (sauna, swim, massage guide)

---

## Design System

Mobile-first. Target viewport: 390px wide (iPhone). Clean, flat design. No gradients, no shadows.

### Colors
```css
--blue-50: #E6F1FB;
--blue-400: #378ADD;
--blue-800: #0C447C;
--green-50: #EAF3DE;
--green-600: #3B6D11;
--green-800: #27500A;
--teal-50: #E1F5EE;
--teal-600: #0F6E56;
--amber-50: #FAEEDA;
--amber-600: #854F0B;
--coral-100: #F5C4B3;
--coral-800: #712B13;
--gray-50: #F1EFE8;
--gray-200: #B4B2A9;
--text-primary: #1a1a1a;
--text-secondary: #555;
--text-tertiary: #999;
--bg-primary: #ffffff;
--bg-secondary: #f5f5f3;
--border: rgba(0,0,0,0.1);
```

### Typography
- Font: system-ui, -apple-system, sans-serif
- Body: 15px / line-height 1.6
- Labels: 11px uppercase, letter-spacing 0.08em
- Headings: 20px, weight 500
- No bold (700) — use 500 only

### Components
- **Cards:** white bg, 1px border rgba(0,0,0,0.08), border-radius 14px, padding 16px 20px
- **Pills/badges:** inline-block, border-radius 20px, 11px font, 3px 10px padding
- **Bottom nav:** fixed bottom, 60px height, 5 icons + labels, active state uses blue
- **Day rows in schedule:** 44px label column, flex layout
- **Video link rows:** 40px thumbnail (colored square with ▶), title + subtitle, arrow →
- **Check rows:** 20px checkbox (border-radius 6px, turns blue when checked), text beside
- **Stat cards:** gray bg, 12px label above, 22px value, 11px subtitle
- **Progress bars:** 6px height, border-radius 20px, blue fill

### Dark mode
Support via `@media (prefers-color-scheme: dark)`. Invert bg/text, keep color pills readable.

---

## Tab 1: Schedule

Show the fixed weekly schedule. Not editable — it's locked in. Display as a vertical list of day rows.

**Weekly schedule data:**
```js
const SCHEDULE = [
  {
    day: 'Monday',
    type: 'lift',
    sessions: [{ label: 'Lift', color: 'blue', text: 'Lower — Squat focus', sub: 'Gymkhana · daytime' }]
  },
  {
    day: 'Tuesday',
    type: 'lift',
    sessions: [{ label: 'Lift', color: 'blue', text: 'Upper — Push + Pull', sub: 'Gymkhana · daytime' }]
  },
  {
    day: 'Wednesday',
    type: 'mob+run',
    sessions: [
      { label: 'Mobility', color: 'amber', text: '15 min post-session stretching', sub: 'Gymkhana · see Mobility tab' },
      { label: 'Run', color: 'green', text: 'Treadmill run — light recovery', sub: 'Gymkhana treadmill · zone 2 · easy pace' }
    ]
  },
  {
    day: 'Thursday',
    type: 'lift',
    sessions: [{ label: 'Lift', color: 'blue', text: 'Lower — Deadlift focus', sub: 'Gymkhana · daytime' }]
  },
  {
    day: 'Friday',
    type: 'lift',
    sessions: [{ label: 'Lift', color: 'blue', text: 'Upper — Strength + accessory', sub: 'Gymkhana · daytime' }]
  },
  {
    day: 'Saturday',
    type: 'run+swim',
    sessions: [
      { label: 'Run', color: 'green', text: 'Outdoor run — 3am (earlier the better)', sub: 'Apple Watch · Outdoor Run workout · zone 2' },
      { label: 'Swim', color: 'teal', text: 'Gymkhana pool — active recovery', sub: 'Run → shower → swim · Sauna after swim' }
    ]
  },
  {
    day: 'Sunday',
    type: 'rest',
    sessions: [{ label: 'Rest', color: 'gray', text: 'Full rest — no guilt', sub: 'Light walk, family time, eat well' }]
  }
];
```

Below the schedule, show a **12-week phase bar:**
- Phase 1 (Wk 1–4): Rebuild — light blue
- Phase 2 (Wk 5–8): Build — mid blue
- Phase 3 (Wk 9–12): Push — dark blue

Show current week (user can set it). A "Week X of 12" indicator with ‹ › nav arrows.

---

## Tab 2: This Week

Week selector (‹ Week X of 12 ›) at top.

Show 7 day cells in a horizontal grid (Mon–Sun). Each cell:
- Shows day initial + session type label
- Color-coded by type (blue=lift, green=run, teal=swim, amber=mob, gray=rest, purple=combo)
- Tap to mark done (fades to 40% opacity, shows ✓)
- Persists to Supabase `sessions` table

Below the grid, show **Today's checklist** — auto-detects today's day of week and shows relevant tasks:

```js
const DAILY_TASKS = {
  lift_lower: [
    'Warm up 5–10 min',
    'Log sets in Hevy app',
    'Squat / RDL / Leg press / Nordic curl / Calf raises',
    'Mobility 10–15 min after (see Mobility tab)',
    'Sauna after if available'
  ],
  lift_upper: [
    'Warm up 5–10 min',
    'Log sets in Hevy app',
    'Bench / OHP / Rows / Pulldowns / Face pulls / Rear delts',
    'Mobility 10–15 min after (see Mobility tab)',
    'Sauna after on Tuesdays'
  ],
  mob_run: [
    'Mobility: Hip flexor couch stretch (2 min each side)',
    'Mobility: 90/90 hip rotations',
    'Mobility: Book opener thoracic stretch',
    'Mobility: Ankle dorsiflexion',
    'Pre-run prehab (5 min — see Running tab)',
    'Treadmill run — keep it zone 2, easy breathing',
    'Log run on Strava / Apple Watch'
  ],
  lift_deadlift: [
    'Warm up 5–10 min',
    'Log sets in Hevy app',
    'Sumo DL / Deficit pulls / Hack squat / Lunges / Leg curl / Tibialis raises',
    'Mobility 10–15 min after (see Mobility tab)',
    'Consider easy swim tomorrow as active recovery'
  ],
  lift_upper_fri: [
    'Warm up 5–10 min',
    'Log sets in Hevy app',
    'Heavy bench/press / Weighted chins / Cable rows / Arms / Rotator cuff',
    'Mobility 10–15 min after',
    'Eat a proper meal before work',
    'Sleep well — 3am run tomorrow'
  ],
  run_swim: [
    'Pre-run prehab (5 min — see Running tab)',
    'Outdoor run on Apple Watch — Outdoor Run workout',
    'Keep heart rate zone 2 (conversational pace)',
    'Log run to Strava',
    'Shower before heading to Gymkhana',
    'Swim session — easy, recovery focus (see Swimming tab)',
    'Sauna 15–20 min after swim',
    'Note how knees/shins felt (1–10) in journal below'
  ],
  rest: [
    'Full rest — zero training',
    'Light walk if you feel like it',
    '7–8 hours sleep tonight',
    'Check Apple Watch HRV in Health app'
  ]
};
```

Map days: Mon→lift_lower, Tue→lift_upper, Wed→mob_run, Thu→lift_deadlift, Fri→lift_upper_fri, Sat→run_swim, Sun→rest.

Checklist items are checkboxes, tap to toggle. Save state locally (localStorage for checklist, resets daily).

Below checklist: **Session journal** — textarea for notes, energy rating (1–10 emoji slider or dots), soreness rating (1–10). Save button → writes to Supabase `daily_notes`.

---

## Tab 3: Running

### Phase progression (collapsible cards or stacked blocks with left border)

**Phase 1 — Weeks 1–4: C25K Restart**
You're restarting C25K from Week 1. 2 runs/week: Wed treadmill (easy, zone 2), Sat outdoor (3am, main C25K session). Focus on form — mid-foot strike, short stride, soft knees, easy breathing. Log every run on Runna + Strava. Note knee/shin soreness 1–10 after each run.

**Phase 2 — Weeks 5–8: 5K Base**
Complete C25K. Treadmill run stays easy. Sat run gets longer (25–30 min). Add strides: 6×20 sec fast bursts after easy runs. Apple Watch pace will visibly improve week to week.

**Phase 3 — Weeks 9–12: 5K → 10K**
Sat becomes your long run (35–50 min, very easy). Wed stays moderate. By week 12: comfortable 5K anytime, one 7–8K long run done. 10K is a month beyond that.

### Pre-run prehab videos (tap to open YouTube)

```js
const PREHAB_VIDEOS = [
  {
    title: 'Tibialis anterior raises',
    sub: '3 × 20 — prevents shin splints',
    url: 'https://www.youtube.com/results?search_query=tibialis+anterior+raises+for+runners'
  },
  {
    title: 'Eccentric calf raises',
    sub: '3 × 12 slow — Achilles & soleus protection',
    url: 'https://www.youtube.com/results?search_query=eccentric+calf+raises+achilles+tendon'
  },
  {
    title: 'Banded clamshells',
    sub: '2 × 20 each side — hip abductors, knee tracking',
    url: 'https://www.youtube.com/results?search_query=banded+clamshells+for+runners+hip+abductor'
  },
  {
    title: 'Single-leg balance drills',
    sub: '30 sec each side — ankle proprioception',
    url: 'https://www.youtube.com/results?search_query=single+leg+balance+ankle+stability+running'
  },
  {
    title: 'Hip flexor + glute activation warm-up',
    sub: 'Full pre-run routine — essential before night runs',
    url: 'https://www.youtube.com/results?search_query=hip+flexor+glute+activation+pre+run+warm+up'
  }
];
```

### Running form cues (card)
Mid-foot strike, not heel · Short stride, higher cadence · Soft knees on landing · Hips forward, not sitting back · Breathing: in through nose 3 steps, out through mouth 2

### Apple Watch settings (card)
Workout: Outdoor Run / Treadmill Run · Heart rate alert on · Auto-pause on · Sync: Runna → Apple Health → Strava · Zone 2 = roughly 130–145 bpm (check your own zones after first run)

---

## Tab 4: Mobility

### Post-lift routine videos (do all 5, ~12 min after every session)

```js
const MOBILITY_VIDEOS = [
  {
    title: 'Hip flexor couch stretch',
    sub: '2 min each side — #1 for powerlifters, helps running stride',
    url: 'https://www.youtube.com/results?search_query=couch+stretch+hip+flexor+mobility'
  },
  {
    title: '90/90 hip rotations',
    sub: '2 min — internal + external rotation, helps sumo DL + swimming kick',
    url: 'https://www.youtube.com/results?search_query=90+90+hip+rotation+mobility+exercise'
  },
  {
    title: 'Thoracic spine book opener',
    sub: '10 reps each side — unlocks chest for bench + freestyle stroke',
    url: 'https://www.youtube.com/results?search_query=book+opener+thoracic+spine+mobility'
  },
  {
    title: 'Ankle dorsiflexion mobility',
    sub: '2 min each — critical for squat depth + running form',
    url: 'https://www.youtube.com/results?search_query=ankle+dorsiflexion+mobility+squat+running'
  },
  {
    title: 'Shoulder CARs',
    sub: '10 reps each — joint health for bench + swimming stroke',
    url: 'https://www.youtube.com/results?search_query=shoulder+CARs+controlled+articular+rotations'
  }
];
```

### Wednesday full session videos (~20–25 min)

```js
const MOB_FULL_VIDEOS = [
  {
    title: 'Full body mobility for lifters',
    sub: '20 min · hips, spine, ankles, shoulders',
    url: 'https://www.youtube.com/results?search_query=full+body+mobility+routine+powerlifters+20+minutes'
  },
  {
    title: 'Pigeon pose + hip opener flow',
    sub: '10 min · best for tight hips post-deadlift',
    url: 'https://www.youtube.com/results?search_query=pigeon+pose+hip+opener+flow+yoga'
  },
  {
    title: "Swimmer's shoulder mobility",
    sub: '10 min · rotator cuff + thoracic · great before swim days',
    url: 'https://www.youtube.com/results?search_query=swimmers+shoulder+mobility+rotator+cuff'
  }
];
```

### Quick reference card
What each stretch targets — render as a small table or list:
- Couch stretch → hip flexors (helps running stride)
- 90/90 → hip rotation (helps sumo DL + swimming kick)
- Book opener → thoracic (helps bench + freestyle stroke)
- Ankle mob → dorsiflexion (helps squat + running form)
- Shoulder CARs → joint health (protects bench + swim)

---

## Tab 5: Maxes

### Pre-break maxes (editable inputs, saves to Supabase)
Default values pre-filled:
- Deadlift (sumo): 220 kg
- Squat (low bar): 170 kg
- Bench press: 120 kg

### Current maxes (user logs as they test)
- Deadlift (sumo): empty (hint: "Est. ~188kg from 160kg conv @ RPE 7.5")
- Squat (low bar): empty
- Bench press: empty (hint: "Est. ~110kg from 100kg × 3 @ RPE 9.5")

### Recovery percentage
When current maxes are entered, show percentage bars:
`recovery% = Math.round((current / preBbreak) * 100)`
Show blue progress bar, percentage label.

### Week 12 targets card
- Deadlift (sumo): 195–205 kg
- Squat (low bar): 148–158 kg
- Bench press: 112–118 kg
- Note: "Sumo will outperform conventional — expect 200kg+ by week 10. Muscle memory is real."

### Maxes history log
Show last 5 entries from Supabase `maxes` table as a simple list with date + lift + weight.

"Log new max" button → opens a small inline form: lift selector, weight input, save button → writes to Supabase.

---

## Tab 6: Recovery

### Sections (left-border blocks, coral/red accent)

**Sauna — Gymkhana (post-lift or post-swim)**
15–20 min at 80–90°C, 2–3×/week. Best days: after Tuesday lift, after Saturday swim. Do NOT sauna after runs — heart rate already elevated. Accelerates muscle recovery, boosts growth hormone, improves cardiovascular adaptation.

**Massage — Gymkhana massage center (fortnightly)**
Priority muscle groups: hamstrings + hip flexors (DL + running), thoracic + lats (bench + swimming), calves + tibialis (running prehab). Tell the therapist: powerlifter returning from break, now running and swimming.

**Apple Watch HRV tracking**
Check HRV every morning in Apple Health app. If HRV is significantly below your baseline (especially after big training days), treat Wednesday as full rest instead of mobility + run. Trust the data over the plan.

**Saturday recovery sequence**
Run → shower → Gymkhana → Swim (easy, 20–30 min) → Sauna (15–20 min). This is the best recovery protocol in the plan. Running loads the legs, swimming unloads them. Don't cut it short.

**Sleep + nutrition basics**
- 7–8 hours non-negotiable — managing a business, job, and 6 training sessions/week
- Protein: 2g per kg of bodyweight daily
- Pre-run (Sat 3am): light snack — banana, dates, or toast. Never run fasted after a lift day.
- Post-lift: protein + carbs within 60 min
- Hydrate aggressively — Lahore heat is real, especially on run days

### Weekly recovery rhythm card
```
Every session → 10 min mobility + shower
Tue + Sat     → Sauna (15–20 min)
Sat           → Run → Swim → Sauna sequence
Fortnightly   → Gymkhana massage
Every morning → Check HRV in Apple Health
Sunday        → Full rest, 7–8 hrs sleep
```

---

## Lifting Plan Detail

Available in Schedule tab or as a collapsible section. The 4-day split:

**Day 1 (Monday) — Lower: Squat Focus**
Low bar squat · Pause squat · Romanian deadlift · Leg press · Nordic curl · Calf raises

**Day 2 (Tuesday) — Upper: Push + Pull**
Bench press · Incline dumbbell press · Overhead press · Barbell row · Lat pulldown · Face pulls · Rear delts

**Day 3 (Thursday) — Lower: Deadlift Focus**
Sumo deadlift · Deficit pulls · Hack squat · Lunges · Leg curl · Tibialis raises

**Day 4 (Friday) — Upper: Strength + Accessory**
Heavy bench/press · Weighted chin-ups · Cable rows · Biceps/triceps · Rotator cuff work · Swimmer's shoulder

### Phase progression for lifting:
- **Phase 1 (Wk 1–4):** 8–12 reps, 65–75% 1RM. Re-groove patterns. Log in Hevy.
- **Phase 2 (Wk 5–8):** 4–6 reps, 75–85% 1RM. RPE-based top sets. Near-max accessory.
- **Phase 3 (Wk 9–12):** 87–92% 1RM top sets. Near-max work. Week 12: attempt comeback 1RMs.

---

## Swimming Plan Detail

Available in its own card or section under Schedule.

**Phase 1 (Wk 1–4):** 1×/week, Sat post-run. 20–30 min easy. No sets, no clock. Reconnect with the water. Muscle memory returns fast.

**Phase 2 (Wk 5–8):** Structure returns. 6–8×50m with 20 sec rest, or 4×100m. Drills: catch-up drill, fingertip drag, bilateral breathing. Sessions hit 1,000–1,200m.

**Phase 3 (Wk 9–12):** 1,500–2,000m sessions. Mix aerobic sets with faster 50s. Week 12 goal: 1km continuous. Freestyle rebuilt.

---

## File Structure

```
/
├── index.html       ← entire app (HTML + CSS + JS inline)
├── manifest.json    ← PWA manifest
├── sw.js            ← service worker
├── config.js        ← user fills in Supabase credentials (gitignored)
├── setup.sql        ← Supabase table setup script
├── icon-192.png     ← PWA icon (generate or placeholder)
├── icon-512.png     ← PWA icon (generate or placeholder)
└── README.md        ← setup instructions
```

---

## README.md (generate this too)

Include step-by-step setup:
1. Create a free Supabase project at supabase.com
2. Run `setup.sql` in the Supabase SQL editor
3. Copy your project URL and anon key into `config.js`
4. Open `index.html` in Safari on iPhone
5. Tap Share → Add to Home Screen → "SFit"
6. Done — it's now a PWA on your home screen, works offline

Optional: host on GitHub Pages or any static host for a real URL (not required).

---

## Implementation Notes for Claude Code

- Keep everything in one `index.html` file. CSS in `<style>`, JS in `<script>` at bottom.
- All Supabase calls should be async/await with try/catch. Show a small error message if Supabase is unavailable — fall back to localStorage gracefully.
- localStorage is the offline cache: mirror every Supabase write to localStorage, read from localStorage first when offline.
- Bottom nav must be fixed, 60px tall, above any content. Main content area has `padding-bottom: 80px` to not be hidden behind nav.
- Smooth tab switching — no page reloads. Show/hide sections via JS.
- All tap targets minimum 44×44px (Apple HIG standard).
- No external fonts. System font stack only.
- Test in Safari mobile viewport (390px). No horizontal scroll.
- Video links open in a new tab (`window.open(url, '_blank')`).
- The app should feel fast and native. No loading spinners unless doing a Supabase fetch.
- Week number persists to localStorage. Default to week 1 on first load.
- Current phase is derived from week number automatically (1–4 = Rebuild, 5–8 = Build, 9–12 = Push).
- Checklist items reset daily (keyed by date string). Session completion (week grid dots) persists across weeks in Supabase.

---

## Tone + Personality

This is a personal app for one person. It can have personality. The user is a serious powerlifter and former national-level swimmer who is learning to run for the first time. He manages businesses and works late nights. The app should feel motivating but not annoying — no excessive emojis, no "great job!" popups. Clean, focused, like a good training partner who respects your time.

The recovery section can have a small note: "Sat run → swim → sauna is the best sequence in this plan. Don't skip it."

The maxes section can note: "You're at ~87% of your pre-break strength already. Muscle memory is real — you're not starting over."
