// Vitamins, minerals and other nutrients that Carver's own food entries were missing,
// filled in from USDA FoodData Central (SR Legacy, public domain). Each food was matched
// to a USDA food by name and only accepted when calories, protein, carbs and fat agree;
// the number after each line is the USDA fdc_id. Values are per 100 g and never
// overwrite numbers a food already has.

export const USDA_FILL = {
  'acorn-squash': { b12: 0, ca: 44.0, chol: 0, fe: 0.93, fol: 19.0, na: 240, sat: 0.029, va: 21.0, vd: 0, zn: 0.17 },   // 170128
  'albacore': { ca: 14.0, fe: 0.97, fib: 0, fol: 2.0, k: 237, mg: 33.0, sat: 0.79, sug: 0, va: 6.0, vc: 0, zn: 0.48 },   // 175158
  'almond-butter': { b12: 0, chol: 0, fol: 53.0, na: 227, sat: 6.55, sug: 6.27, va: 0, vc: 0, vd: 0, zn: 3.29 },   // 168603
  'almond-butter-crunchy': { b12: 0, chol: 0, fe: 3.49, fol: 53.0, k: 748, na: 227, sat: 6.55, sug: 6.27, va: 0, vc: 0, vd: 0, zn: 3.29 },   // 168603
  'almond-milk': { b12: 0, chol: 0, fe: 0.28, fib: 0.2, fol: 1.0, mg: 6.0, sat: 0.08, sug: 0.81, va: 0, vc: 0, zn: 0.06 },   // 174832
  'almonds': { b12: 0, chol: 0, fol: 44.0, na: 1.0, sug: 4.35, va: 0, vc: 0, vd: 0 },   // 170567
  'almonds-roasted': { b12: 0, chol: 0, fe: 3.68, fol: 27.0, k: 699, sat: 4.21, sug: 4.55, vc: 0, zn: 3.07 },   // 168602
  'anchovies': { b12: 0.88, chol: 85.0, fe: 4.63, fib: 0, fol: 13.0, k: 544, mg: 69.0, sat: 2.2, sug: 0, va: 12.0, vc: 0, vd: 1.7, zn: 2.44 },   // 174183
  'apple': { b12: 0, chol: 0, na: 1.0, sat: 0.028, vd: 0, zn: 0.04 },   // 171688
  'apple-juice': { b12: 0, ca: 8.0, chol: 0, fe: 0.12, fib: 0.2, fol: 0, mg: 5.0, na: 4.0, sat: 0.022, va: 0, vc: 38.5, vd: 0, zn: 0.02 },   // 167771
  'apple-pie': { b12: 0, ca: 7.0, chol: 0, fe: 1.12, fol: 38.0, k: 79.0, mg: 7.0, va: 11.0, vc: 1.7, zn: 0.19 },   // 175012
  'applesauce': { b12: 0, ca: 4.0, chol: 0, fe: 0.23, fol: 3.0, mg: 3.0, na: 2.0, sat: 0.008, va: 1.0, vd: 0, zn: 0.03 },   // 167772
  'apricot': { b12: 0, ca: 13.0, chol: 0, fe: 0.39, fol: 9.0, mg: 10.0, na: 1.0, sat: 0.027, vd: 0, zn: 0.2 },   // 171697
  'arugula': { b12: 0, chol: 0, fe: 1.46, mg: 47.0, na: 27.0, sat: 0.086, sug: 2.05, vd: 0, zn: 0.47 },   // 169387
  'asparagus': { b12: 0, chol: 0, mg: 14.0, na: 2.0, sat: 0.04, vd: 0, zn: 0.54 },   // 168389
  'avocado': { b12: 0, ca: 12.0, chol: 0, na: 7.0, va: 7.0, vd: 0 },   // 171705
  'avocado-oil': { b12: 0, ca: 0, fe: 0, fib: 0, fol: 0, k: 0, mg: 0, na: 0, va: 0, vc: 0, zn: 0 },   // 173573
  'baby-carrots': { b12: 0, ca: 32.0, chol: 0, fe: 0.89, fol: 27.0, mg: 10.0, sat: 0.023, vc: 2.6, vd: 0, zn: 0.17 },   // 168568
  'bagel': { b12: 0.16, ca: 13.0, chol: 24.0, fol: 134, k: 68.0, mg: 25.0, sat: 0.42, va: 33.0, vc: 0.6, zn: 0.77 },   // 174901
  'baked-beans': { b12: 0, ca: 53.0, chol: 7.0, fol: 36.0, k: 309, mg: 34.0, sat: 0.6, va: 0, vc: 2.0, vd: 0, zn: 1.46 },   // 175185
  'baked-potato': { b12: 0, ca: 15.0, chol: 0, fol: 28.0, na: 10.0, sat: 0.034, va: 1.0, vd: 0, zn: 0.36 },   // 170111
  'baked-sweet-potato': { b12: 0, ca: 35.0, chol: 0, fe: 0.54, fol: 22.0, mg: 21.0, na: 244, sat: 0.026, vd: 0, zn: 0.3 },   // 170542
  'baking-chocolate': { b12: 0, ca: 101, chol: 2.0, fol: 28.0, k: 830, na: 24.0, sat: 32.3, sug: 0.91, va: 0, vc: 0, vd: 0, zn: 9.63 },   // 167568
  'bamboo-shoots': { b12: 0, ca: 8.0, chol: 0, fe: 0.32, fol: 3.0, k: 80.0, mg: 4.0, na: 7.0, sat: 0.092, sug: 1.89, va: 1.0, vc: 1.1, vd: 0, zn: 0.65 },   // 169212
  'banana': { b12: 0, chol: 0, na: 1.0, sat: 0.11, vd: 0, zn: 0.15 },   // 173944
  'banana-chips': { b12: 0, ca: 18.0, chol: 0, fe: 1.25, fol: 14.0, k: 536, mg: 76.0, na: 6.0, va: 4.0, vc: 6.3, vd: 0, zn: 0.75 },   // 168849
  'banana-peppers': { b12: 0, ca: 14.0, chol: 0, fe: 0.46, fol: 29.0, k: 256, mg: 17.0, sat: 0.048, sug: 1.95, va: 17.0, vc: 82.7, vd: 0, zn: 0.25 },   // 169394
  'barley': { b12: 0, ca: 11.0, chol: 0, fol: 16.0, k: 93.0, na: 3.0, sat: 0.093, sug: 0.28, va: 0, vc: 0, vd: 0, zn: 0.82 },   // 170285
  'basil': { b12: 0, ca: 177, chol: 0, fe: 3.17, fol: 68.0, k: 295, mg: 64.0, na: 4.0, sat: 0.041, sug: 0.3, vc: 18.0, vd: 0, zn: 0.81 },   // 172232
  'basmati': { b12: 0, ca: 10.0, chol: 0, fe: 0.53, fol: 4.0, k: 79.0, mg: 44.0, sat: 0.17, va: 0, vc: 0, vd: 0, zn: 0.62 },   // 168875
  'bean-burrito': { b12: 0.08, ca: 52.0, chol: 2.0, fe: 2.51, fol: 138, k: 210, mg: 31.0, sat: 1.34, sug: 3.21, va: 8.0, vc: 0.3, vd: 0, zn: 0.71 },   // 173336
  'beets': { b12: 0, ca: 16.0, chol: 0, fe: 0.79, na: 77.0, sat: 0.028, va: 2.0, vc: 3.6, vd: 0, zn: 0.35 },   // 169146
  'biscuit': { b12: 0.08, ca: 235, chol: 3.0, fe: 2.9, fib: 1.5, fol: 95.0, k: 121, mg: 18.0, sug: 2.18, vc: 0.2, zn: 0.54 },   // 172670
  'black-beans': { b12: 0, chol: 0, na: 237, sat: 0.14, sug: 0.32, va: 0, vc: 0, vd: 0 },   // 175237
  'blackberries': { b12: 0, chol: 0, fe: 0.62, na: 1.0, sat: 0.014, va: 11.0, vd: 0, zn: 0.53 },   // 173946
  'blue-cheese': { b12: 1.22, chol: 75.0, fe: 0.31, fib: 0, fol: 36.0, k: 256, mg: 23.0, sug: 0.5, va: 198, vc: 0, vd: 0.5, zn: 2.66 },   // 172175
  'blueberries': { b12: 0, chol: 0, fol: 6.0, na: 1.0, sat: 0.028, va: 3.0, vd: 0, zn: 0.16 },   // 171711
  'blueberry-muffin': { b12: 0.16, ca: 44.0, chol: 30.0, fe: 1.3, fib: 1.1, fol: 73.0, k: 121, mg: 10.0, sat: 2.84, va: 21.0, vc: 0.9, vd: 0.1, zn: 0.37 },   // 172765
  'bologna': { b12: 1.19, ca: 21.0, chol: 57.0, fe: 1.29, fib: 0, fol: 3.0, k: 351, mg: 13.0, sug: 2.05, va: 19.0, vc: 15.2, vd: 0.7, zn: 1.93 },   // 172012
  'bratwurst': { b12: 0.73, ca: 28.0, fe: 0.53, fib: 0, fol: 3.0, k: 348, mg: 21.0, sug: 0, va: 2.0, vc: 0, vd: 1.1, zn: 3.25 },   // 171620
  'brie': { b12: 1.65, chol: 100, fe: 0.5, fib: 0, fol: 65.0, k: 152, mg: 20.0, sug: 0.45, va: 174, vc: 0, vd: 0.5, zn: 2.38 },   // 172177
  'brisket': { ca: 6.0, fib: 0, fol: 8.0, k: 273, mg: 22.0, sug: 0, va: 0, vc: 0 },   // 170212
  'broccoli': { b12: 0, chol: 0, sat: 0.11, vd: 0, zn: 0.41 },   // 170379
  'brown-rice': { b12: 0, ca: 10.0, chol: 0, fe: 0.53, fol: 4.0, na: 1.0, sat: 0.17, va: 0, vc: 0, vd: 0 },   // 168875
  'brown-sugar': { b12: 0, ca: 83.0, chol: 0, fe: 0.71, fib: 0, fol: 1.0, k: 133, mg: 9.0, na: 28.0, sat: 0, va: 0, vc: 0, vd: 0, zn: 0.03 },   // 168833
  'brussels': { b12: 0, chol: 0, mg: 20.0, na: 257, sat: 0.1, va: 39.0, vd: 0, zn: 0.33 },   // 168513
  'bulgur': { b12: 0, ca: 10.0, chol: 0, fe: 0.96, fol: 18.0, k: 68.0, na: 5.0, sat: 0.042, sug: 0.1, va: 0, vc: 0, vd: 0, zn: 0.57 },   // 170287
  'burger-patty': { b12: 2.73, ca: 24.0, fib: 0, fol: 10.0, k: 304, mg: 20.0, sug: 0, va: 3.0, vc: 0, vd: 0 },   // 171797
  'butter': { b12: 0.17, ca: 24.0, fe: 0.02, fib: 0, fol: 3.0, k: 24.0, mg: 2.0, sug: 0.06, vc: 0, vd: 0, zn: 0.09 },   // 173410
  'buttermilk': { b12: 0.22, chol: 4.0, fe: 0.05, fib: 0, fol: 5.0, k: 151, mg: 11.0, sat: 0.66, sug: 5.36, va: 14.0, vc: 1.0, vd: 0, zn: 0.42 },   // 170874
  'butternut': { b12: 0, chol: 0, fe: 0.6, fol: 19.0, na: 240, sat: 0.019, vd: 0, zn: 0.13 },   // 170130
  'cabbage': { b12: 0, chol: 0, fe: 0.47, mg: 12.0, na: 18.0, sat: 0.034, va: 5.0, vd: 0, zn: 0.18 },   // 169975
  'cake': { b12: 0.16, ca: 60.0, chol: 58.0, fe: 1.61, fib: 1.6, fol: 39.0, k: 140, mg: 32.0, vc: 0.2, zn: 0.69 },   // 172697
  'canned-green-beans': { b12: 0, ca: 29.0, chol: 0, fe: 1.02, fol: 26.0, k: 92.0, mg: 13.0, sat: 0.04, sug: 1.25, va: 13.0, vc: 2.2, vd: 0, zn: 0.36 },   // 169142
  'canned-peaches': { b12: 0, ca: 6.0, chol: 0, fe: 0.27, fol: 3.0, mg: 7.0, na: 4.0, sat: 0.004, va: 19.0, vd: 0, zn: 0.11 },   // 169930
  'canned-pineapple': { b12: 0, ca: 16.0, chol: 0, fe: 0.28, fol: 5.0, mg: 15.0, na: 1.0, sat: 0.008, va: 3.0, vd: 0, zn: 0.1 },   // 167767
  'canned-ravioli': { b12: 0.03, ca: 33.0, chol: 3.0, fe: 0.74, fib: 1.3, fol: 26.0, k: 232, mg: 15.0, sat: 0.72, sug: 3.72, va: 10.0, vc: 0, vd: 0, zn: 0.36 },   // 173328
  'canned-salmon': { fe: 0.65, fib: 0, fol: 4.0, k: 314, mg: 31.0, sug: 0, va: 55.0, vc: 0, zn: 0.84 },   // 173693
  'canned-soup-chicken': { b12: 0.08, ca: 11.0, chol: 5.0, fe: 0.35, fib: 0.8, fol: 11.0, k: 117, mg: 7.0, sat: 0.63, sug: 0.38, va: 62.0, vc: 0.4, vd: 0, zn: 0.17 },   // 171148
  'canned-tomatoes': { b12: 0, ca: 34.0, chol: 0, fe: 1.33, fol: 5.0, mg: 12.0, sat: 0.026, va: 9.0, vd: 0, zn: 0.17 },   // 170052
  'cannellini': { b12: 0, ca: 73.0, chol: 0, fol: 65.0, mg: 51.0, na: 340, sat: 0.074, sug: 0.29, va: 0, vc: 0, vd: 0, zn: 1.12 },   // 175204
  'canola-oil': { b12: 0, ca: 0, chol: 0, fe: 0, fib: 0, fol: 0, k: 0, mg: 0, na: 0, sug: 0, va: 0, vc: 0, vd: 0, zn: 0 },   // 172336
  'capers': { b12: 0, ca: 40.0, chol: 0, fe: 1.67, fol: 23.0, k: 40.0, mg: 33.0, sat: 0.23, sug: 0.41, va: 7.0, vc: 4.3, vd: 0, zn: 0.32 },   // 172238
  'carrot': { b12: 0, chol: 0, fe: 0.3, fol: 19.0, sat: 0.032, vd: 0, zn: 0.24 },   // 170393
  'cashew-butter': { b12: 0, ca: 43.0, chol: 0, fe: 5.03, fol: 68.0, k: 546, na: 15.0, sat: 9.76, va: 0, vc: 0, vd: 0 },   // 170163
  'cauliflower': { b12: 0, chol: 0, fe: 0.42, sat: 0.13, va: 0, vd: 0, zn: 0.27 },   // 169986
  'celery': { b12: 0, chol: 0, fe: 0.2, mg: 11.0, sat: 0.042, va: 22.0, vc: 3.1, vd: 0, zn: 0.13 },   // 169988
  'celsius': { b12: 2.5, ca: 0, chol: 0, fe: 0, fib: 0, fol: 283, k: 0, mg: 0, na: 42.0, sat: 0, sug: 0, va: 0, vc: 25.0, vd: 0, zn: 0 },   // 174822
  'cheddar': { fe: 0.14, fib: 0, fol: 27.0, k: 76.0, mg: 27.0, sug: 0.48, vc: 0, vd: 0.6 },   // 173414
  'cheese-crackers': { b12: 0.34, ca: 136, chol: 3.0, fe: 4.88, fib: 2.3, fol: 241, k: 156, mg: 25.0, sat: 5.29, sug: 4.53, va: 17.0, vc: 0, vd: 0, zn: 1.19 },   // 174975
  'cheese-sauce': { b12: 0.14, chol: 29.0, fe: 0.21, fib: 0.5, fol: 4.0, k: 30.0, mg: 9.0, sug: 0.42, va: 80.0, vc: 0.4, zn: 0.98 },   // 171191
  'cheesecake': { b12: 0.17, ca: 51.0, fe: 0.63, fib: 0.4, fol: 20.0, k: 90.0, mg: 11.0, va: 159, vc: 0.4, vd: 0.5, zn: 0.51 },   // 172711
  'cherries': { b12: 0, chol: 0, fe: 0.36, fol: 4.0, na: 0, sat: 0.038, va: 3.0, vd: 0, zn: 0.07 },   // 171719
  'chestnuts': { b12: 0, ca: 29.0, chol: 0, fe: 0.91, fol: 70.0, k: 592, mg: 33.0, na: 2.0, sat: 0.41, sug: 10.6, va: 1.0, vd: 0, zn: 0.57 },   // 170190
  'chewy-bar': { b12: 0.09, ca: 417, chol: 0, fe: 2.03, fib: 3.1, fol: 17.0, k: 199, mg: 48.0, sat: 5.01, va: 0, vc: 0.1, vd: 0, zn: 1.34 },   // 173145
  'chia': { b12: 0, chol: 0, fol: 49.0, k: 407, na: 16.0, sat: 3.33, vc: 1.6 },   // 170554
  'chicken-breast': { ca: 16.0, fib: 0, fol: 4.0, sug: 0, va: 7.0, vc: 0, vd: 0.1 },   // 171078
  'chicken-breast-raw': { ca: 5.0, fe: 0.37, fib: 0, fol: 9.0, mg: 28.0, sug: 0, va: 9.0, vc: 0, vd: 0 },   // 171077
  'chicken-broth': { b12: 0.02, ca: 4.0, chol: 2.0, fe: 0.07, fib: 0, fol: 0, k: 18.0, mg: 1.0, sat: 0.013, sug: 0.43, va: 0, vc: 0, vd: 0, zn: 0.07 },   // 174536
  'chicken-drumstick': { b12: 0.39, ca: 11.0, fe: 1.11, fib: 0, fol: 4.0, k: 247, mg: 22.0, sug: 0, va: 12.0, vc: 0, vd: 0.1 },   // 173612
  'chicken-leg': { b12: 0.3, ca: 15.0, fe: 1.26, fib: 0, fol: 5.0, k: 223, mg: 23.0, sug: 0, va: 48.0, vc: 0, vd: 0 },   // 171450
  'chicken-liver': { ca: 11.0, fib: 0, k: 263, mg: 25.0, na: 76.0, sat: 2.06, sug: 0, vc: 27.9, vd: 0, zn: 3.98 },   // 171061
  'chicken-noodle-soup': { b12: 0.08, ca: 11.0, chol: 5.0, fe: 0.35, fib: 0.8, fol: 11.0, k: 117, mg: 7.0, sat: 0.63, sug: 0.38, va: 62.0, vc: 0.4, vd: 0, zn: 0.17 },   // 171148
  'chicken-rice-soup': { b12: 0.11, ca: 14.0, chol: 3.0, fe: 0.25, fib: 0.9, fol: 13.0, k: 133, mg: 8.0, sat: 0.12, sug: 1.01, va: 52.0, vc: 0, vd: 0, zn: 0.22 },   // 171546
  'chicken-shredded': { b12: 0.33, ca: 15.0, fe: 1.21, fib: 0, fol: 6.0, k: 243, mg: 25.0, sug: 0, va: 16.0, vc: 0, vd: 0.1, zn: 2.1 },   // 171054
  'chicken-tenders': { b12: 0.18, ca: 39.0, chol: 36.0, fe: 0.84, fib: 1.7, fol: 33.0, k: 281, mg: 29.0, sug: 0.57, va: 7.0, vc: 0.5, vd: 0.1, zn: 0.61 },   // 173346
  'chicken-tenders-grilled': { b12: 0.23, ca: 13.0, fe: 0.93, fib: 0, fol: 3.0, mg: 22.0, sat: 1.12, sug: 0, va: 8.0, vc: 0, vd: 0.1, zn: 1.19 },   // 171467
  'chicken-thigh': { ca: 13.0, fib: 0, fol: 9.0, mg: 26.0, vc: 0, vd: 0.2 },   // 172387
  'chicken-thigh-skin': { b12: 0.44, ca: 9.0, fe: 1.08, fib: 0, fol: 4.0, k: 253, mg: 22.0, sug: 0, va: 16.0, vc: 0, vd: 0.2 },   // 173625
  'chicken-wing-plain': { b12: 0.35, ca: 18.0, fe: 0.84, fib: 0, fol: 9.0, k: 212, mg: 19.0, sug: 0, va: 12.0, vc: 0, vd: 0.2, zn: 1.64 },   // 173630
  'chips': { b12: 0, ca: 21.0, chol: 0, fe: 1.28, fol: 29.0, mg: 63.0, sug: 0.33, va: 0, vc: 21.6, vd: 0, zn: 1.09 },   // 169677
  'choc-chip-cookie': { b12: 0, ca: 17.0, fe: 4.07, fib: 1.8, fol: 45.0, k: 130, mg: 29.0, va: 0, zn: 0.54 },   // 172717
  'choc-milk': { b12: 0.23, chol: 5.0, fe: 0.23, fib: 0.1, fol: 3.0, mg: 13.0, na: 65.0, sat: 0.62, va: 52.0, vc: 0.4, zn: 0.43 },   // 170881
  'chocolate-syrup': { b12: 0, ca: 14.0, chol: 0, fe: 2.11, fib: 2.6, fol: 2.0, k: 224, mg: 65.0, sat: 0.52, va: 0, vc: 0.2, vd: 0, zn: 0.73 },   // 174117
  'chunky-soup': { b12: 0.26, ca: 13.0, chol: 6.0, fe: 0.97, fol: 6.0, k: 140, mg: 2.0, sat: 0.55, sug: 0.67, va: 54.0, vc: 2.9, vd: 0, zn: 1.1 },   // 171162
  'cinnamon': { b12: 0, chol: 0, fe: 8.32, fol: 6.0, k: 431, mg: 60.0, na: 10.0, sat: 0.34, sug: 2.17, va: 15.0, vc: 3.8, vd: 0, zn: 1.83 },   // 171320
  'clam-chowder': { ca: 15.0, fe: 0.48, k: 175, mg: 10.0, sug: 0.23, va: 0, zn: 0.23 },   // 174062
  'cocktail-sauce': { b12: 0, ca: 26.0, chol: 0, fe: 0.83, fib: 1.8, fol: 17.0, k: 309, mg: 17.0, sat: 0, va: 18.0, vc: 11.6, vd: 0, zn: 0.38 },   // 174067
  'cocoa': { b12: 0, ca: 128, chol: 0, fol: 32.0, k: 1524, na: 21.0, sat: 8.07, sug: 1.75, va: 0, vc: 0, vd: 0, zn: 6.81 },   // 169593
  'coconut-oil': { b12: 0, ca: 1.0, chol: 0, fe: 0.05, fib: 0, fol: 0, k: 0, mg: 0, na: 0, sug: 0, va: 0, vc: 0, vd: 0, zn: 0.02 },   // 171412
  'coconut-water': { b12: 0, ca: 24.0, chol: 0, fe: 0.29, fib: 1.1, fol: 3.0, sat: 0.18, va: 0, vc: 2.4, vd: 0, zn: 0.1 },   // 170174
  'cod': { ca: 14.0, fe: 0.49, fib: 0, fol: 8.0, sat: 0.17, sug: 0, va: 14.0, vc: 1.0, vd: 1.2, zn: 0.58 },   // 171956
  'collards': { b12: 0, chol: 0, fe: 1.13, fol: 16.0, mg: 21.0, na: 252, sat: 0.047, vd: 0, zn: 0.23 },   // 168523
  'condensed-milk': { b12: 0.44, chol: 34.0, fe: 0.19, fib: 0, fol: 11.0, k: 371, mg: 26.0, na: 127, va: 74.0, vc: 2.6, vd: 0.2, zn: 0.94 },   // 171275
  'cooked-carrots': { b12: 0, ca: 30.0, chol: 0, fe: 0.34, fol: 2.0, mg: 10.0, na: 302, sat: 0.037, vc: 3.6, vd: 0, zn: 0.2 },   // 169339
  'cooked-spinach': { b12: 0, chol: 0, na: 306, sat: 0.043, sug: 0.43, vd: 0, zn: 0.76 },   // 170531
  'corn': { b12: 0, ca: 2.0, chol: 0, fe: 0.52, na: 15.0, sat: 0.18, va: 0, vd: 0, zn: 0.45 },   // 168538
  'cornstarch': { b12: 0, ca: 2.0, chol: 0, fe: 0.47, fib: 0.9, fol: 0, k: 3.0, mg: 3.0, na: 9.0, sat: 0.009, sug: 0, va: 0, vc: 0, vd: 0, zn: 0.06 },   // 169698
  'cottage-1': { chol: 4.0, fe: 0.14, fib: 0, fol: 12.0, k: 86.0, mg: 5.0, sat: 0.65, sug: 2.72, va: 11.0, vc: 0, vd: 0, zn: 0.38 },   // 173417
  'cottage-4': { b12: 0.49, chol: 14.0, fe: 0.1, fib: 0.1, fol: 17.0, k: 86.0, mg: 4.0, sug: 0.37, va: 53.0, vc: 4.0, vd: 0, zn: 0.29 },   // 169078
  'cottage-cheese': { b12: 0.47, chol: 12.0, fe: 0.13, fib: 0, fol: 8.0, mg: 9.0, va: 68.0, vc: 0, vd: 0, zn: 0.51 },   // 172182
  'couscous': { b12: 0, ca: 8.0, chol: 0, fe: 0.38, fol: 15.0, mg: 8.0, na: 5.0, sat: 0.029, sug: 0.1, va: 0, vc: 0, vd: 0, zn: 0.26 },   // 169700
  'crackers': { b12: 0, ca: 92.0, chol: 0, fe: 2.64, fol: 40.0, k: 283, mg: 72.0, sat: 3.21, sug: 15.5, va: 0, vc: 0, vd: 0, zn: 1.64 },   // 174985
  'cranberries': { b12: 0, ca: 8.0, chol: 0, fe: 0.23, fol: 1.0, mg: 6.0, na: 2.0, sat: 0.008, va: 3.0, vd: 0, zn: 0.09 },   // 171722
  'cranberry-juice': { b12: 0, ca: 3.0, chol: 0, fe: 0.1, fib: 0, fol: 0, k: 14.0, mg: 1.0, na: 2.0, sat: 0.009, va: 0, vd: 0, zn: 0.03 },   // 171903
  'cranberry-sauce': { b12: 0, ca: 3.0, chol: 0, fe: 0.41, fol: 1.0, k: 28.0, mg: 2.0, na: 5.0, sat: 0.007, va: 2.0, vc: 1.0, vd: 0, zn: 0.03 },   // 173961
  'cream-cheese': { b12: 0.22, fe: 0.11, fib: 0, fol: 9.0, k: 132, mg: 9.0, sug: 3.76, va: 308, vc: 0, vd: 0, zn: 0.5 },   // 173418
  'cream-cheese-light': { b12: 0.92, ca: 148, chol: 54.0, fe: 0.17, fib: 0, fol: 19.0, k: 247, mg: 8.0, sug: 3.3, va: 161, vc: 0, vd: 0.3, zn: 0.57 },   // 169079
  'crispbread': { b12: 0, ca: 31.0, chol: 0, fe: 2.43, fol: 65.0, k: 319, mg: 78.0, na: 410, sat: 0.14, sug: 1.07, va: 0, vc: 0, vd: 0, zn: 2.39 },   // 172739
  'croissant': { b12: 0.32, ca: 53.0, chol: 57.0, fe: 2.15, fib: 2.6, fol: 103, k: 132, mg: 24.0, va: 204, vc: 0.2, vd: 0, zn: 0.94 },   // 174989
  'croutons': { b12: 0.14, ca: 96.0, chol: 7.0, fe: 2.82, fib: 5.0, fol: 151, k: 181, mg: 42.0, sat: 5.25, sug: 4.41, va: 7.0, vc: 0, vd: 0, zn: 0.94 },   // 172752
  'cucumber': { b12: 0, chol: 0, fe: 0.28, fol: 7.0, na: 2.0, sat: 0.037, va: 5.0, vd: 0, zn: 0.2 },   // 168409
  'danish': { b12: 0.09, ca: 46.0, chol: 114, fe: 1.77, fib: 1.9, fol: 68.0, k: 83.0, mg: 15.0, va: 15.0, vc: 3.9, vd: 0, zn: 0.54 },   // 172755
  'dates': { fol: 15.0, na: 1.0, va: 7.0, vc: 0, vd: 0, zn: 0.44 },   // 168191
  'dinner-roll': { b12: 0.24, ca: 59.0, chol: 50.0, fe: 3.52, fol: 276, k: 104, mg: 25.0, sat: 1.58, va: 5.0, vc: 0, vd: 0, zn: 1.12 },   // 175027
  'dried-apricots': { b12: 0, ca: 55.0, chol: 0, fol: 10.0, mg: 32.0, na: 10.0, sat: 0.017, vc: 1.0, vd: 0, zn: 0.39 },   // 173941
  'dried-cranberries': { b12: 0, ca: 9.0, chol: 0, fe: 0.39, fol: 0, k: 49.0, mg: 4.0, na: 5.0, sat: 0.088, va: 2.0, vc: 0.2, vd: 0, zn: 0.1 },   // 171723
  'dried-figs': { b12: 0, chol: 0, fol: 9.0, na: 10.0, sat: 0.14, va: 0, vc: 1.2, vd: 0, zn: 0.55 },   // 174665
  'dried-mango': { b12: 0, ca: 0, chol: 0, fe: 0.23, fol: 68.0, k: 279, mg: 20.0, na: 162, sat: 0.29, va: 67.0, vd: 0, zn: 0.3 },   // 169091
  'duck': { b12: 0.4, ca: 12.0, chol: 89.0, fib: 0, fol: 10.0, k: 252, mg: 20.0, na: 65.0, sug: 0, va: 23.0, vc: 0, vd: 0.1, zn: 2.6 },   // 172411
  'duck-egg': { ca: 64.0, fe: 3.85, fib: 0, fol: 80.0, k: 222, mg: 17.0, na: 146, sat: 3.68, sug: 0.93, va: 194, vc: 0, vd: 1.7, zn: 1.41 },   // 172189
  'edamame': { na: 6.0, vc: 9.7 },   // 168410
  'egg': { fib: 0, mg: 12.0, sug: 0.37, vc: 0 },   // 171287
  'egg-noodles': { b12: 0.09, ca: 12.0, fib: 1.2, fol: 138, k: 38.0, mg: 21.0, na: 5.0, sat: 0.42, sug: 0.4, va: 6.0, vc: 0, vd: 0.1, zn: 0.65 },   // 169732
  'egg-white': { b12: 0.09, ca: 7.0, chol: 0, fe: 0.08, fib: 0, fol: 4.0, sat: 0, sug: 0.71, va: 0, vc: 0, vd: 0, zn: 0.03 },   // 172183
  'egg-yolk': { ca: 129, fe: 2.73, fib: 0, k: 109, mg: 5.0, na: 48.0, sug: 0.56, va: 381, vc: 0, zn: 2.3 },   // 172184
  'eggnog': { b12: 0.45, chol: 59.0, fe: 0.2, fib: 0, fol: 1.0, k: 165, mg: 19.0, na: 54.0, va: 59.0, vc: 1.5, vd: 1.2, zn: 0.46 },   // 171258
  'eggplant': { b12: 0, ca: 6.0, chol: 0, fe: 0.25, fol: 14.0, mg: 11.0, na: 239, sat: 0.044, va: 2.0, vc: 1.3, vd: 0, zn: 0.12 },   // 169352
  'enchilada-sauce': { b12: 0, ca: 7.0, chol: 0, fe: 0.67, fib: 0.5, fol: 5.0, k: 101, mg: 6.0, sat: 0.11, sug: 1.83, va: 36.0, vc: 0.3, vd: 0, zn: 0.09 },   // 174074
  'energy-drink': { b12: 0, ca: 8.0, chol: 0, fe: 0, fib: 0, fol: 0, k: 4.0, mg: 0, sat: 0, va: 0, vc: 25.0, vd: 0, zn: 0 },   // 174108
  'energy-zero': { b12: 2.5, ca: 0, chol: 0, fe: 0, fib: 0, fol: 283, k: 0, mg: 0, sat: 0, sug: 0, va: 0, vc: 25.0, vd: 0, zn: 0 },   // 174822
  'english-muffin': { b12: 0, chol: 0, fol: 81.0, k: 186, mg: 37.0, sat: 0.29, va: 0, vc: 0, vd: 0, zn: 1.07 },   // 172761
  'evaporated-milk': { b12: 0.16, chol: 29.0, fe: 0.19, fib: 0, fol: 8.0, k: 303, mg: 24.0, na: 106, vc: 1.9, zn: 0.77 },   // 172194
  'falafel': { b12: 0, ca: 54.0, chol: 0, fol: 104, k: 585, mg: 82.0, sat: 2.38, va: 1.0, vc: 1.6, vd: 0, zn: 1.5 },   // 172455
  'fennel': { b12: 0, ca: 49.0, chol: 0, fe: 0.73, fol: 27.0, mg: 17.0, na: 52.0, sat: 0.09, sug: 3.93, va: 48.0, vd: 0, zn: 0.2 },   // 169385
  'feta': { fe: 0.65, fib: 0, fol: 32.0, k: 62.0, mg: 19.0, sug: 0, va: 125, vc: 0, vd: 0.4, zn: 2.88 },   // 173420
  'figs': { b12: 0, chol: 0, fe: 0.37, fol: 6.0, na: 1.0, sat: 0.06, va: 7.0, vc: 2.0, vd: 0, zn: 0.15 },   // 173021
  'firm-tofu': { b12: 0, chol: 0, fol: 29.0, k: 237, na: 14.0, sat: 1.26, vc: 0.2, vd: 0, zn: 1.57 },   // 172475
  'fish-sauce': { b12: 0.48, ca: 43.0, chol: 0, fe: 0.78, fib: 0, fol: 51.0, k: 288, mg: 175, sat: 0.003, sug: 3.64, va: 4.0, vc: 0.5, vd: 0, zn: 0.2 },   // 174531
  'fish-sticks': { b12: 0.96, ca: 16.0, chol: 28.0, fe: 0.84, fib: 1.5, fol: 24.0, k: 185, mg: 25.0, sug: 1.65, va: 4.0, vc: 0, vd: 0, zn: 0.42 },   // 174195
  'flank-steak': { ca: 20.0, fib: 0, fol: 9.0, mg: 23.0, sug: 0, va: 0, vc: 0 },   // 168733
  'flaxseed': { b12: 0, chol: 0, fe: 5.73, fol: 87.0, k: 813, na: 30.0, sat: 3.66, sug: 1.55, va: 0, vc: 0.6, vd: 0, zn: 4.34 },   // 169414
  'fried-chicken': { b12: 0.3, ca: 20.0, fe: 1.25, fib: 0.3, fol: 21.0, k: 201, mg: 24.0, sug: 0, va: 20.0, vc: 0, vd: 0.1, zn: 0.95 },   // 171475
  'fried-egg': { b12: 0.97, ca: 62.0, fe: 1.89, fib: 0, fol: 51.0, k: 152, mg: 13.0, sug: 0.4, va: 219, vc: 0, zn: 1.39 },   // 173423
  'fried-tofu': { b12: 0, chol: 0, fol: 27.0, k: 146, mg: 60.0, na: 16.0, sat: 2.92, sug: 2.72, va: 1.0, vc: 0, vd: 0, zn: 1.99 },   // 172451
  'frozen-burrito': { ca: 34.0, chol: 8.0, fe: 2.96, fol: 123, k: 221, mg: 32.0, sat: 2.95, sug: 0.7, va: 11.0, vc: 0.8, zn: 0.99 },   // 173335
  'frozen-peas-carrots': { b12: 0, ca: 27.0, chol: 0, fe: 1.09, fol: 36.0, k: 194, mg: 18.0, na: 79.0, sat: 0.084, vc: 11.2, vd: 0, zn: 0.52 },   // 170425
  'frozen-strawberries': { b12: 0, ca: 16.0, chol: 0, fe: 0.75, fol: 17.0, mg: 11.0, na: 2.0, sat: 0.006, va: 2.0, vd: 0, zn: 0.13 },   // 168173
  'frozen-waffle': { b12: 2.93, ca: 308, chol: 14.0, fe: 5.61, fib: 2.2, fol: 108, k: 125, mg: 23.0, sat: 1.53, va: 381, vc: 0, zn: 0.59 },   // 175038
  'frozen-yogurt': { b12: 0.29, chol: 2.0, fe: 0.3, fib: 0, fol: 6.0, k: 211, mg: 14.0, na: 87.0, sat: 3.42, va: 59.0, vc: 0.8, vd: 0.1, zn: 0.42 },   // 168815
  'fruit-leather': { b12: 0, ca: 18.0, chol: 0, fe: 0.75, fib: 0, fol: 4.0, k: 164, mg: 14.0, na: 199, sat: 0.65, va: 3.0, vc: 56.0, vd: 0, zn: 0.19 },   // 167540
  'fruit-snacks': { b12: 0, ca: 0, chol: 0, fe: 0, fib: 0, fol: 1.0, k: 8.0, mg: 1.0, na: 23.0, sat: 0, va: 0, vd: 0, zn: 0.19 },   // 170279
  'garlic': { b12: 0, ca: 181, chol: 0, fe: 1.7, fol: 3.0, mg: 25.0, na: 17.0, sat: 0.089, sug: 1.0, va: 0, vd: 0, zn: 1.16 },   // 169230
  'garlic-bread': { b12: 0.08, ca: 27.0, chol: 0, fe: 3.05, fib: 2.5, fol: 221, k: 103, mg: 23.0, sug: 3.69, va: 13.0, vc: 0.2, vd: 0.2, zn: 0.87 },   // 167939
  'goat-cheese': { b12: 0.19, fe: 1.9, fib: 0, fol: 12.0, k: 26.0, mg: 16.0, sug: 0, va: 288, vc: 0, vd: 0.4, zn: 0.92 },   // 173435
  'goat-milk': { b12: 0.07, chol: 11.0, fe: 0.05, fib: 0, fol: 1.0, k: 204, mg: 14.0, na: 50.0, sug: 4.45, va: 57.0, vc: 1.3, vd: 1.3, zn: 0.3 },   // 171278
  'goji': { ca: 190, chol: 0, na: 298, sat: 0, vc: 48.4 },   // 173032
  'gooseberries': { b12: 0, ca: 25.0, chol: 0, fe: 0.31, fol: 6.0, mg: 10.0, na: 1.0, sat: 0.038, va: 15.0, zn: 0.12 },   // 173030
  'gouda': { b12: 1.54, chol: 114, fe: 0.24, fib: 0, fol: 21.0, k: 121, mg: 29.0, sug: 2.22, va: 165, vc: 0, vd: 0.5, zn: 3.9 },   // 171241
  'granola': { b12: 0, ca: 61.0, chol: 0, fol: 23.0, na: 294, sat: 2.37, va: 2.0, vc: 0.9, vd: 0, zn: 2.03 },   // 167542
  'granola-bar': { b12: 0.39, ca: 105, chol: 0, fe: 2.56, fol: 24.0, k: 325, mg: 74.0, sat: 7.25, va: 0, vc: 0, zn: 1.5 },   // 167954
  'grape-juice': { b12: 0, ca: 11.0, chol: 0, fe: 0.25, fib: 0.2, fol: 0, mg: 10.0, na: 5.0, sat: 0.025, va: 0, vc: 25.0, vd: 0, zn: 0.07 },   // 173041
  'grapefruit': { b12: 0, chol: 0, fe: 0.08, fol: 12.0, mg: 9.0, na: 0, sat: 0.014, vd: 0, zn: 0.07 },   // 174677
  'gravy': { b12: 0, ca: 7.0, chol: 0, fe: 0.66, fib: 0.4, fol: 12.0, k: 106, mg: 2.0, sat: 0.4, va: 0, vc: 0, zn: 0.7 },   // 171170
  'greek-yogurt': { chol: 5.0, fe: 0.07, fib: 0, fol: 7.0, mg: 11.0, sat: 0.12, va: 1.0, vc: 0, vd: 0 },   // 170894
  'greek-yogurt-0': { chol: 5.0, fe: 0.07, fib: 0, fol: 7.0, mg: 11.0, sat: 0.12, va: 1.0, vc: 0, vd: 0, zn: 0.52 },   // 170894
  'greek-yogurt-2': { chol: 10.0, fe: 0.04, fib: 0, fol: 12.0, k: 141, mg: 11.0, na: 34.0, va: 90.0, vc: 0.8, vd: 0, zn: 0.6 },   // 170903
  'greek-yogurt-flavored': { b12: 0.49, chol: 4.0, fe: 0.09, fib: 0.6, fol: 20.0, k: 132, mg: 10.0, na: 33.0, sat: 0.1, va: 0, vc: 0.3, vd: 1.0, zn: 0.45 },   // 170901
  'greek-yogurt-vanilla': { b12: 0.64, chol: 3.0, fe: 0.04, fib: 0.5, fol: 11.0, k: 123, mg: 10.0, sat: 0.13, va: 0, vc: 0, vd: 0.9, zn: 0.46 },   // 170902
  'green-apple': { ca: 5.0, fe: 0.15, fol: 3.0, mg: 5.0, na: 1.0, va: 5.0, zn: 0.04 },   // 168203
  'green-beans': { b12: 0, chol: 0, fol: 33.0, na: 6.0, sat: 0.05, sug: 3.26, vd: 0, zn: 0.24 },   // 169961
  'green-olives': { b12: 0, ca: 52.0, chol: 0, fe: 0.49, fol: 3.0, k: 42.0, mg: 11.0, sat: 2.03, sug: 0.54, va: 20.0, vc: 0, vd: 0, zn: 0.04 },   // 169096
  'green-tea': { b12: 0, ca: 0, chol: 0, fe: 0.02, fib: 0, fol: 0, k: 8.0, mg: 1.0, na: 1.0, sat: 0, sug: 0, va: 0, vc: 0, vd: 0, zn: 0.01 },   // 171917
  'ground-beef': { ca: 13.0, fib: 0, fol: 6.0, mg: 21.0, sug: 0, va: 3.0, vc: 0, vd: 0 },   // 171795
  'ground-beef-80': { ca: 24.0, fib: 0, fol: 10.0, mg: 20.0, sug: 0, va: 3.0, vc: 0, vd: 0 },   // 171797
  'ground-beef-85': { ca: 18.0, fib: 0, fol: 9.0, mg: 21.0, sug: 0, va: 3.0, vc: 0, vd: 0 },   // 174032
  'ground-beef-90': { ca: 13.0, fib: 0, fol: 6.0, k: 300, mg: 21.0, sug: 0, va: 3.0, vc: 0, vd: 0 },   // 171795
  'ground-beef-95': { ca: 7.0, fib: 0, fol: 7.0, mg: 22.0, sug: 0, va: 3.0, vc: 0, vd: 0 },   // 171791
  'ground-chicken': { b12: 0.51, ca: 8.0, fe: 0.93, fib: 0, fol: 2.0, mg: 28.0, sug: 0, va: 0, vc: 0, zn: 1.92 },   // 171117
  'ground-lamb': { b12: 2.61, ca: 22.0, chol: 97.0, fe: 1.79, fib: 0, fol: 19.0, k: 339, mg: 24.0, na: 81.0, sug: 0, va: 0, vc: 0, vd: 0.1 },   // 172544
  'ground-pork': { b12: 0.54, ca: 22.0, chol: 94.0, fe: 1.29, fib: 0, fol: 6.0, k: 362, mg: 24.0, na: 73.0, sug: 0, va: 2.0, vc: 0.7, vd: 0.5 },   // 167903
  'ground-turkey': { ca: 28.0, fib: 0, fol: 7.0, mg: 30.0, sug: 0, va: 24.0, vc: 0, vd: 0.2 },   // 171506
  'guava': { b12: 0, ca: 18.0, chol: 0, fe: 0.26, fol: 49.0, mg: 22.0, na: 2.0, sat: 0.27, va: 31.0, vd: 0, zn: 0.23 },   // 173044
  'haddock': { ca: 14.0, chol: 66.0, fe: 0.21, fib: 0, fol: 13.0, k: 351, mg: 26.0, sat: 0.11, sug: 0, va: 21.0, vc: 0, vd: 0.6, zn: 0.4 },   // 174198
  'hard-boiled-egg': { ca: 50.0, fib: 0, k: 126, mg: 10.0, sug: 1.12, vc: 0 },   // 173424
  'hard-candy': { b12: 0, ca: 3.0, chol: 0, fe: 0.3, fib: 0, fol: 0, k: 5.0, mg: 3.0, na: 38.0, sat: 0, va: 0, vc: 0, vd: 0, zn: 0.01 },   // 167990
  'heavy-cream': { b12: 0.16, fe: 0.1, fib: 0, fol: 4.0, k: 95.0, mg: 7.0, na: 27.0, sug: 2.92, vc: 0.6, vd: 1.6, zn: 0.24 },   // 170859
  'herring': { b12: 4.27, ca: 77.0, chol: 13.0, fe: 1.22, fib: 0, fol: 2.0, k: 69.0, mg: 8.0, sat: 2.38, sug: 7.71, va: 258, vc: 0, zn: 0.53 },   // 175118
  'hoisin': { b12: 0, ca: 32.0, chol: 3.0, fe: 1.01, fib: 2.8, fol: 23.0, k: 119, mg: 24.0, sat: 0.57, va: 0, vc: 0.4, vd: 0, zn: 0.32 },   // 172886
  'honey': { b12: 0, ca: 6.0, chol: 0, fe: 0.42, fib: 0.2, fol: 2.0, k: 52.0, mg: 2.0, na: 4.0, sat: 0, va: 0, vc: 0.5, vd: 0, zn: 0.22 },   // 169640
  'honeydew': { b12: 0, ca: 6.0, chol: 0, fe: 0.17, fol: 19.0, mg: 10.0, na: 18.0, sat: 0.038, va: 3.0, vd: 0, zn: 0.09 },   // 169911
  'hot-chocolate': { b12: 0.33, chol: 12.0, fe: 0.24, fib: 0.8, fol: 5.0, k: 167, mg: 13.0, na: 60.0, sat: 2.1, va: 27.0, vc: 0.9, vd: 1.3, zn: 0.41 },   // 170879
  'hot-sauce': { b12: 0, ca: 8.0, chol: 0, fe: 0.48, fib: 0.3, fol: 6.0, k: 144, mg: 5.0, sat: 0.052, sug: 1.26, va: 8.0, vc: 74.8, zn: 0.11 },   // 174527
  'hot-sour-soup': { b12: 0.1, ca: 19.0, chol: 21.0, fe: 0.64, fol: 8.0, k: 55.0, mg: 9.0, sat: 0.23, sug: 0.42, va: 9.0, vc: 0, vd: 0.1, zn: 0.22 },   // 174808
  'ice-cream': { b12: 0.39, fe: 0.09, fib: 0.7, fol: 5.0, k: 199, mg: 14.0, na: 80.0, va: 118, vc: 0.6, vd: 0.2, zn: 0.69 },   // 167575
  'ice-cream-bar': { b12: 0.49, ca: 119, chol: 28.0, fe: 0.29, fib: 0.8, fol: 7.0, k: 305, mg: 28.0, na: 68.0, va: 19.0, vc: 0, vd: 0.2, zn: 0.82 },   // 173466
  'ice-cream-sandwich': { b12: 0.05, ca: 86.0, chol: 21.0, fe: 0.26, fib: 0, fol: 53.0, k: 115, mg: 29.0, na: 129, va: 86.0, vc: 0, vd: 0, zn: 0.6 },   // 172226
  'iceberg': { b12: 0, ca: 18.0, chol: 0, fe: 0.41, fol: 29.0, mg: 7.0, na: 10.0, sat: 0.018, va: 25.0, vc: 2.8, vd: 0, zn: 0.15 },   // 169248
  'italian-sausage': { b12: 0.9, ca: 13.0, chol: 81.0, fe: 1.25, fib: 0, fol: 1.0, k: 339, mg: 19.0, sug: 1.42, va: 10.0, vc: 0, vd: 1.0, zn: 2.4 },   // 174586
  'jackfruit': { b12: 0, ca: 24.0, chol: 0, fe: 0.23, fol: 24.0, mg: 29.0, na: 2.0, sat: 0.2, va: 5.0, zn: 0.13 },   // 174687
  'jasmine-rice': { b12: 0, ca: 3.0, chol: 0, fol: 97.0, k: 29.0, mg: 13.0, sat: 0.057, va: 0, vc: 0, vd: 0, zn: 0.42 },   // 168880
  'jerky': { b12: 0.99, ca: 20.0, fib: 1.8, fol: 134, k: 597, mg: 51.0, sat: 10.8, va: 0, vc: 0, vd: 0.3 },   // 167536
  'kale': { b12: 0, chol: 0, na: 53.0, sat: 0.18, sug: 0.99, vd: 0, zn: 0.39 },   // 168421
  'kidney-beans': { b12: 0, ca: 28.0, chol: 0, na: 238, sat: 0.072, sug: 0.32, va: 0, vc: 1.2, vd: 0, zn: 1.07 },   // 175242
  'kimchi': { b12: 0, ca: 33.0, chol: 0, fe: 2.5, fol: 52.0, k: 151, mg: 14.0, sat: 0.067, sug: 1.06, vc: 0, vd: 0, zn: 0.22 },   // 170392
  'lactose-free-milk': { b12: 0.53, chol: 8.0, fe: 0.02, fib: 0, fol: 5.0, k: 140, mg: 11.0, na: 47.0, sat: 1.26, va: 55.0, vc: 0.2, zn: 0.48 },   // 171267
  'lamb': { ca: 22.0, fib: 0, fol: 19.0, k: 339, mg: 24.0, na: 81.0, sug: 0, va: 0, vc: 0, vd: 0.1 },   // 172544
  'lamb-chop': { ca: 22.0, chol: 97.0, fe: 1.79, fib: 0, fol: 19.0, k: 339, mg: 24.0, na: 81.0, sug: 0, va: 0, vc: 0, vd: 0.1 },   // 172544
  'lard': { b12: 0, ca: 0, chol: 95.0, fe: 0, fib: 0, fol: 0, k: 0, mg: 0, na: 0, sug: 0, va: 0, vc: 0, vd: 2.5, zn: 0.11 },   // 171401
  'latte': { b12: 0.53, chol: 8.0, fe: 0.02, fib: 0, fol: 5.0, k: 140, mg: 11.0, sat: 1.26, va: 55.0, vc: 0.2, vd: 1.2, zn: 0.48 },   // 171267
  'lemon': { b12: 0, ca: 26.0, chol: 0, fe: 0.6, fol: 11.0, mg: 8.0, na: 2.0, sat: 0.039, va: 1.0, vd: 0, zn: 0.06 },   // 167746
  'lentil-soup': { b12: 0.12, ca: 17.0, chol: 3.0, fol: 20.0, k: 144, mg: 9.0, sat: 0.45, va: 7.0, vc: 1.7, zn: 0.3 },   // 171549
  'lentils': { b12: 0, ca: 19.0, chol: 0, na: 238, sat: 0.053, sug: 1.8, va: 0, vc: 1.5, vd: 0 },   // 175254
  'lima-beans': { b12: 0, ca: 17.0, chol: 0, fol: 83.0, mg: 43.0, na: 238, sat: 0.089, sug: 2.9, va: 0, vc: 0, vd: 0, zn: 0.95 },   // 173802
  'lime': { b12: 0, ca: 33.0, chol: 0, fe: 0.6, fol: 8.0, mg: 6.0, na: 2.0, sat: 0.022, va: 2.0, vd: 0, zn: 0.11 },   // 168155
  'liquid-egg-whites': { b12: 0.09, ca: 7.0, chol: 0, fe: 0.08, fib: 0, fol: 4.0, mg: 11.0, sat: 0, sug: 0.71, va: 0, vc: 0, vd: 0, zn: 0.03 },   // 172183
  'liver': { ca: 6.0, fib: 0, k: 352, mg: 21.0, na: 79.0, sat: 2.95, sug: 0, vc: 1.9, vd: 1.2 },   // 168626
  'macadamia': { b12: 0, ca: 85.0, chol: 0, fe: 3.69, fol: 11.0, k: 368, na: 5.0, sug: 4.57, va: 0, vc: 1.2, vd: 0, zn: 1.3 },   // 170178
  'mackerel': { ca: 15.0, chol: 75.0, fe: 1.57, fib: 0, fol: 2.0, k: 401, mg: 97.0, na: 83.0, va: 54.0, vc: 0.4, zn: 0.94 },   // 175120
  'mango': { b12: 0, ca: 11.0, chol: 0, fe: 0.16, na: 1.0, sat: 0.092, vd: 0, zn: 0.09 },   // 169910
  'maple-syrup': { b12: 0, ca: 102, chol: 0, fe: 0.11, fib: 0, fol: 0, k: 212, na: 12.0, sat: 0.007, va: 0, vc: 0, vd: 0 },   // 169661
  'marinara': { b12: 0, ca: 26.0, chol: 2.0, fe: 0.73, fol: 13.0, mg: 18.0, sat: 0.22, vc: 2.0, vd: 0, zn: 0.2 },   // 171192
  'marshmallows': { b12: 0, ca: 3.0, chol: 0, fe: 0.23, fib: 0.1, fol: 1.0, k: 5.0, mg: 2.0, na: 80.0, sat: 0.056, va: 0, vc: 0, vd: 0, zn: 0.04 },   // 167995
  'mashed-gravy': { b12: 0.22, ca: 34.0, chol: 13.0, fe: 0.27, fib: 1.9, fol: 6.0, k: 274, mg: 14.0, sat: 2.63, sug: 1.76, va: 53.0, vc: 0.1, vd: 0.1, zn: 0.3 },   // 169768
  'mashed-potatoes': { b12: 0, ca: 35.0, chol: 3.0, fe: 0.19, fol: 7.0, mg: 19.0, va: 44.0, vc: 6.0, vd: 0, zn: 0.24 },   // 168554
  'milk': { fe: 0.02, fib: 0, fol: 5.0, mg: 11.0, vc: 0.2, zn: 0.48 },   // 171267
  'milk-chocolate': { b12: 0.75, chol: 23.0, fe: 2.35, fib: 3.4, fol: 11.0, k: 372, mg: 63.0, na: 79.0, va: 59.0, vc: 0, vd: 0, zn: 2.3 },   // 167587
  'millet': { b12: 0, ca: 3.0, chol: 0, fe: 0.63, fol: 19.0, k: 62.0, na: 2.0, sat: 0.17, sug: 0.13, va: 0, vc: 0, vd: 0, zn: 0.91 },   // 168871
  'mixed-nuts': { b12: 0, ca: 117, chol: 0, fe: 2.61, fol: 83.0, sug: 4.15, va: 0, vc: 0.5, vd: 0 },   // 169427
  'mixed-veg': { b12: 0, ca: 25.0, chol: 0, fe: 0.95, fol: 29.0, mg: 24.0, sat: 0.098, vd: 0, zn: 0.45 },   // 170471
  'mozzarella': { b12: 0.82, fe: 0.22, fib: 0, fol: 9.0, k: 84.0, mg: 23.0, sug: 1.13, va: 127, vc: 0, vd: 0.3 },   // 170847
  'muffin': { b12: 0.16, ca: 44.0, chol: 30.0, fe: 1.3, fib: 1.1, fol: 73.0, k: 121, mg: 10.0, sat: 2.84, va: 21.0, vc: 0.9, vd: 0.1, zn: 0.37 },   // 172765
  'mulberries': { b12: 0, ca: 39.0, chol: 0, fol: 6.0, k: 194, mg: 18.0, na: 10.0, sat: 0.027, va: 1.0, vd: 0, zn: 0.12 },   // 169913
  'mung-beans': { b12: 0, ca: 27.0, chol: 0, fe: 1.4, k: 266, mg: 48.0, na: 238, sat: 0.12, sug: 2.0, va: 1.0, vc: 1.0, vd: 0, zn: 0.84 },   // 175255
  'mushrooms': { b12: 0.04, ca: 3.0, chol: 0, mg: 9.0, na: 5.0, sat: 0.05, sug: 1.98, va: 0, vc: 2.1 },   // 169251
  'mustard': { b12: 0, ca: 63.0, chol: 0, fe: 1.61, fib: 4.0, fol: 7.0, k: 152, mg: 48.0, sat: 0.21, sug: 0.92, va: 5.0, vc: 0.3, vd: 0, zn: 0.64 },   // 172234
  'naan': { ca: 84.0, fol: 102, k: 125, mg: 27.0, sat: 1.39, sug: 3.55, zn: 0.81 },   // 171845
  'nacho-chips': { b12: 0, ca: 137, chol: 0, fe: 1.16, fol: 13.0, k: 223, mg: 75.0, sat: 3.88, sug: 2.59, va: 6.0, vc: 0.4, vd: 0, zn: 1.38 },   // 167559
  'napa-cabbage': { b12: 0, ca: 29.0, chol: 0, fe: 0.74, k: 87.0, mg: 8.0, na: 11.0, va: 13.0, vd: 0, zn: 0.14 },   // 168572
  'nature-valley': { b12: 0.39, ca: 105, chol: 0, fe: 2.56, fol: 24.0, k: 325, mg: 74.0, sat: 7.25, va: 0, vc: 0, zn: 1.5 },   // 167954
  'navy-beans': { b12: 0, chol: 0, k: 561, na: 242, sat: 0.091, sug: 0.34, va: 0, vc: 0, vd: 0, zn: 1.38 },   // 175249
  'nectarine': { b12: 0, ca: 6.0, chol: 0, fe: 0.28, fol: 5.0, mg: 9.0, na: 0, sat: 0.025, vd: 0, zn: 0.17 },   // 169914
  'oat-bran': { b12: 0, ca: 58.0, chol: 0, fol: 52.0, k: 566, na: 4.0, sat: 1.33, sug: 1.45, va: 0, vc: 0, vd: 0, zn: 3.11 },   // 168872
  'oats': { b12: 0, ca: 54.0, chol: 0, fol: 56.0, na: 2.0, sat: 1.22, va: 0, vc: 0, vd: 0 },   // 169705
  'okra': { b12: 0, chol: 0, fe: 0.28, fol: 46.0, k: 135, na: 241, sat: 0.045, sug: 2.4, va: 14.0, vd: 0, zn: 0.43 },   // 170098
  'olive-oil': { b12: 0, ca: 1.0, chol: 0, fe: 0.56, fib: 0, fol: 0, k: 1.0, mg: 0, na: 2.0, sug: 0, va: 0, vc: 0, vd: 0, zn: 0 },   // 171413
  'olive-oil-drizzle': { b12: 0, ca: 1.0, chol: 0, fe: 0.56, fib: 0, fol: 0, k: 1.0, mg: 0, na: 2.0, sug: 0, va: 0, vc: 0, vd: 0, zn: 0 },   // 171413
  'olives': { b12: 0, ca: 88.0, chol: 0, fol: 0, k: 8.0, mg: 4.0, sug: 0, va: 17.0, vc: 0.9, vd: 0, zn: 0.22 },   // 169094
  'one-percent-milk': { chol: 5.0, fe: 0.03, fib: 0, fol: 5.0, mg: 11.0, sat: 0.63, va: 58.0, vc: 0, zn: 0.42 },   // 170872
  'onion': { b12: 0, chol: 0, fe: 0.21, mg: 10.0, na: 4.0, sat: 0.042, va: 0, vd: 0, zn: 0.17 },   // 170000
  'orange': { b12: 0, chol: 0, fe: 0.1, na: 0, sat: 0.015, vd: 0, zn: 0.07 },   // 169097
  'orange-juice': { b12: 0, ca: 11.0, chol: 0, fe: 0.2, fib: 0.2, mg: 11.0, na: 1.0, sat: 0.024, va: 10.0, vd: 0, zn: 0.05 },   // 169098
  'oyster-sauce': { b12: 0.41, ca: 32.0, chol: 0, fe: 0.18, fib: 0.3, fol: 15.0, k: 54.0, mg: 4.0, sat: 0.043, sug: 0, va: 0, vc: 0.1, vd: 0, zn: 0.09 },   // 174529
  'pancake-mix': { b12: 0.32, ca: 344, chol: 2.0, fe: 3.6, fib: 2.9, k: 191, mg: 28.0, sat: 0.82, zn: 0.72 },   // 172772
  'pancakes': { b12: 0.22, fe: 1.8, fol: 56.0, k: 132, mg: 16.0, sat: 2.12, va: 54.0, vc: 0.3, zn: 0.56 },   // 175009
  'papaya': { b12: 0, ca: 20.0, chol: 0, fe: 0.25, mg: 21.0, na: 8.0, sat: 0.081, vd: 0, zn: 0.08 },   // 169926
  'paratha': { b12: 0, ca: 25.0, chol: 1.0, fe: 1.61, fol: 10.0, k: 139, mg: 37.0, sat: 5.83, sug: 4.15, va: 2.0, vc: 0, vd: 0, zn: 0.82 },   // 174076
  'parmesan': { b12: 1.4, chol: 86.0, fe: 0.49, fib: 0, fol: 6.0, k: 180, mg: 34.0, sug: 0.07, va: 262, vc: 0, vd: 0.5, zn: 4.2 },   // 171247
  'parsnip': { b12: 0, ca: 37.0, chol: 0, fe: 0.58, mg: 29.0, na: 246, sat: 0.05, va: 0, vd: 0, zn: 0.26 },   // 170508
  'passion-fruit': { b12: 0, ca: 12.0, chol: 0, fe: 1.6, fol: 14.0, mg: 29.0, na: 28.0, sat: 0.059, va: 64.0, vd: 0, zn: 0.1 },   // 169108
  'pasta': { b12: 0, ca: 7.0, chol: 0, fol: 119, na: 131, sat: 0.18, sug: 0.56, va: 0, vc: 0, vd: 0, zn: 0.51 },   // 169751
  'pb-reduced-fat': { b12: 0, ca: 35.0, chol: 0, fe: 1.9, fol: 60.0, k: 669, mg: 170, sat: 5.76, va: 0, vc: 0, vd: 0, zn: 2.8 },   // 172458
  'peach': { b12: 0, ca: 6.0, chol: 0, fe: 0.25, fol: 4.0, na: 0, sat: 0.019, vd: 0, zn: 0.17 },   // 169928
  'peanut-butter': { b12: 0, ca: 54.0, chol: 0, fe: 2.16, fol: 35.0, va: 0, vc: 0, vd: 0 },   // 174294
  'peanuts': { b12: 0, ca: 92.0, chol: 0, fe: 4.58, na: 18.0, sug: 4.72, va: 0, vc: 0, vd: 0 },   // 172430
  'pear': { b12: 0, chol: 0, fe: 0.18, fol: 7.0, na: 1.0, sat: 0.022, va: 1.0, vd: 0, zn: 0.1 },   // 169118
  'peas': { b12: 0, ca: 27.0, chol: 0, na: 239, sat: 0.039, va: 40.0, vd: 0 },   // 170102
  'pecan-pie': { b12: 0.12, ca: 22.0, chol: 42.0, fe: 0.93, fib: 2.1, fol: 43.0, k: 99.0, mg: 22.0, sat: 2.65, va: 51.0, vc: 0, vd: 0.1, zn: 0.87 },   // 175021
  'pecans': { b12: 0, ca: 70.0, chol: 0, fe: 2.53, fol: 22.0, k: 410, na: 0, sug: 3.97, va: 3.0, vc: 1.1, vd: 0 },   // 170182
  'pepperoni': { b12: 1.3, ca: 19.0, fe: 1.33, fib: 0, fol: 5.0, k: 274, mg: 18.0, sug: 0, va: 0, vc: 0, vd: 1.3, zn: 2.44 },   // 174575
  'persimmon': { b12: 0, ca: 8.0, chol: 0, fe: 0.15, fol: 8.0, mg: 9.0, na: 1.0, sat: 0.02, vd: 0, zn: 0.11 },   // 169941
  'pine-nuts': { b12: 0, ca: 16.0, chol: 0, fe: 5.53, fol: 34.0, k: 597, na: 2.0, sat: 4.9, sug: 3.59, va: 1.0, vc: 0.8, vd: 0 },   // 170591
  'pineapple': { b12: 0, chol: 0, fe: 0.29, fol: 18.0, na: 1.0, sat: 0.009, va: 3.0, vd: 0, zn: 0.12 },   // 169124
  'pineapple-juice': { b12: 0, ca: 16.0, chol: 0, fe: 0.28, fib: 1.3, fol: 5.0, mg: 15.0, na: 1.0, sat: 0.008, va: 3.0, vd: 0, zn: 0.1 },   // 167767
  'pinto-beans': { b12: 0, ca: 46.0, chol: 0, na: 238, sat: 0.11, sug: 0.34, va: 0, vc: 0.8, vd: 0, zn: 0.98 },   // 173796
  'pita': { b12: 0, chol: 0, fol: 24.0, k: 120, mg: 26.0, sat: 0.17, va: 0, vc: 0, zn: 0.84 },   // 172816
  'pita-chips': { b12: 0, ca: 17.0, chol: 0, fe: 4.59, fol: 215, k: 129, mg: 37.0, sat: 1.34, sug: 4.76, va: 0, vc: 0, vd: 0, zn: 0.96 },   // 173147
  'pizza-sauce': { b12: 0.02, ca: 54.0, chol: 0, fe: 0.9, fib: 2.0, fol: 10.0, k: 354, mg: 21.0, sat: 0.46, vc: 11.3, zn: 0.25 },   // 172880
  'plantain': { ca: 3.0, fe: 0.3, fol: 48.0, mg: 28.0, na: 2.0, sat: 0.072, zn: 0.14 },   // 168216
  'plum': { b12: 0, ca: 6.0, chol: 0, fe: 0.17, fol: 5.0, mg: 7.0, na: 0, sat: 0.017, vd: 0, zn: 0.1 },   // 169949
  'poached-egg': { ca: 56.0, fe: 1.75, fib: 0, fol: 35.0, k: 138, mg: 12.0, sug: 0.37, va: 160, vc: 0, zn: 1.29 },   // 172186
  'pollock': { ca: 77.0, chol: 91.0, fe: 0.59, fib: 0, fol: 3.0, k: 456, mg: 86.0, sat: 0.17, va: 12.0, vc: 0, zn: 0.6 },   // 174237
  'pomegranate': { b12: 0, ca: 10.0, chol: 0, fe: 0.3, mg: 12.0, na: 3.0, sat: 0.12, va: 0, vd: 0, zn: 0.35 },   // 169134
  'popcorn': { b12: 0, ca: 7.0, chol: 0, fol: 31.0, k: 329, na: 8.0, sat: 0.64, sug: 0.87, va: 10.0, vc: 0, vd: 0, zn: 3.08 },   // 167959
  'pork-belly': { b12: 0.84, ca: 5.0, chol: 72.0, fe: 0.52, fib: 0, fol: 1.0, k: 185, mg: 4.0, sug: 0, va: 3.0, vc: 0.3, zn: 1.02 },   // 167812
  'pork-chop': { ca: 9.0, fe: 0.62, fib: 0, fol: 0, mg: 25.0, sug: 0, va: 5.0, vc: 0, vd: 0.3 },   // 168298
  'pork-shoulder': { b12: 0.8, ca: 24.0, chol: 90.0, fe: 1.32, fib: 0, fol: 5.0, k: 329, mg: 18.0, na: 68.0, sug: 0, va: 2.0, vc: 0.5, vd: 1.5 },   // 167844
  'pork-tenderloin': { ca: 6.0, fib: 0, fol: 0, mg: 29.0, sug: 0, va: 0, vc: 0, vd: 0.3 },   // 167905
  'potato': { b12: 0, chol: 0, fol: 9.0, sat: 0.026, sug: 1.7, va: 0, vd: 0, zn: 0.29 },   // 170112
  'potato-chips-bbq': { b12: 0, ca: 21.0, chol: 0, fe: 1.28, fol: 29.0, k: 1196, mg: 63.0, sat: 3.4, va: 0, vc: 21.6, vd: 0, zn: 1.09 },   // 169677
  'potato-salad': { b12: 0, ca: 19.0, chol: 68.0, fe: 0.65, fib: 1.3, fol: 7.0, k: 254, mg: 15.0, sat: 1.43, va: 32.0, vc: 10.0, vd: 0, zn: 0.31 },   // 169269
  'potato-wedges': { ca: 14.0, chol: 0, fe: 0.72, k: 381, sat: 1.84, sug: 0.34, vc: 5.1 },   // 168946
  'pretzels': { b12: 0, ca: 27.0, chol: 0, fol: 166, k: 223, mg: 29.0, sat: 0.39, sug: 2.21, va: 0, vc: 2.1, vd: 0, zn: 1.04 },   // 167555
  'provolone': { b12: 1.46, chol: 69.0, fe: 0.52, fib: 0, fol: 10.0, k: 138, mg: 28.0, sug: 0.56, va: 236, vc: 0, vd: 0.5, zn: 3.23 },   // 170850
  'pudding': { b12: 0.37, chol: 7.0, fe: 0.34, fib: 0.8, fol: 4.0, k: 156, mg: 21.0, sat: 1.29, va: 47.0, vc: 0.1, vd: 1.0, zn: 0.57 },   // 168780
  'pumpkin-pie': { b12: 0.35, ca: 64.0, chol: 26.0, fe: 0.9, fib: 1.8, fol: 37.0, k: 167, mg: 14.0, vc: 0, vd: 0.1, zn: 0.39 },   // 172787
  'pumpkin-puree': { b12: 0, ca: 26.0, chol: 0, fol: 12.0, mg: 23.0, na: 241, sat: 0.15, vc: 4.2, vd: 0, zn: 0.17 },   // 170527
  'pumpkin-seeds': { b12: 0, ca: 46.0, chol: 0, fol: 58.0, na: 7.0, sat: 8.66, sug: 1.4, va: 1.0, vc: 1.9, vd: 0 },   // 170556
  'quinoa': { b12: 0, ca: 17.0, chol: 0, na: 7.0, sat: 0.23, sug: 0.87, va: 0, vc: 0, vd: 0 },   // 168917
  'radish': { b12: 0, ca: 25.0, chol: 0, fe: 0.34, fol: 25.0, mg: 10.0, na: 39.0, sat: 0.032, sug: 1.86, va: 0, vd: 0, zn: 0.28 },   // 169276
  'raisin-bread': { b12: 0.05, ca: 71.0, chol: 0, fe: 2.54, fol: 81.0, k: 74.0, mg: 11.0, na: 388, sat: 0, va: 0, vc: 0, vd: 0, zn: 0.49 },   // 171849
  'raisins': { b12: 0, chol: 0, fol: 3.0, na: 28.0, sat: 0.18, va: 0, vc: 5.4, vd: 0, zn: 0.18 },   // 168166
  'ramen-noodles-fresh': { b12: 0.09, ca: 12.0, chol: 29.0, fe: 1.47, fib: 1.2, fol: 138, k: 38.0, mg: 21.0, sat: 0.42, sug: 0.4, va: 6.0, vc: 0, vd: 0.1, zn: 0.65 },   // 169732
  'raspberries': { b12: 0, chol: 0, na: 1.0, sat: 0.019, va: 2.0, vd: 0, zn: 0.42 },   // 167755
  'red-cabbage': { b12: 0, ca: 45.0, chol: 0, fe: 0.8, fol: 18.0, mg: 16.0, na: 27.0, sat: 0.021, vd: 0, zn: 0.22 },   // 169977
  'red-lentils': { b12: 0, ca: 19.0, chol: 0, k: 369, mg: 36.0, na: 238, sat: 0.053, sug: 1.8, va: 0, vc: 1.5, vd: 0, zn: 1.27 },   // 175254
  'red-potato': { b12: 0, ca: 9.0, chol: 0, fe: 0.7, fol: 27.0, na: 12.0, sat: 0.04, sug: 1.43, va: 1.0, vd: 0, zn: 0.4 },   // 170435
  'refried-beans': { b12: 0, ca: 34.0, chol: 0, fol: 57.0, k: 344, mg: 38.0, sat: 0.093, sug: 0.61, va: 0, vc: 0.9, vd: 0, zn: 0.65 },   // 172465
  'rhubarb': { b12: 0, chol: 0, fe: 0.22, fol: 7.0, mg: 12.0, na: 4.0, sat: 0.053, va: 5.0, vd: 0, zn: 0.1 },   // 167758
  'rice-cake': { b12: 0, ca: 11.0, chol: 0, fe: 1.49, fol: 21.0, k: 290, na: 26.0, sat: 0.57, sug: 0.88, va: 0, vc: 0, vd: 0, zn: 3.0 },   // 170250
  'rice-cooked-brown': { b12: 0, ca: 10.0, chol: 0, fe: 0.53, fol: 4.0, k: 79.0, sat: 0.17, va: 0, vc: 0, vd: 0, zn: 0.62 },   // 168875
  'rice-flour': { b12: 0, ca: 11.0, chol: 0, fe: 1.98, fol: 16.0, k: 289, mg: 112, na: 8.0, sat: 0.56, sug: 0.66, vc: 0, vd: 0, zn: 2.45 },   // 168898
  'rice-noodles': { b12: 0, ca: 4.0, chol: 0, fe: 0.14, fol: 1.0, k: 4.0, mg: 3.0, na: 19.0, sat: 0.023, sug: 0.03, va: 0, vc: 0, vd: 0, zn: 0.25 },   // 168914
  'rice-pudding': { b12: 0.24, chol: 11.0, fe: 0.37, fib: 0.1, fol: 4.0, k: 128, mg: 13.0, na: 108, sat: 1.68, va: 29.0, vc: 0.7, vd: 0.8, zn: 0.38 },   // 169605
  'ricotta': { b12: 0.29, fe: 0.44, fib: 0, fol: 13.0, k: 125, mg: 15.0, sug: 0.31, va: 107, vc: 0, vd: 0.1, zn: 1.34 },   // 171248
  'roast-beef': { ca: 5.0, fib: 0, fol: 5.0, k: 647, mg: 20.0, sug: 0.29, va: 3.0, vc: 0, vd: 0 },   // 174570
  'romaine': { b12: 0, chol: 0, mg: 14.0, na: 8.0, sat: 0.039, sug: 1.19, vd: 0, zn: 0.23 },   // 169247
  'roti': { ca: 93.0, fe: 3.01, fol: 61.0, k: 266, mg: 62.0, sat: 1.95, sug: 2.72, zn: 1.57 },   // 171844
  'rotisserie-chicken': { ca: 13.0, fe: 0.98, fib: 0, fol: 3.0, mg: 20.0, va: 29.0, vc: 0 },   // 171462
  'rutabaga': { b12: 0, ca: 18.0, chol: 0, fe: 0.18, fol: 15.0, mg: 10.0, na: 254, sat: 0.029, sug: 3.95, va: 0, vd: 0, zn: 0.12 },   // 170528
  'rye-bread': { b12: 0, ca: 73.0, chol: 0, fol: 151, k: 166, mg: 40.0, sat: 0.63, sug: 3.85, va: 0, vc: 0.4, vd: 0, zn: 1.14 },   // 172684
  'salami': { b12: 2.8, ca: 13.0, fe: 1.3, fib: 0, fol: 2.0, k: 378, mg: 22.0, va: 0, vc: 0, zn: 4.2 },   // 172938
  'salmon': { ca: 28.0, fe: 0.91, fib: 0, fol: 35.0, va: 149, vc: 4.1 },   // 171999
  'salmon-raw': { ca: 9.0, fe: 0.34, fib: 0, fol: 26.0, mg: 27.0, na: 59.0, sug: 0, va: 58.0, vc: 3.9, zn: 0.36 },   // 175167
  'salsa': { b12: 0, ca: 30.0, chol: 0, fe: 0.42, fol: 4.0, mg: 15.0, sat: 0.021, va: 23.0, vc: 1.9, vd: 0, zn: 0.18 },   // 174524
  'salt': { b12: 0, ca: 24.0, chol: 0, fe: 0.33, fib: 0, fol: 0, k: 8.0, mg: 1.0, sat: 0, sug: 0, va: 0, vc: 0, vd: 0, zn: 0.1 },   // 173468
  'saltines': { b12: 0.09, ca: 19.0, chol: 0, fe: 5.57, fol: 216, k: 152, mg: 23.0, sat: 1.65, sug: 1.29, va: 1.0, vc: 0, vd: 0, zn: 0.69 },   // 172746
  'sandwich-cookie': { b12: 0.07, ca: 32.0, chol: 0, fe: 2.49, fib: 1.6, fol: 37.0, k: 227, mg: 38.0, va: 0, vc: 0, vd: 0, zn: 0.67 },   // 174096
  'sardines': { fib: 0, fol: 10.0, k: 397, mg: 39.0, sug: 0, va: 32.0, vc: 0, zn: 1.31 },   // 175139
  'sauerkraut': { b12: 0, ca: 30.0, chol: 0, fe: 1.47, fol: 24.0, k: 170, mg: 13.0, sat: 0.034, sug: 1.78, va: 1.0, vd: 0, zn: 0.19 },   // 169279
  'scrambled-eggs': { fe: 1.31, fib: 0, fol: 36.0, k: 132, mg: 11.0, sug: 1.39, va: 161, vc: 0, zn: 1.04 },   // 172187
  'sea-bass': { b12: 0.3, ca: 13.0, chol: 53.0, fe: 0.37, fib: 0, fol: 6.0, k: 328, mg: 53.0, sat: 0.66, va: 64.0, vc: 0, zn: 0.52 },   // 173694
  'serrano': { b12: 0, ca: 11.0, chol: 0, fe: 0.86, fol: 23.0, k: 305, mg: 22.0, na: 10.0, sat: 0.059, sug: 3.83, va: 47.0, vd: 0, zn: 0.26 },   // 169395
  'sesame': { b12: 0, chol: 0, fol: 97.0, k: 468, na: 11.0, sat: 6.96, sug: 0.3, va: 0, vc: 0, vd: 0, zn: 7.75 },   // 170150
  'sesame-oil': { b12: 0, ca: 0, chol: 0, fe: 0, fib: 0, fol: 0, k: 0, mg: 0, na: 0, sug: 0, va: 0, vc: 0, vd: 0, zn: 0 },   // 171016
  'shallot': { b12: 0, ca: 37.0, chol: 0, fe: 1.2, fol: 34.0, mg: 21.0, na: 12.0, sat: 0.017, va: 0, vc: 8.0, vd: 0, zn: 0.4 },   // 170499
  'shiitake': { b12: 0, ca: 3.0, chol: 0, fe: 0.44, fol: 21.0, mg: 14.0, na: 240, sat: 0.05, va: 0, vc: 0.3, vd: 0.7, zn: 1.33 },   // 170097
  'short-ribs': { b12: 2.62, ca: 12.0, chol: 94.0, fe: 2.31, fib: 0, fol: 5.0, k: 224, mg: 15.0, na: 50.0, sug: 0, va: 0, vc: 0, vd: 0.7 },   // 168613
  'shortbread': { b12: 0, ca: 13.0, chol: 0, fe: 2.98, fib: 1.3, fol: 124, k: 88.0, mg: 14.0, va: 0, vc: 0, vd: 0, zn: 0.49 },   // 174967
  'shredded-mex': { b12: 1.23, fe: 0.59, fib: 0, fol: 13.0, k: 85.0, mg: 25.0, sug: 0, va: 174, vc: 0, vd: 0.5, zn: 3.01 },   // 171288
  'skim-milk': { chol: 2.0, fe: 0.04, fib: 0, fol: 5.0, mg: 11.0, sat: 0.12, va: 137, vc: 1.0, zn: 0.4 },   // 169868
  'smoked-salmon': { ca: 11.0, fe: 0.85, fib: 0, fol: 2.0, k: 175, mg: 18.0, sat: 0.93, sug: 0, va: 26.0, vc: 0, zn: 0.31 },   // 173687
  'soba': { b12: 0, ca: 4.0, chol: 0, fe: 0.48, fol: 7.0, k: 35.0, mg: 9.0, sat: 0.019, va: 0, vc: 0, vd: 0, zn: 0.12 },   // 168907
  'sockeye': { ca: 11.0, chol: 61.0, fe: 0.52, fib: 0, fol: 7.0, mg: 36.0, na: 92.0, sug: 0, va: 58.0, vc: 0, zn: 0.55 },   // 173692
  'sour-cream': { b12: 0.21, chol: 59.0, fe: 0.07, fib: 0, fol: 6.0, k: 125, mg: 10.0, sug: 3.41, va: 124, vc: 0.9, vd: 0, zn: 0.33 },   // 171257
  'soybeans': { b12: 0, chol: 0, fol: 54.0, k: 515, na: 1.0, sat: 1.3, sug: 3.0, va: 0, vc: 1.7, vd: 0, zn: 1.15 },   // 174271
  'spaghetti-squash': { b12: 0, ca: 21.0, chol: 0, fe: 0.34, fol: 8.0, mg: 11.0, na: 254, sat: 0.062, va: 6.0, vc: 3.5, vd: 0, zn: 0.2 },   // 170539
  'spinach': { b12: 0, chol: 0, sat: 0.063, sug: 0.42, vd: 0 },   // 168462
  'split-pea-soup': { b12: 0.1, ca: 14.0, chol: 3.0, fe: 0.89, fol: 2.0, k: 127, mg: 16.0, sat: 0.66, sug: 1.91, va: 102, vc: 2.9, vd: 0, zn: 1.3 },   // 171555
  'split-peas': { b12: 0, ca: 14.0, chol: 0, fe: 1.29, mg: 36.0, na: 238, sat: 0.054, sug: 2.9, va: 0, vc: 0.4, vd: 0, zn: 1.0 },   // 175257
  'steel-cut-oats': { b12: 0, ca: 351, chol: 0, fol: 32.0, k: 366, mg: 128, na: 220, sat: 1.35, sug: 1.5, va: 772, vc: 0, vd: 0, zn: 2.51 },   // 171661
  'stew-beef': { b12: 2.31, ca: 13.0, chol: 104, fib: 0, fol: 5.0, k: 237, mg: 20.0, na: 66.0, sug: 0, va: 0, vc: 0 },   // 168673
  'strawberries': { b12: 0, chol: 0, na: 1.0, sat: 0.015, va: 1.0, vd: 0, zn: 0.14 },   // 167762
  'sugar': { b12: 0, ca: 83.0, chol: 0, fe: 0.71, fib: 0, fol: 1.0, k: 133, mg: 9.0, na: 28.0, sat: 0, va: 0, vc: 0, vd: 0, zn: 0.03 },   // 168833
  'sun-dried-tomatoes': { b12: 0, ca: 47.0, chol: 0, fe: 2.68, fol: 23.0, mg: 81.0, sat: 1.89, va: 64.0, vc: 102, vd: 0, zn: 0.78 },   // 169384
  'sunflower-butter': { b12: 0, ca: 64.0, chol: 0, fe: 4.12, fol: 237, k: 576, na: 331, sat: 4.68, sug: 10.5, vc: 2.7, vd: 0, zn: 4.89 },   // 168595
  'sunflower-seeds': { b12: 0, ca: 78.0, chol: 0, fol: 227, k: 645, na: 9.0, sat: 4.46, sug: 2.62, va: 3.0, vc: 1.4, vd: 0 },   // 170562
  'sweet-potato': { b12: 0, chol: 0, fe: 0.61, fol: 11.0, sat: 0.018, vd: 0, zn: 0.3 },   // 168482
  'swiss': { fe: 0.13, fib: 0, fol: 10.0, k: 72.0, mg: 33.0, sug: 0, va: 288, vc: 0, vd: 0 },   // 171251
  'swiss-chard': { b12: 0, ca: 51.0, chol: 0, fe: 1.8, fol: 14.0, sat: 0.03, sug: 1.1, vd: 0, zn: 0.36 },   // 169991
  'swordfish': { ca: 6.0, chol: 78.0, fe: 0.45, fib: 0, fol: 2.0, k: 499, mg: 35.0, na: 97.0, sat: 1.91, sug: 0, va: 43.0, vc: 0, zn: 0.78 },   // 173704
  'taco-shell': { b12: 0, ca: 100, chol: 0, fe: 1.64, fol: 85.0, k: 231, mg: 83.0, sat: 7.11, sug: 1.5, va: 1.0, vc: 0, vd: 0, zn: 1.61 },   // 172800
  'tangerine': { b12: 0, ca: 37.0, chol: 0, fe: 0.15, fol: 16.0, mg: 12.0, na: 2.0, sat: 0.039, va: 34.0, vd: 0, zn: 0.07 },   // 169105
  'tartar': { b12: 0.02, ca: 26.0, chol: 7.0, fe: 0.25, fib: 0.5, fol: 5.0, k: 68.0, mg: 6.0, sat: 3.33, sug: 4.25, va: 11.0, vc: 2.3, vd: 0, zn: 0.12 },   // 171826
  'tea': { b12: 0, ca: 1.0, chol: 0, fe: 0, fib: 0, fol: 0, mg: 0, na: 7.0, sat: 0, sug: 0, va: 0, vc: 0, vd: 0, zn: 0.01 },   // 171911
  'tempeh': { b12: 0.08, chol: 0, fol: 24.0, na: 9.0, va: 0, vc: 0, vd: 0 },   // 174272
  'teriyaki': { b12: 0, ca: 25.0, chol: 0, fe: 1.7, fib: 0.1, fol: 8.0, k: 225, mg: 61.0, sat: 0, va: 0, vc: 0, vd: 0, zn: 0.1 },   // 171167
  'tilapia': { ca: 14.0, fe: 0.69, fib: 0, fol: 6.0, mg: 34.0, sat: 0.94, sug: 0, va: 0, vc: 0, zn: 0.41 },   // 175177
  'toaster-pastry': { b12: 0, ca: 16.0, chol: 0, fe: 5.51, fib: 1.0, fol: 174, k: 102, mg: 12.0, sat: 3.62, va: 202, vc: 0, vd: 0, zn: 0.38 },   // 175035
  'tofu': { b12: 0, chol: 0, fol: 29.0, sat: 1.26, vc: 0.2, vd: 0 },   // 172475
  'tomato': { b12: 0, ca: 10.0, chol: 0, fe: 0.27, na: 5.0, sat: 0.028, vd: 0, zn: 0.17 },   // 170457
  'tomato-juice': { b12: 0, ca: 10.0, chol: 0, fe: 0.39, fol: 20.0, mg: 11.0, sat: 0.019, sug: 2.58, va: 23.0, vd: 0, zn: 0.11 },   // 170458
  'tortilla-chips': { b12: 0, ca: 104, chol: 0, fe: 1.32, fol: 22.0, k: 206, sat: 2.78, sug: 1.21, va: 8.0, vc: 0, vd: 0, zn: 1.46 },   // 173143
  'tostada': { ca: 76.0, fe: 1.53, k: 237, mg: 76.0, sat: 7.01, zn: 1.23 },   // 167525
  'trail-mix': { b12: 0, ca: 78.0, chol: 0, fol: 71.0, k: 685, na: 229, sat: 5.55, va: 1.0, vc: 1.4, zn: 3.22 },   // 167561
  'trail-mix-sweet': { b12: 0, ca: 78.0, chol: 0, fe: 3.05, fol: 71.0, k: 685, mg: 158, na: 229, sat: 5.55, va: 1.0, vc: 1.4, zn: 3.22 },   // 167561
  'triscuit': { b12: 0, ca: 36.0, chol: 0, fe: 3.34, fol: 28.0, k: 345, mg: 110, sat: 2.06, sug: 1.19, va: 0, vc: 0, vd: 0, zn: 2.63 },   // 172749
  'trout': { ca: 30.0, fe: 0.36, fib: 0, fol: 12.0, mg: 30.0, sug: 0, va: 100, vc: 2.9, zn: 0.54 },   // 173718
  'tuna': { ca: 11.0, fib: 0, fol: 4.0, sat: 0.23, sug: 0, vc: 0, zn: 0.77 },   // 171986
  'tuna-oil': { ca: 13.0, fe: 1.39, fib: 0, fol: 5.0, k: 207, mg: 31.0, sug: 0, va: 23.0, vc: 0, zn: 0.9 },   // 173708
  'tuna-salad': { b12: 1.2, ca: 17.0, chol: 13.0, fe: 1.0, fib: 0, fol: 8.0, k: 178, mg: 19.0, sat: 1.54, va: 24.0, vc: 2.2, zn: 0.56 },   // 175160
  'turkey-breast-roast': { ca: 9.0, fe: 0.71, fib: 0, fol: 9.0, k: 249, mg: 32.0, sat: 0.59, sug: 0, va: 3.0, vc: 0, vd: 0.3 },   // 171496
  'turkey-burger': { b12: 1.8, ca: 29.0, chol: 106, fe: 1.73, fib: 0, fol: 7.0, k: 247, mg: 25.0, sug: 0, va: 31.0, vc: 0, vd: 0.2, zn: 3.71 },   // 174492
  'turkey-dark': { b12: 1.66, ca: 17.0, fe: 1.45, fib: 0, fol: 9.0, k: 228, mg: 27.0, na: 105, sug: 0, va: 14.0, vc: 0, vd: 0.4 },   // 171489
  'turkey-ground-93': { b12: 1.34, ca: 28.0, fe: 1.52, fib: 0, fol: 7.0, k: 294, mg: 30.0, sug: 0, va: 24.0, vc: 0, vd: 0.2 },   // 171506
  'turkey-ground-99': { b12: 0.37, ca: 9.0, fe: 0.71, fib: 0, fol: 10.0, k: 249, mg: 32.0, sat: 0.59, sug: 0, va: 3.0, vc: 0, vd: 0.3, zn: 1.72 },   // 171491
  'turnip': { b12: 0, ca: 22.0, chol: 0, fe: 0.22, fol: 9.0, mg: 8.0, na: 286, sat: 0.008, sug: 2.99, va: 0, vd: 0, zn: 0.2 },   // 170547
  'veg-broth': { b12: 0, ca: 3.0, chol: 0, fe: 0.06, fib: 0, fol: 0, k: 19.0, mg: 1.0, sat: 0.028, sug: 0.55, va: 12.0, vc: 0.4, vd: 0, zn: 0.03 },   // 171583
  'vegetable-soup': { b12: 0.11, ca: 14.0, chol: 3.0, fe: 0.25, fol: 13.0, k: 133, mg: 8.0, sat: 0.12, sug: 1.01, vc: 0, vd: 0, zn: 0.22 },   // 171546
  'waffle': { b12: 2.93, chol: 14.0, fib: 2.2, fol: 108, k: 125, mg: 23.0, sat: 1.53, va: 381, vc: 0, zn: 0.59 },   // 175038
  'walnuts': { b12: 0, ca: 98.0, chol: 0, fol: 98.0, na: 2.0, sug: 2.61, va: 1.0, vc: 1.3, vd: 0, zn: 3.09 },   // 170187
  'watercress': { b12: 0, chol: 0, fe: 0.2, fol: 9.0, mg: 21.0, na: 41.0, sat: 0.027, sug: 0.2, va: 160, vd: 0, zn: 0.11 },   // 170068
  'watermelon': { b12: 0, ca: 7.0, chol: 0, fe: 0.24, fol: 3.0, na: 1.0, sat: 0.016, vd: 0, zn: 0.1 },   // 167765
  'wheat-bread': { b12: 0, chol: 0, fol: 42.0, sat: 0.72, va: 0, vc: 0, vd: 0, zn: 1.77 },   // 172688
  'wheat-thins': { b12: 0, ca: 92.0, chol: 0, fe: 2.64, fol: 40.0, k: 283, mg: 72.0, sat: 3.21, sug: 15.5, va: 0, vc: 0, vd: 0, zn: 1.64 },   // 174985
  'white-bread': { b12: 0, chol: 0, k: 126, mg: 23.0, sat: 0.7, va: 0, vc: 0, vd: 0, zn: 0.74 },   // 174924
  'white-rice': { b12: 0, ca: 3.0, chol: 0, na: 0, sat: 0.057, va: 0, vc: 0, vd: 0, zn: 0.42 },   // 168880
  'whole-milk': { fe: 0.03, fib: 0, fol: 5.0, mg: 10.0, va: 46.0, vc: 0, zn: 0.37 },   // 171265
  'wild-rice': { b12: 0, ca: 3.0, chol: 0, fe: 0.6, fol: 26.0, k: 101, na: 3.0, sat: 0.049, sug: 0.73, va: 0, vc: 0, vd: 0 },   // 168897
  'wings': { b12: 0.35, ca: 18.0, fe: 0.84, fib: 0, fol: 9.0, k: 212, mg: 19.0, sug: 0, va: 12.0, vc: 0, vd: 0.2, zn: 1.64 },   // 173630
  'ww-bagel': { b12: 0, ca: 20.0, chol: 0, fe: 2.76, fol: 108, k: 165, mg: 51.0, sat: 0, sug: 6.12, va: 0, vc: 0, vd: 0, zn: 1.1 },   // 167533
  'ww-flour': { b12: 0, ca: 34.0, chol: 0, fol: 44.0, k: 363, na: 2.0, sat: 0.43, sug: 0.41, va: 0, vc: 0, vd: 0, zn: 2.6 },   // 168893
  'ww-pasta': { b12: 0, ca: 13.0, chol: 0, fol: 21.0, k: 96.0, na: 4.0, sat: 0.24, sug: 0.75, va: 0, vc: 0, vd: 0, zn: 1.34 },   // 168910
  'ww-tortilla': { b12: 0, ca: 33.0, chol: 0, fe: 3.1, fol: 78.0, k: 314, mg: 81.0, sat: 0.8, sug: 3.84, va: 0, vc: 0, vd: 0, zn: 1.5 },   // 172690
  'yam': { b12: 0, ca: 14.0, chol: 0, fe: 0.52, fol: 16.0, mg: 18.0, na: 244, sat: 0.029, sug: 0.49, va: 6.0, vd: 0, zn: 0.2 },   // 170551
  'yogurt-low-fat': { b12: 0.43, chol: 5.0, fe: 0.06, fib: 0, fol: 9.0, k: 177, mg: 13.0, na: 53.0, sat: 0.74, va: 11.0, vc: 0.6, vd: 0, zn: 0.67 },   // 170889
  'yogurt-whole': { chol: 13.0, fe: 0.05, fib: 0, fol: 7.0, mg: 12.0, na: 46.0, va: 27.0, vc: 0.5, vd: 0.1, zn: 0.59 },   // 171284
};
