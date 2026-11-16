# Carver

**Live app:** https://carver.aidank103.workers.dev (open in Safari on iPhone → Share → Add to Home Screen)

A free iPhone web app that puts workout tracking, food tracking, body weight, progress photos and your trends in one place. It's a beta for friends. You don't need the App Store or the $99 Apple fee, and it opens full-screen like a normal app.

Black and gold. The logo is a carved gold **C**.

## What it does

Five tabs: **Home, Workout, Nutrition, Fitness, Trends**. A gold bar above the tabs shows a workout in progress, with Resume.

### Home: today first
- **Rings**, like closing your rings on Apple Watch:
  - **Gym:** workouts this week against your weekly goal.
  - **Calories:** counts as hit within ±10% of your goal.
  - **Protein.**
  - **Up to 2 of your own daily goals** (water, steps…). Tap a goal's row to add 1.

  Closing a ring plays a short celebration once a day, and banners say "Hit your protein goal!" or "Hit your calorie goal!".
- **Today:** today's workout, food (calories and protein) and weigh-in, each with a quick button.
- **Monthly nudges:** set this month's goals, take this month's progress photo, and see last month's recap.
- **Calendar:** workout days are gold. A week turns gold when you hit your workouts-per-week goal. Tap a day to open that workout.
- **One-rep max tracker:** pick up to 4 lifts (it starts with your most-logged ones). Each card shows your estimated 1RM (Epley formula), the change since you started, and a mini graph. Tap a card for a full chart and every workout's best set.
- **Profile:** your name, "carving since", week streak, all-time workouts, weight lifted, records, hours trained, and recent personal records.

### Workout (like Hevy)
- **Start empty workout** or start one of your **plans** in one tap. You can keep up to **5 plans**.
- **Logging sets:**
  - Each exercise shows a **Previous** column (what you did last time).
  - The weight and reps boxes show grey hints, and ticking an empty set fills them in.
  - Tap the set number to mark it as a warm-up, drop set or failure set.
- **Rest timer** with −15 / +15 and Skip, and a chime when rest is over.
- **Summary when you finish**, with any personal records.
- **History** with Repeat and Save as a plan.
- **80 built-in exercises** plus your own custom ones. Choose lb or kg.
- **A workout in progress survives closing the app.**

### Nutrition (like Cronometer)
- **Quick add**: type "dinner 1000 calories" (or "chipotle bowl 850", "1200 cal lunch"). It picks the meal and fills in the calories. Three linked sliders split the calories into protein, carbs and fat and always add up to 100%. Presets: Balanced, High protein, Low carb.
- **Diary** for any day, by meal (breakfast, lunch, dinner, snacks). Macros come first, each with a bar toward its goal.
- **Micronutrients page:** your energy split, plus vitamins and minerals against adult targets. Things to stay under (sodium, saturated fat, cholesterol) turn red when you go over.
- **77 starter foods with emoji icons and real serving sizes**, a Recent list, category filters, and **Create food**.
- **Barcode scanner:** uses the camera and looks the product up in Open Food Facts, a free, open database. Scanned foods are saved to My foods. You can also type the barcode in.
- **Goals:** calories, protein, carbs, fat, workouts per week, and your own daily goals.

### Fitness
- **Weight:**
  - Log your weight.
  - See a 7-day-average trend chart and history over 1M, 3M, 1Y or All.
  - See changes over the last week, month and 3 months.
- **Import from Apple Health:** iPhone web apps can't read Health directly. Instead, a Shortcut copies your weights and you tap **Paste from Health**. It brings in history and skips duplicates. Smart scales that sync to Health are covered this way too.
- **Bluetooth scale:** scales that use the standard Bluetooth weight service connect directly, in browsers that support Bluetooth (Chrome on Android, or Bluefy on iPhone; Safari doesn't).
- **Progress photos:** saved on the phone, with a viewer and a side-by-side compare that shows your weight at each date.
- **Monthly goals** (build muscle, lose fat, get stronger…) and a **monthly recap**:
  - photo before and after
  - weight change
  - workouts, volume and PRs
  - your biggest 1RM gains
  - average calories and protein, and how many days you hit your protein goal

### Trends
- **Your metabolism:**
  - **Maintenance calories:** worked out from your average intake and the change in your weight trend (about 7,700 kcal per kg).
  - **Calories without workouts:** your logged training time is taken out (weight training counts as about 5 METs).
  - A confidence level, and a note on what data it still needs.
- **Charts:** weight trend, calories and protein (with goal lines), workouts per week and weekly volume. Ranges are 4W, 3M, 6M and 1Y. Tap or drag any chart to read the values.

### Everywhere
- **Export / restore** everything (except photos) as a JSON backup in Settings.
- Works offline once opened (gyms often have bad signal). Updates itself when you come back to the app.

## Files

| File | What it does |
|---|---|
| `index.html`, `styles.css` | The page and the black-and-gold iPhone look |
| `js/app.js`, `js/tabs.js` | Start-up, updates, the tab bar and the workout-in-progress bar |
| `js/ui.js` | Screens, sheets, alerts and other building blocks |
| `js/store.js` | Saving (on this phone), units, PRs, estimated 1RM, food totals, backups |
| `js/home.js` | Home: rings, today, calendar, profile |
| `js/onerm.js` | One-rep max tracker |
| `js/workout.js`, `js/session.js`, `js/block.js`, `js/picker.js`, `js/exercises.js` | Workout page, live workout, sets, exercise picker, exercise library |
| `js/nutrition.js`, `js/foods.js`, `js/barcode.js` | Food diary, quick add, micronutrients, food list, barcode scanner |
| `js/goals.js` | Goals sheet and custom daily goals |
| `js/fitness.js`, `js/body.js`, `js/photos.js`, `js/monthly.js` | Fitness tab, weight and imports, progress photos, monthly goals and recaps |
| `js/trends.js`, `js/charts.js` | Trends tab and metabolism estimate; line, bar, sparkline and ring charts |
| `js/settings.js`, `js/sound.js` | Settings, export/restore; the rest-timer chime |
| `sw.js`, `manifest.webmanifest`, `icons/` | Home-screen install, offline support, icons and launch screens |
| `scripts/make-icons.mjs` | Draws the logo and makes every icon and launch screen |

Chart colours (rings, macros) were checked for colour-blind readers and contrast on the dark background.

## Run it on your computer

```bash
python -m http.server 5181
```
Then open http://localhost:5181.

## Put it online (free)

It's on GitHub (`AidanKennedy103/carver`, private) and Cloudflare Workers. Every push to `main` updates the live app in about a minute. `wrangler.jsonc` serves the folder as it is (no build step), and `.assetsignore` keeps scripts and dev files off the site.

## Remake the icons

```bash
cd scripts && npm install && cd .. && node scripts/make-icons.mjs
```

## Known limits (beta)

- **Data is saved only on each phone for now.** Export a backup now and then (photos aren't included). Friends, sharing and accountability mode will need accounts and a shared database (Supabase, as in Free Park).
- **Apple Health and Cronometer can't sync automatically into a web app.** Health works through the Shortcut and paste. Fully automatic syncing needs the shared database, with a Shortcut sending your data to it.
- **Nutrition values are approximate.** The starter foods use USDA figures, and scanned foods come from Open Food Facts.
- **The metabolism estimate needs at least 10 days of food logs and 2 weigh-ins in the last 4 weeks.** It gets more accurate the more consistently you log.
