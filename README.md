# Carver

A free iPhone web app for tracking workouts, built in steps as a beta for friends. Open it in Safari, then **Share → Add to Home Screen**. You don't need the App Store or the $99 Apple fee, and it opens full-screen like a normal app.

Black and gold. The logo is a carved gold **C**.

## What it does (step 1: workout tracker)

- **Start empty workout** or start one of your **plans** in one tap.
- **My plans:** keep up to **5** routines (e.g. Push, Pull, Legs). Each one lists its exercises, sets, target weight and reps, rest time and notes. You can edit, rename, duplicate or delete a plan, or save any workout as a new plan.
- **Logging sets, like Hevy:** each exercise has a **Previous** column (what you did last time), weight and reps boxes with last time's numbers as grey hints, and a ✓ to tick off each set. Ticking an empty set fills in the hints. Tap the set number to make it a warm-up, drop set or failure set, or to delete it. Tap **Previous** to copy last time's numbers in.
- **Rest timer:** starts when you tick a set. It has −15 / +15 and Skip, and plays a chime when rest is over. You can set the rest time for each exercise or a default in Settings.
- **Live stats:** duration, volume and completed sets as you go.
- **Workouts survive closing the app:** the workout in progress is saved on every tap and reopens straight away. You can also **Hide** it and come back from the gold banner.
- **Finish:** a summary with any **personal records** (heaviest weight, best estimated 1RM, most reps).
- **History:** every workout, with a detail view, **Repeat**, **Save as a plan**, rename and delete.
- **80 exercises** across all muscle groups with search and muscle filters, plus your own **custom exercises** (weight × reps, reps only, or time).
- **lb or kg**, switchable any time. Weights are stored in kg, so switching never changes your numbers.
- **Export / restore** everything as a JSON backup (Settings), via the iPhone share sheet.
- Works offline once opened (gyms often have bad signal).

## Files

| File | What it does |
|---|---|
| `index.html`, `styles.css` | The page and the black-and-gold iPhone look |
| `js/app.js` | Start-up and automatic updates |
| `js/ui.js` | Screens, sheets, alerts and other building blocks |
| `js/store.js` | Saving (on this phone), units, PRs, estimated 1RM, backups |
| `js/exercises.js` | The exercise library |
| `js/workout.js` | Workout page, plan editor, history |
| `js/session.js` | The live workout, rest timer, summary |
| `js/block.js` | One exercise card with its sets |
| `js/picker.js` | The "Add exercises" picker and custom exercises |
| `js/settings.js` | Settings, export and restore |
| `sw.js`, `manifest.webmanifest`, `icons/` | Home-screen install, offline support, icons and launch screens |
| `scripts/make-icons.mjs` | Draws the logo and makes every icon and launch screen |

## Run it on your computer

```bash
python -m http.server 5181
```
Then open http://localhost:5181.

## Put it online (free)

Same setup as Free Park: GitHub plus Cloudflare.

1. **GitHub Desktop:** File → Add local repository → choose this `Carver` folder → **Publish repository** (untick "Keep this code private" if you like; either works).
2. **Cloudflare:** Workers & Pages → Create → **Import a repository** → pick `carver`. Leave the build command empty. `wrangler.jsonc` already tells it to serve this folder. Deploy.
3. You get a link like `carver.<your-name>.workers.dev`. Every push to GitHub updates it.

## Remake the icons

```bash
cd scripts && npm install && cd .. && node scripts/make-icons.mjs
```

## Known limits (beta)

- Data is saved only on each phone for now. Export a backup now and then. Friends and sharing will need accounts (Supabase), which come with the accountability features.
