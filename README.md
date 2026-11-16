# Carver

**Live app:** https://carver.aidank103.workers.dev (open in Safari on iPhone → Share → Add to Home Screen)

A free iPhone web app that puts workout tracking, food tracking, body weight, progress photos and your trends in one place. It's a beta for friends. You don't need the App Store or the $99 Apple fee, and it opens full-screen like a normal app.

Black and gold. The logo is a gold blackletter **C**, drawn stroke by stroke with a broad pen (`scripts/letter.mjs`), with a hairline carved into its stem.

## What it does

Four tabs: **Home, Workout, Nutrition, Fitness**. **Progress** and **Trends** open from two cards on Home. A gold bar above the tabs shows a workout in progress, with Resume.

### Home: today first
- **Rings**, like closing your rings on Apple Watch. Pick up to 4 (pencil button): **Workout, Calories, Protein, Water, Weigh-in**, or up to 2 goals of your own (water, steps…).
  - **Today / Week** switch. Today shows each goal for today; tap one of your own goals to add 1. Week counts the days you've hit each goal since Monday, against the days a week you set for it (the Workout ring counts workouts against your workouts-per-week goal).
  - Calories count as hit within ±10% of your goal.
  - Closing a ring plays a short celebration (daily rings once a day, weekly rings once a week). Banners say "Hit your protein goal!" or "Hit your calorie goal!".
- **Today:** today's workout, food (calories and protein) and weigh-in, each with a quick button.
- **Groups:** friends who see each other's training. Make a group and share its invite code, or join one. Carver posts when you're at the gym (start a workout), finish a workout (with PRs), go for a run or ride, hit your protein or calorie goal, or close your weekly gym goal. You choose what each group sees under **What I share**. The latest posts show on Home.
- **Progress & trends cards:** your weight and 30-day change, and your maintenance calories, each with a mini graph. Tap one to open Progress or Trends.
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
- **Weekly sets per muscle:** a card on the Workout tab opens a breakdown by muscle group, in three views:
  - **Program:** set how many times a week you run each plan.
  - **Last 7 days.**
  - **4-week average.**

  Main-muscle sets count fully and helping muscles count half (triceps on bench press, biceps on rows…). Each muscle shows against a 10–20 set guide. Tap one to see which exercises count.
- **81 built-in exercises** (including weighted pull-ups) plus your own custom ones. Choose lb or kg.
- **A workout in progress survives closing the app.**

### Nutrition (like Cronometer)
- **Quick add**: type "dinner 1000 calories" (or "chipotle bowl 850", "1200 cal lunch"). It picks the meal and fills in the calories. Three linked sliders split the calories into protein, carbs and fat and always add up to 100%. **Lock a macro** by typing its grams (or tapping its lock): it stays fixed when the calories change, and the other two share what's left. Presets: **Fits my day** (splits the calories like the macros you still have left today), Balanced, High protein, Low carb.
- **Diary** for any day, by meal (breakfast, lunch, dinner, snacks). Macros come first, each with a bar toward its goal.
- **Micronutrients page:** your energy split, plus vitamins and minerals against adult targets. Things to stay under (sodium, saturated fat, cholesterol) turn red when you go over.
- **About 480 starter foods with icons and real serving sizes**: meats and fish, protein supplements, takeout and meal-prep meals, sauces and dressings, coffee drinks and more, a Recent list, category filters, and **Create food**. Search matches every word you type, so "greek yog" finds Greek yogurt.
- **Search online:** if a food isn't in Carver, tap "Search online" to look it up in Open Food Facts by name (products sold in Canada first). Foods you pick are kept in My foods.
- **Water:** a card on Nutrition with +250, +500 and +750 ml buttons and a glass-by-glass bar. Set your daily target in Goals. Water can also be a ring on Home (tap its row to add 250 ml).
- **Log it again:** tap an entry on an earlier day to add it to today.
- **Favorites:** tap ☆ on any food to keep it in a Favorites list. Search puts favorites, your own foods and the foods you log most at the top.
- **Recipes:** build a dish from foods (Add food → Create → New recipe), set how many servings it makes and, if you like, its cooked weight. Log a serving like any food, with every vitamin and mineral added up. Tap Edit recipe to change it.
- **Edit or delete your own foods** from the food's amount screen.
- **Report:** averages over the last 7 or 30 days:
  - calories and macros against your goals, and how many days you hit them
  - energy split and calories by meal
  - your top foods for calories and protein
  - vitamins and minerals, with the ones you're often low on (or over the limit)
- **Suggested goals:** in Goals, pick Lose fat, Maintain or Build muscle. Carver suggests calories from your maintenance estimate (or your weight, to start) and protein from your body weight.
- **The amount screen** lists the vitamins and minerals a food is rich in, and flags high sodium.
- **Meal shortcuts:** each meal's ⋯ menu can copy yesterday's meal, save the meal to reuse it (it appears under **Meals** when you add food), or clear it.
- **Import from Cronometer:** in Settings, pick Cronometer's "Food & Recipe Entries" export (CSV). Every entry comes in with its nutrients, in the right meal, and pasting the same file twice is fine.
- **Shared food database:** when you're signed in, foods you create (with the switch on) and foods you scan are added for everyone, under **Community**. For the beta they appear straight away. To review them first, see the note in `supabase/schema.sql`.
- **Barcode scanner:** uses the camera and looks the product up in Open Food Facts, a free, open database. It checks your foods and the Carver database first. Scanned foods are saved to My foods. You can also type the barcode in.
- **Goals:** calories, protein, carbs, fat, water, workouts per week (optionally on set days: Home then shows rest days, the next planned day, and planned days on the calendar), and your own daily goals. Calories and macros are linked: type any three and the one you changed longest ago fills itself in (marked *auto*).
- **Week strip:** Monday to Sunday under the date, each day's calories against your goal (gold when on target). Tap a day to jump to it.
- **Eaten or left:** tap the macro bars to switch between grams eaten and grams left.
- **Per meal:** each meal shows its protein, carbs and fat.
- **Nutrition facts:** the amount screen opens a full list of nutrients with % of daily targets.
- **Food icons:** emoji, plus small drawings for foods no emoji fits (protein bars, shakes, powder, tofu…).

### Fitness: runs, rides and other cardio
- **Import from Apple Health:** a Shortcut copies your workouts (Apple Watch, Strava, Nike Run Club, anything that saves to Health) and you tap **Paste from Health**. It reads the Shortcut's lines, CSV, or JSON from export apps, skips ones already imported, and leaves out strength workouts (log those in Workout).
- **Add by hand:** run, walk, ride, hike, swim, row, elliptical, HIIT, sport, yoga. Leave calories blank to get an estimate.
- **This week** (activities, distance, active calories), minutes per week for 12 weeks, and every activity with distance and pace.
- Cardio counts in the metabolism estimate on Trends.

### Progress (from Home): weight, photos, monthly
- **Weight:**
  - Log your weight.
  - See a 7-day-average trend chart and history over 1M, 3M, 1Y or All.
  - See changes over the last week, month and 3 months.
- **Import weight from Apple Health:** iPhone web apps can't read Health directly. Instead, a Shortcut copies your weights and you tap **Paste from Health**. It brings in history and skips duplicates. Smart scales that sync to Health are covered this way too.
- **Bluetooth scale:** scales that use the standard Bluetooth weight service connect directly, in browsers that support Bluetooth (Chrome on Android, or Bluefy on iPhone; Safari doesn't).
- **Progress photos:** saved on the phone, with a viewer and a side-by-side compare that shows your weight at each date.
- **Monthly goals** (build muscle, lose fat, get stronger…) and a **monthly recap**:
  - photo before and after
  - weight change
  - workouts, volume and PRs
  - your biggest 1RM gains
  - average calories and protein, and how many days you hit your protein goal

### Trends (from Home)
- **Your metabolism:**
  - **Maintenance calories:** worked out from your average intake and the change in your weight trend (about 7,700 kcal per kg).
  - **Calories without workouts:** your gym time (about 5 METs) and your cardio (Health's active calories, or an estimate) are taken out.
  - A confidence level, and a note on what data it still needs.
- **Charts:** weight trend, calories and protein (with goal lines), workouts per week and weekly volume. Ranges are 4W, 3M, 6M and 1Y. Tap or drag any chart to read the values.

### Everywhere
- **Swipes:** swipe right from the left edge to go back. Swipe the rings for Today / Week, the calendar for months, Nutrition for days (the week strip for weeks), progress photos for the next one, and Trends, Report, Weight and Volume to change the range.
- **Accounts and sync:** sign in with your email (Home → Settings → Sign in with email, then type the code you're emailed) on each device and they share one account. Workouts, food, weights, activities, goals and progress photos sync. Changes from both devices are merged, so nothing logged on either is lost, and deleting something on one removes it on the other.
- **Export / restore** everything (except photos) as a JSON backup in Settings.
- **Delete account** (Settings → Account) removes your synced data, photos, group memberships and posts.
- **About & privacy** (Settings): what's stored where, food-data credits (USDA; Open Food Facts under ODbL), open-source licenses, and a not-medical-advice note.
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
| `js/volume.js` | Weekly sets per muscle group (program and logged) |
| `js/workout.js`, `js/session.js`, `js/block.js`, `js/picker.js`, `js/exercises.js` | Workout page, live workout, sets, exercise picker, exercise library |
| `js/nutrition.js` | The food diary page and meal shortcuts |
| `js/foods.js`, `js/foods-more.js` | The starter food list (per 100 g) and nutrient targets |
| `js/foodpicker.js`, `js/quickadd.js`, `js/recipes.js` | Finding foods and amounts, favorites, creating and editing foods; quick add; recipes |
| `js/food-icons.js` | Drawn icons for foods with no good emoji |
| `js/about.js` | About & privacy screen |
| `js/nutrition-report.js`, `js/food-util.js` | Day micronutrients and the 7/30-day report; shared nutrition helpers |
| `js/foods.js`, `js/barcode.js`, `js/cronometer.js` | Food list, barcode scanner, Cronometer import |
| `js/goals.js` | Goals sheet and custom daily goals |
| `js/fitness.js` | Fitness tab: cardio activities, Health import |
| `js/progress.js`, `js/body.js`, `js/photos.js`, `js/monthly.js` | Progress tab, weight and imports, progress photos, monthly goals and recaps |
| `js/cloud.js`, `js/account.js`, `js/config.js` | Sign-in, syncing and merging, photo sync, shared food database; your Supabase settings |
| `supabase/schema.sql` | Database setup for accounts, sync, shared foods and photos |
| `js/groups.js`, `supabase/groups.sql` | Groups: invite codes, posting, the feed, what each person shares |
| `js/trends.js`, `js/charts.js` | Trends tab and metabolism estimate; line, bar, sparkline and ring charts |
| `js/settings.js`, `js/sound.js` | Settings, export/restore; the rest-timer chime |
| `sw.js`, `manifest.webmanifest`, `icons/` | Home-screen install, offline support, icons and launch screens |
| `scripts/letter.mjs`, `scripts/make-icons.mjs` | Draws the blackletter C, and makes every icon and launch screen |

Chart colours (rings, macros) were checked for colour-blind readers and contrast on the dark background.

## Run it on your computer

```bash
python -m http.server 5181
```
Then open http://localhost:5181.

## Turn on accounts (free)

1. Create a free project at supabase.com. Then open **SQL Editor**, paste `supabase/schema.sql`, and click **Run**.
2. Sign-in is by email code, with no password. In **Authentication → Emails → Templates → Magic Link**, put `{{ .Token }}` in the email (for example "Your Carver code is {{ .Token }}") so it contains the code. A link can't be used, because on iPhone it opens Safari instead of the home-screen app.
3. For groups and account deletion, also run `supabase/groups.sql` the same way.
4. Copy the Project URL and the publishable (or anon) key from **Project Settings → API Keys** into `js/config.js`, and push.

Until then, Carver runs without accounts and everything stays on each phone.

## Put it online (free)

It's on GitHub (`AidanKennedy103/carver`, private) and Cloudflare Workers. Every push to `main` updates the live app in about a minute. `wrangler.jsonc` serves the folder as it is (no build step), and `.assetsignore` keeps scripts and dev files off the site.

## Remake the icons

```bash
cd scripts && npm install && cd .. && node scripts/make-icons.mjs
```

## Before charging money

- **Open Food Facts** data is under the ODbL: keep the credit (it's on About & privacy), and the shared food database must stay open under the same license if you share it.
- Add a **privacy policy** and **terms of service** (health data: PIPEDA in Canada, US state health-data laws, GDPR for EU users), a minimum age, and a business entity before taking payments. Account deletion is already built in.
- Check the **"Carver" trademark** for apps and fitness.

## Known limits (beta)

- **Without an account, data is saved only on that phone.** Export a backup now and then (photos aren't included). Friends and accountability mode can build on the same accounts.
- **Apple Health and Cronometer can't sync automatically into a web app.** Health weights and workouts come in through Shortcuts and paste. Cronometer history comes in from its CSV export.
- **Supabase's built-in email sends only a few emails an hour.** Once signed in you stay signed in, so that's fine for a beta. If friends hit the limit, connect a free email service (like Resend) under Authentication → Emails → SMTP.
- **If both devices change the same setting before syncing**, the device that syncs last keeps its own. Lists (workouts, food, weights, activities, photos) are always merged.
- **Nutrition values are approximate.** The starter foods use USDA figures, and scanned foods come from Open Food Facts.
- **The metabolism estimate needs at least 10 days of food logs and 2 weigh-ins in the last 4 weeks.** It gets more accurate the more consistently you log.
