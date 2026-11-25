# Carver

**Live app:** https://carver.aidank103.workers.dev (open in Safari on iPhone → Share → Add to Home Screen)

A free iPhone web app that puts workout tracking, food tracking, body weight, progress photos and your trends in one place. It's a beta for friends. You don't need the App Store or the $99 Apple fee, and it opens full-screen like a normal app.

Black and gold, with a light mode (Settings → Appearance: Dark, Light or Match phone; dark is the default). The logo is a gold blackletter **C**, drawn stroke by stroke with a broad pen (`scripts/letter.mjs`), with a hairline carved into its stem.

## What it does

Four tabs: **Home, Workout, Nutrition, Fitness**. **Progress** and **Trends** open from two cards on Home. A gold bar above the tabs shows a workout in progress, with Resume.

### Home: today first
- **Customizable Home:** Settings → **Edit Home page** (or the link at the bottom of Home) puts Home in edit mode: each section gets an outline with a remove button and a grip to drag it into place, and **+ Add to Home** opens a gallery with a live preview of each section. Sections: goal rings, rest-day check, daily goals, next workout, this week, calories & macros, water, readiness, progress & trends, strength progression, workout calendar, today, monthly reminders, groups, profile & stats.
- **Rings**, like closing your rings on Apple Watch. Pick up to 6 (pencil button): **Workout, Calories, Protein, Water, Weigh-in**, or up to 2 goals of your own (water, steps…).
  - **Today / Week** switch. Today shows each goal for today; tap one of your own goals to add 1. Week counts the days you've hit each goal since Monday, against the days a week you set for it (the Workout ring counts workouts against your workouts-per-week goal).
  - Calories count as hit within ±10% of your goal.
  - Closing a ring plays a short celebration (daily rings once a day, weekly rings once a week). Banners say "Hit your protein goal!" or "Hit your calorie goal!".
- **Today:** today's workout, food (calories and protein) and weigh-in, each with a quick button.
- **Daily goals:** yes-or-no goals like "50 pushups", up to 10 (Goals → Daily goals). Each is a slider on Home: slide it across when it's done, tap it to undo. Before 8 am, yesterday's unfinished ones show too.
- **Groups (accountability):** make a group and share its invite code, or join one. Carver posts when you're at the gym, finish a workout (with PRs), go for a run or ride, finish a daily goal, hit your protein or calorie goal, or close your weekly gym goal. At 8 am (your time) it posts the daily goals you missed yesterday, and every Monday morning a weekly summary: workouts, protein and calorie days, and each daily goal. The group screen shows **This week** (each person's training days, workouts, and daily goals done and missed) and the activity by day, with each person's daily goals on one line. Invite code, What I share, notifications and Leave are under the gear. The latest posts show on Home.
- **Notifications:** turn them on in Groups. You get a phone notification when someone in your groups finishes a workout, finishes or misses a daily goal, and for their Monday summary. On iPhone, Carver must be added to the Home Screen.
- **Progress & trends cards:** your weight and 30-day change, and your maintenance calories, each with a mini graph. Tap one to open Progress or Trends.
- **Monthly nudges:** set this month's goals, take this month's progress photo, and see last month's recap.
- **Calendar:** workout days are gold. A week turns gold when you hit your workouts-per-week goal. Tap a day to open that workout.
- **Strength Tracking** (one-rep max tracker): pick up to 4 lifts (it starts with your most-logged ones). Each card shows your estimated 1RM (Epley formula), the change since you started, and a mini graph. Tap a card for a full chart and every workout's best set.
- **Profile:** your name, "carving since", week streak, all-time workouts, weight lifted, records, hours trained, and recent personal records.

### Workout
- **🎯 Goals on every page:** the same button, top right of Home, Workout, Nutrition and Fitness. Each opens that page's goals (Home opens all). Fitness goals are weekly: activities, active minutes, distance, shown on the This week tiles.
- **Start a workout vs. make a plan:** the top of the Workout tab is for working out: your next plan, a **Freestyle** workout (make it up as you go), another plan, or a past workout. **Your plans** below are routines saved for later; making or editing one never logs anything. A freestyle workout can be saved as a plan when you finish.
- **Pick your tabs:** Settings → Tabs turns tabs on or off and the arrow moves one left. Workout, Nutrition and Fitness are on to start; Social, Habits, Recovery and Physical Metrics are off until you want them. Fitness, Recovery and Physical Metrics are marked Under construction. Up to 5 fit in the bar and the rest go under **More**. Home drops the rings and rows of tabs you turn off.
- **Program builder** (a button on the Workout tab): shown as two-wide tiles, each with a figure of its training week or how load builds over a block. Ready-made programs (Full Body, Upper / Lower, Push Pull Legs, Bodyweight for home with reps that climb, Dumbbells Only, 5/3/1), each with who it's for and its pros and cons. Run one **ongoing** (weights go up when you hit the top of the rep range) or as an **8, 12 or 16-week training block**: phases of 4 weeks (Build, Strength, Heavy, Peak), each 3 working weeks plus a deload, ending in a test week. Carver works out every main-lift target from your starting numbers, shows the whole plan week by week, and eases the training max 5% if you miss reps twice in a row. **My workouts** (switch at the top) lists your own simple plans with no block or progression, plus New workout and Freestyle. **Popular workouts:** Cindy, Murph, Nickels and Dimes, 12-3-30 and Fran, each with how to do it and an easier version; Start loads it as a workout with the sets filled in. **Custom block** (advanced) runs your own plans as a periodized block: Linear, Undulating (heavy/medium/light days), Wave or RPE, with your own length, deloads, test week, sets, reps, percentages and training max.
- **Recovery tab** (under construction): a morning check-in (hours slept, sleep quality, soreness, energy) gives a **readiness score** out of 100 with a plain call: push, train as planned, go lighter, or take it easy. It also weighs whether your last two days of sets were much bigger than usual. Plus 14 nights of sleep against your sleep goal (Goals → Recovery), pasting sleep from Apple Health, and which muscles are still recovering. Sleep can be a ring on Home.
- **Physical Metrics tab** (under construction): weight with its trend and an optional **goal weight** (Goals → Body), **body composition** (body fat %, muscle, water and bone from a smart scale, scan or calipers, with lean mass and a body-fat chart), progress photos and monthly recaps. **Tape measurements** are optional: turn them on at the bottom and pick what to measure. The Progress card on Home opens it.
- **Habits tab:** your daily goals with today's sliders, a streak and best streak for each, how often you did it in the last 30 days, and a 12-week heat map (tap a square to fix a day). ··· on a goal sets a **reminder**: a notification at that hour if it isn't done yet (needs an account, notifications on, and the updated carver-push function).
- **Social tab:** your groups as a tab, with a **Leaderboard** (this week or month: workouts, active days, daily goals, protein days) and **Challenges** anyone in the group can start, like 12 workouts in 30 days, with everyone's progress. Counts only what each person shares with the group. Challenges need `supabase/social.sql` run once in the Supabase SQL editor.
- **Up next:** your plans rotate in order, so the next one is ready at the top with its muscles, sets, how long it took last time and when you last did it. While a workout is going, that card becomes **Resume** with your progress.
- **This week:** Monday to Sunday with the days you trained and the days you planned.
- **Plans:** up to **10**, each a row with a play button to start it. Tap a plan to edit it; ··· to rename, duplicate or delete. Or start an **empty workout**.
- **History** grouped by week, with each week's workouts and total weight lifted.
- **During a workout:** the timer, volume and a sets progress line stay pinned at the top. Each exercise is its own card showing sets done (2/3), the set to do next is outlined in gold, and a finished exercise gets a gold edge.
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
- **196 built-in exercises**, 52 of them one arm or leg at a time (filter **One side** in the picker), including hip adduction and abduction. Each lists its main muscle and the muscles it also works (traps, lower back, obliques, adductors and abductors included), and those count toward sets per muscle. Make your own with the muscles it works.
- **Log a past workout** (Workout tab): pick the day, start time and length, start empty, from a plan or like an earlier workout, and type in what you did. **Edit workout** in a finished workout's ··· menu changes it later.
- **Units:** lifting weights, body weight and distance each have their own setting (lb or kg, mi or km).
- **A workout in progress survives closing the app.**

### Nutrition

- **The plate:** a calorie ring with the protein/carb/fat split inside, each macro as eaten and left, a daily **Fuel score** (calories, protein, fiber, micronutrients), a strip of key nutrients (fiber, sodium, sugar, micros covered), a training-aware tip with protein per kg, and meals as cards. Optional extra calories (as carbs) on training days.
- **Quick add**: type "dinner 1000 calories" (or "chipotle bowl 850", "1200 cal lunch"). It picks the meal and fills in the calories. Three linked sliders split the calories into protein, carbs and fat and always add up to 100%. **Lock a macro** by typing its grams (or tapping its lock): it stays fixed when the calories change, and the other two share what's left. Presets: **Fits my day** (splits the calories like the macros you still have left today), Balanced, High protein, Low carb.
- **Diary** for any day, by meal (breakfast, lunch, dinner, snacks). Macros come first, each with a bar toward its goal.
- **Micronutrients page:** your energy split, plus vitamins and minerals against adult targets. Things to stay under (sodium, saturated fat, cholesterol) turn red when you go over.
- **About 1,490 foods with icons and real serving sizes**: meats and fish, dishes from around the world, about 110 chain restaurant items (McDonald’s, Tim Hortons, Starbucks, Subway, Chipotle and more), protein supplements, takeout and meal-prep meals, sauces and dressings, coffee drinks and more, a Recent list, category filters, and **Create food**. Search matches every word you type, so "greek yog" finds Greek yogurt. Vitamins and minerals for about 540 of them, and 235 extra everyday foods (game, meat cuts, seafood, cheeses, frozen meals, baking staples, spices, desserts, drinks), come from USDA FoodData Central (public domain).
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
- **Import from MyFitnessPal:** in Settings, pick the zip MyFitnessPal emails you (or the CSVs in it). Each meal's daily totals and your weigh-ins come in.
- **Calorie goal by aim:** in Goals, pick Lose fat, Maintain or Build muscle. Building makes the calorie goal a minimum, losing fat makes it a maximum, and maintaining means within 10%.
- **Copy or move food:** a meal's ⋯ menu copies it to today in one tap (from another day), or opens Copy or move: tick foods, pick a day and meal, and copy or move them. A food's edit sheet has the same link.
- **Import workouts:** in Settings, pick a workout CSV from Hevy, Strong, Fitbod or a 5/3/1 app. Exercises are matched to Carver's library (others become your own), and workouts you repeat can become plans.
- **5/3/1:** on the Workout tab, 5/3/1 sets up four plans (squat, bench, deadlift, press) from training maxes and rewrites their weights each week of the cycle.
- **Shared food database:** when you're signed in, foods you create (with the switch on) and foods you scan are added for everyone, under **Community**. For the beta they appear straight away. To review them first, see the note in `supabase/schema.sql`.
- **Barcode scanner:** uses the camera and looks the product up in Open Food Facts, a free, open database. It checks your foods and the Carver database first. Scanned foods are saved to My foods. You can also type the barcode in.
- **Goals:** calories, protein, carbs, fat, water, workouts per week (optionally on set days: Home then shows rest days, the next planned day, and planned days on the calendar), and your own daily goals. Calories and macros are linked: type any three and the one you changed longest ago fills itself in (marked *auto*).
- **Week strip:** Monday to Sunday under the date, each day's calories against your goal (gold when on target). Tap a day to jump to it.
- **Eaten or left:** tap the macro bars to switch between grams eaten and grams left.
- **Per meal:** each meal shows its protein, carbs and fat.
- **Nutrition facts:** the amount screen opens a full list of nutrients with % of daily targets.
- **Food icons:** emoji, plus small drawings for foods no emoji fits (protein bars, shakes, powder, tofu…).

### Fitness: runs, rides and other cardio

- **Activity points:** steps, cardio and lifting on one scale (MET-minutes ÷ 10) with a daily goal. Steps, heart-rate zones, pace/speed/per-100 m by sport and your bests. **Apple Health import** (the full export zip) brings in steps, sleep, resting heart rate, HRV, weigh-ins, body fat and cardio with heart rate.
- **Recovery** uses that sleep and heart data against your 30-day normal, counts cardio in training load, and has a 3-tap check-in. **Habits** show streak flames and progress toward 66 days to automatic.
- **Social:** each group opens from a list; kudos and comments on posts; "Heading to the gym" pings.
- **Share workouts:** a link with the workout inside it, opened in the app or on the web; sending needs the installed app.
- **Home widgets:** build your own from 18 metrics. **Rest timer** shows above the tabs everywhere, can be turned off, and never pauses music.
- **Carver Scale:** ESP32 firmware and build guide in `hardware/carver-scale`.
- **Diet coach** (Nutrition): loose weekly calorie and protein ranges from your log and your scale, built for under-logging: small weekly steps, a floor, capped loss, and no change in weeks with fewer than 4 full days logged.
- **How workouts felt:** effort and joints after each workout, "still tired?" in the morning check-in, both feeding readiness and advice in Recovery.
- **Exercise how-to:** tap an exercise's name for form cues and a link to demo videos. **Time-Efficient** program: 30 minutes, two hard sets per move.
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
| `js/foods.js`, `js/foods-more.js`, `js/foods-extra.js` | The starter food list (per 100 g) and nutrient targets |
| `js/foodpicker.js`, `js/quickadd.js`, `js/recipes.js` | Finding foods and amounts, favorites, creating and editing foods; quick add; recipes |
| `js/food-icons.js` | Drawn icons for foods with no good emoji |
| `js/about.js` | About & privacy screen |
| `js/nutrition-report.js`, `js/food-util.js` | Day micronutrients and the 7/30-day report; shared nutrition helpers |
| `js/foods.js`, `js/barcode.js`, `js/cronometer.js` | Food list, barcode scanner, Cronometer import |
| `js/copyfood.js` | Copy or move logged food between meals and days |
| `js/imports.js`, `js/program531.js` | Workout CSV and MyFitnessPal imports, the 5/3/1 program |
| `js/goals.js` | Goals sheet and custom daily goals |
| `js/fitness.js` | Fitness tab: cardio activities, Health import |
| `js/progress.js`, `js/body.js`, `js/photos.js`, `js/monthly.js` | Progress tab, weight and imports, progress photos, monthly goals and recaps |
| `js/cloud.js`, `js/account.js`, `js/config.js` | Sign-in, syncing and merging, photo sync, shared food database; your Supabase settings |
| `supabase/schema.sql` | Database setup for accounts, sync, shared foods and photos |
| `js/groups.js`, `supabase/groups.sql` | Groups: invite codes, posting, the feed, what each person shares |
| `js/habits.js` | Daily goals: the slide-to-complete sliders on Home |
| `js/push.js`, `supabase/push.sql`, `supabase/functions/carver-push/` | Notifications, missed daily goals at 8 am and the Monday summary (server side) |
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

## Turn on notifications and the 8 am / Monday posts

1. **Edge Functions → Secrets:** add `VAPID_PUBLIC_KEY` (the value in `js/config.js`), `VAPID_PRIVATE_KEY` (in `dev/vapid.json`, which isn't in git; keep it private) and `VAPID_SUBJECT` (`mailto:` plus the Carver Gmail address).
2. **Edge Functions → Deploy a new function → Via editor:** name it `carver-push`, paste `supabase/functions/carver-push/index.ts`, and deploy. In its settings, turn **off** "Enforce JWT verification" (the database calls it without a login).
3. **SQL Editor:** run `supabase/push.sql`.
4. In the app: Home → Groups → Notifications → **Turn on**, then **Send a test**.

If `dev/vapid.json` is lost, make a new key pair; everyone then turns notifications off and on again.

### Updating the server later

When `supabase/functions/carver-push/index.ts` changes: **Edge Functions → carver-push → Code**, select all, paste the new file, **Deploy**. Secrets and the JWT setting stay as they are.

For Social challenges, run `supabase/social.sql` once in the **SQL Editor** (safe to run again).

For kudos, comments and "Heading to the gym" pings, run `supabase/social2.sql` in the **SQL Editor**, then redeploy `carver-push` as above (it now notifies a post's owner about kudos and comments).

For text posts in groups, run `supabase/social3.sql` too (after social2.sql), and redeploy `carver-push` once more.

For emoji reactions, run `supabase/social4.sql`, then redeploy `carver-push` (so notifications say which emoji).

For automatic Apple Health sync, run `supabase/health.sql` and redeploy `carver-push`. Each person then opens Settings → Apple Health sync in the app, copies their private address, and sets up a daily Shortcut (steps are shown in the app). Health Auto Export can post to the same address.

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
- **Nutrition values are approximate.** The starter foods use USDA figures (restaurant items use what the chain publishes, and menus change), and scanned foods come from Open Food Facts.
- **The metabolism estimate needs at least 14 days of food logs and 4 weigh-ins (at least 10 days apart, first to last) in the last 4 weeks.** Once ready, its card shows your weight trend with a smaller line of calories eaten (7-day average) and your maintenance level under it. Confidence (Low, Medium, High) shows on the card; the number has a ≈ until it's High. Days with nothing logged don't count, and days that look off (under half or over 1.8× your usual, or under 1,000 kcal) are flagged with Keep or Leave out; left-out days also drop out of the Trends charts and the Report. It gets more accurate the more consistently you log.
