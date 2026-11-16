// Starter food list (per 100 g, approximate USDA values) and the nutrient list.
// Scanned and custom foods are saved in the store and merged in.
//
// Nutrient keys: kcal, p (protein g), c (carbs g), f (fat g), fib, sug, sat (g),
// chol, na, k, ca, fe, mg, zn (mg), va, vd, b12, fol (µg), vc (mg).

export const MACROS = [
  { k: 'p', name: 'Protein', unit: 'g', kcal: 4 },
  { k: 'c', name: 'Carbs', unit: 'g', kcal: 4 },
  { k: 'f', name: 'Fat', unit: 'g', kcal: 9 },
];

// Daily targets for an adult (US/Canada reference intakes). max = upper limit to stay under.
export const MICROS = [
  { k: 'fib', name: 'Fiber', unit: 'g', target: 38, group: 'General' },
  { k: 'sug', name: 'Sugars', unit: 'g', group: 'General' },
  { k: 'sat', name: 'Saturated fat', unit: 'g', max: 22, group: 'General' },
  { k: 'chol', name: 'Cholesterol', unit: 'mg', max: 300, group: 'General' },
  { k: 'va', name: 'Vitamin A', unit: 'µg', target: 900, group: 'Vitamins' },
  { k: 'vc', name: 'Vitamin C', unit: 'mg', target: 90, group: 'Vitamins' },
  { k: 'vd', name: 'Vitamin D', unit: 'µg', target: 15, group: 'Vitamins' },
  { k: 'b12', name: 'Vitamin B12', unit: 'µg', target: 2.4, group: 'Vitamins' },
  { k: 'fol', name: 'Folate', unit: 'µg', target: 400, group: 'Vitamins' },
  { k: 'ca', name: 'Calcium', unit: 'mg', target: 1000, group: 'Minerals' },
  { k: 'fe', name: 'Iron', unit: 'mg', target: 8, group: 'Minerals' },
  { k: 'mg', name: 'Magnesium', unit: 'mg', target: 400, group: 'Minerals' },
  { k: 'k', name: 'Potassium', unit: 'mg', target: 3400, group: 'Minerals' },
  { k: 'na', name: 'Sodium', unit: 'mg', target: 1500, max: 2300, group: 'Minerals' },
  { k: 'zn', name: 'Zinc', unit: 'mg', target: 11, group: 'Minerals' },
];
export const NUTRIENT_KEYS = ['kcal', 'p', 'c', 'f', ...MICROS.map((m) => m.k)];

export const CATEGORIES = ['Fruit', 'Vegetables', 'Protein', 'Dairy & eggs', 'Grains', 'Nuts & fats', 'Meals', 'Snacks', 'Drinks'];

// F(id, name, emoji, category, servings [[label, grams]], per-100 g nutrients)
const F = (id, name, icon, cat, servings, n) => ({ id, name, icon, cat, servings: servings.map(([label, g]) => ({ label, g })), n });

export const FOODS = [
  // Fruit
  F('apple', 'Apple', '🍎', 'Fruit', [['1 medium', 182]], { kcal: 52, p: 0.3, c: 13.8, f: 0.2, fib: 2.4, sug: 10.4, k: 107, vc: 4.6, ca: 6, mg: 5, va: 3, fol: 3, fe: 0.1 }),
  F('banana', 'Banana', '🍌', 'Fruit', [['1 medium', 118]], { kcal: 89, p: 1.1, c: 22.8, f: 0.3, fib: 2.6, sug: 12.2, k: 358, vc: 8.7, mg: 27, ca: 5, fol: 20, fe: 0.3, va: 3 }),
  F('orange', 'Orange', '🍊', 'Fruit', [['1 medium', 131]], { kcal: 47, p: 0.9, c: 11.8, f: 0.1, fib: 2.4, sug: 9.4, k: 181, vc: 53.2, ca: 40, fol: 30, va: 11, mg: 10 }),
  F('strawberries', 'Strawberries', '🍓', 'Fruit', [['1 cup', 152]], { kcal: 32, p: 0.7, c: 7.7, f: 0.3, fib: 2, sug: 4.9, k: 153, vc: 58.8, fol: 24, mg: 13, fe: 0.4, ca: 16 }),
  F('blueberries', 'Blueberries', '🫐', 'Fruit', [['1 cup', 148]], { kcal: 57, p: 0.7, c: 14.5, f: 0.3, fib: 2.4, sug: 10, k: 77, vc: 9.7, fe: 0.3, mg: 6, ca: 6 }),
  F('grapes', 'Grapes', '🍇', 'Fruit', [['1 cup', 151]], { kcal: 69, p: 0.7, c: 18.1, f: 0.2, fib: 0.9, sug: 15.5, k: 191, vc: 3.2, ca: 10, mg: 7 }),
  F('watermelon', 'Watermelon', '🍉', 'Fruit', [['1 cup diced', 152]], { kcal: 30, p: 0.6, c: 7.6, f: 0.2, fib: 0.4, sug: 6.2, k: 112, vc: 8.1, va: 28, mg: 10 }),
  F('pineapple', 'Pineapple', '🍍', 'Fruit', [['1 cup chunks', 165]], { kcal: 50, p: 0.5, c: 13.1, f: 0.1, fib: 1.4, sug: 9.9, k: 109, vc: 47.8, mg: 12, ca: 13 }),
  F('mango', 'Mango', '🥭', 'Fruit', [['1 cup sliced', 165]], { kcal: 60, p: 0.8, c: 15, f: 0.4, fib: 1.6, sug: 13.7, k: 168, vc: 36.4, va: 54, fol: 43, mg: 10 }),
  F('avocado', 'Avocado', '🥑', 'Fruit', [['½ avocado', 75], ['1 avocado', 150]], { kcal: 160, p: 2, c: 8.5, f: 14.7, fib: 6.7, sug: 0.7, sat: 2.1, k: 485, mg: 29, vc: 10, fol: 81, zn: 0.6, fe: 0.6 }),
  F('peach', 'Peach', '🍑', 'Fruit', [['1 medium', 150]], { kcal: 39, p: 0.9, c: 9.5, f: 0.3, fib: 1.5, sug: 8.4, k: 190, vc: 6.6, va: 16, mg: 9 }),
  F('pear', 'Pear', '🍐', 'Fruit', [['1 medium', 178]], { kcal: 57, p: 0.4, c: 15.2, f: 0.1, fib: 3.1, sug: 9.8, k: 116, vc: 4.3, ca: 9, mg: 7 }),
  F('cherries', 'Cherries', '🍒', 'Fruit', [['1 cup', 138]], { kcal: 63, p: 1.1, c: 16, f: 0.2, fib: 2.1, sug: 12.8, k: 222, vc: 7, ca: 13, mg: 11 }),
  F('kiwi', 'Kiwi', '🥝', 'Fruit', [['1 fruit', 69]], { kcal: 61, p: 1.1, c: 14.7, f: 0.5, fib: 3, sug: 9, k: 312, vc: 92.7, fol: 25, mg: 17, ca: 34 }),
  // Vegetables
  F('broccoli', 'Broccoli', '🥦', 'Vegetables', [['1 cup chopped', 91]], { kcal: 34, p: 2.8, c: 6.6, f: 0.4, fib: 2.6, sug: 1.7, k: 316, ca: 47, vc: 89.2, va: 31, fol: 63, fe: 0.7, mg: 21, na: 33 }),
  F('spinach', 'Spinach', '🥬', 'Vegetables', [['1 cup raw', 30]], { kcal: 23, p: 2.9, c: 3.6, f: 0.4, fib: 2.2, k: 558, ca: 99, fe: 2.7, mg: 79, va: 469, vc: 28, fol: 194, na: 79, zn: 0.5 }),
  F('carrot', 'Carrot', '🥕', 'Vegetables', [['1 medium', 61], ['1 cup baby carrots', 128]], { kcal: 41, p: 0.9, c: 9.6, f: 0.2, fib: 2.8, sug: 4.7, k: 320, va: 835, vc: 5.9, ca: 33, na: 69, mg: 12 }),
  F('tomato', 'Tomato', '🍅', 'Vegetables', [['1 medium', 123]], { kcal: 18, p: 0.9, c: 3.9, f: 0.2, fib: 1.2, sug: 2.6, k: 237, vc: 13.7, va: 42, fol: 15, mg: 11 }),
  F('cucumber', 'Cucumber', '🥒', 'Vegetables', [['1 cup sliced', 104]], { kcal: 15, p: 0.7, c: 3.6, f: 0.1, fib: 0.5, sug: 1.7, k: 147, vc: 2.8, mg: 13, ca: 16 }),
  F('bell-pepper', 'Red bell pepper', '🫑', 'Vegetables', [['1 medium', 119]], { kcal: 31, p: 1, c: 6, f: 0.3, fib: 2.1, sug: 4.2, k: 211, vc: 127.7, va: 157, fol: 46, mg: 12 }),
  F('potato', 'Baked potato', '🥔', 'Vegetables', [['1 medium', 173]], { kcal: 93, p: 2.5, c: 21.2, f: 0.1, fib: 2.2, k: 535, vc: 9.6, mg: 28, fe: 1.1, na: 10, ca: 15 }),
  F('sweet-potato', 'Sweet potato', '🍠', 'Vegetables', [['1 medium', 114]], { kcal: 90, p: 2, c: 20.7, f: 0.2, fib: 3.3, sug: 6.5, k: 475, va: 961, vc: 19.6, mg: 27, ca: 38, na: 36 }),
  F('corn', 'Corn', '🌽', 'Vegetables', [['1 ear', 103], ['1 cup', 145]], { kcal: 96, p: 3.4, c: 21, f: 1.5, fib: 2.4, sug: 4.5, k: 218, mg: 26, fol: 23, vc: 5.5 }),
  F('onion', 'Onion', '🧅', 'Vegetables', [['1 medium', 110]], { kcal: 40, p: 1.1, c: 9.3, f: 0.1, fib: 1.7, sug: 4.2, k: 146, vc: 7.4, fol: 19, ca: 23 }),
  F('mushrooms', 'Mushrooms', '🍄', 'Vegetables', [['1 cup', 70]], { kcal: 22, p: 3.1, c: 3.3, f: 0.3, fib: 1, k: 318, fe: 0.5, zn: 0.5, vd: 0.2, fol: 17 }),
  F('romaine', 'Romaine lettuce', '🥗', 'Vegetables', [['1 cup shredded', 47]], { kcal: 17, p: 1.2, c: 3.3, f: 0.3, fib: 2.1, k: 247, va: 436, vc: 4, fol: 136, ca: 33, fe: 1 }),
  F('green-beans', 'Green beans', '🫛', 'Vegetables', [['1 cup', 110]], { kcal: 31, p: 1.8, c: 7, f: 0.2, fib: 2.7, k: 211, vc: 12.2, va: 35, ca: 37, fe: 1, mg: 25 }),
  // Protein
  F('chicken-breast', 'Chicken breast, cooked', '🍗', 'Protein', [['100 g', 100], ['1 breast', 172], ['4 oz', 113]], { kcal: 165, p: 31, c: 0, f: 3.6, sat: 1, chol: 85, na: 74, k: 256, mg: 29, zn: 1, fe: 1, b12: 0.3 }),
  F('chicken-thigh', 'Chicken thigh, cooked', '🍗', 'Protein', [['1 thigh', 116], ['100 g', 100]], { kcal: 209, p: 26, c: 0, f: 10.9, sat: 3, chol: 95, na: 88, k: 240, zn: 2.4, fe: 1.3, b12: 0.4 }),
  F('ground-beef', 'Ground beef 90% lean, cooked', '🥩', 'Protein', [['4 oz', 113], ['100 g', 100]], { kcal: 217, p: 26.1, c: 0, f: 11.7, sat: 4.6, chol: 86, na: 76, k: 375, fe: 2.7, zn: 6.4, b12: 2.5 }),
  F('steak', 'Sirloin steak, cooked', '🥩', 'Protein', [['6 oz', 170], ['100 g', 100]], { kcal: 207, p: 30, c: 0, f: 8.8, sat: 3.4, chol: 89, na: 60, k: 380, fe: 2.6, zn: 5.6, b12: 1.8 }),
  F('salmon', 'Salmon, cooked', '🐟', 'Protein', [['1 fillet', 154], ['4 oz', 113]], { kcal: 206, p: 22.1, c: 0, f: 12.4, sat: 2.5, chol: 63, na: 61, k: 384, vd: 13.1, b12: 2.8, mg: 30, zn: 0.4 }),
  F('tuna', 'Tuna, canned in water', '🐟', 'Protein', [['1 can, drained', 142]], { kcal: 116, p: 25.5, c: 0, f: 0.8, chol: 30, na: 247, k: 237, b12: 2.5, vd: 1.2, fe: 1.5, mg: 27 }),
  F('shrimp', 'Shrimp, cooked', '🦐', 'Protein', [['3 oz', 85]], { kcal: 99, p: 24, c: 0.2, f: 0.3, chol: 189, na: 111, k: 259, zn: 1.6, b12: 1.1, ca: 70 }),
  F('tofu', 'Tofu, firm', '🧊', 'Protein', [['½ cup', 126]], { kcal: 144, p: 17.3, c: 2.8, f: 8.7, fib: 2.3, ca: 683, fe: 2.7, mg: 58, k: 237, na: 14, zn: 1.6 }),
  F('black-beans', 'Black beans, cooked', '🫘', 'Protein', [['1 cup', 172], ['½ cup', 86]], { kcal: 132, p: 8.9, c: 23.7, f: 0.5, fib: 8.7, k: 355, fe: 2.1, mg: 70, fol: 149, ca: 27, zn: 1.1 }),
  F('lentils', 'Lentils, cooked', '🫘', 'Protein', [['1 cup', 198]], { kcal: 116, p: 9, c: 20.1, f: 0.4, fib: 7.9, k: 369, fe: 3.3, mg: 36, fol: 181, zn: 1.3 }),
  F('chickpeas', 'Chickpeas, cooked', '🫘', 'Protein', [['1 cup', 164]], { kcal: 164, p: 8.9, c: 27.4, f: 2.6, fib: 7.6, sug: 4.8, k: 291, fe: 2.9, mg: 48, fol: 172, zn: 1.5, ca: 49 }),
  F('bacon', 'Bacon', '🥓', 'Protein', [['1 slice', 8]], { kcal: 541, p: 37, c: 1.4, f: 42, sat: 14, chol: 110, na: 1717, k: 565, zn: 3.5 }),
  F('whey', 'Whey protein powder', '🥤', 'Protein', [['1 scoop', 30]], { kcal: 400, p: 80, c: 10, f: 5, ca: 400, na: 170, k: 500, chol: 80 }),
  F('protein-bar', 'Protein bar', '🍫', 'Protein', [['1 bar', 60]], { kcal: 350, p: 33, c: 38, f: 11, fib: 15, sug: 3, sat: 4, na: 300, ca: 200 }),
  // Dairy & eggs
  F('egg', 'Egg', '🥚', 'Dairy & eggs', [['1 large', 50]], { kcal: 143, p: 12.6, c: 0.7, f: 9.5, sat: 3.1, chol: 372, na: 142, k: 138, ca: 56, fe: 1.8, zn: 1.3, va: 160, vd: 2, b12: 0.9, fol: 47 }),
  F('egg-white', 'Egg white', '🥚', 'Dairy & eggs', [['1 large', 33], ['1 cup', 243]], { kcal: 52, p: 10.9, c: 0.7, f: 0.2, na: 166, k: 163, mg: 11 }),
  F('milk', 'Milk, 2%', '🥛', 'Dairy & eggs', [['1 cup', 244]], { kcal: 50, p: 3.3, c: 4.8, f: 2, sat: 1.1, sug: 5, chol: 8, ca: 120, k: 140, na: 47, vd: 1.1, b12: 0.5, va: 55 }),
  F('greek-yogurt', 'Greek yogurt, plain nonfat', '🥣', 'Dairy & eggs', [['¾ cup', 170]], { kcal: 59, p: 10.2, c: 3.6, f: 0.4, sug: 3.2, ca: 110, k: 141, na: 36, b12: 0.75, zn: 0.5 }),
  F('cheddar', 'Cheddar cheese', '🧀', 'Dairy & eggs', [['1 slice', 28]], { kcal: 403, p: 24.9, c: 1.3, f: 33.1, sat: 21, chol: 105, na: 621, ca: 721, zn: 3.1, va: 265, b12: 0.8 }),
  F('cottage-cheese', 'Cottage cheese, 2%', '🥣', 'Dairy & eggs', [['1 cup', 226], ['½ cup', 113]], { kcal: 81, p: 10.5, c: 4.8, f: 2.3, sug: 4, sat: 1.3, na: 308, ca: 91, k: 86 }),
  F('butter', 'Butter', '🧈', 'Dairy & eggs', [['1 tbsp', 14]], { kcal: 717, p: 0.9, c: 0.1, f: 81, sat: 51, chol: 215, na: 643, va: 684 }),
  // Grains
  F('white-rice', 'White rice, cooked', '🍚', 'Grains', [['1 cup', 158]], { kcal: 130, p: 2.7, c: 28.2, f: 0.3, fib: 0.4, k: 35, fe: 1.2, fol: 58, mg: 12 }),
  F('brown-rice', 'Brown rice, cooked', '🍚', 'Grains', [['1 cup', 195]], { kcal: 123, p: 2.7, c: 25.6, f: 1, fib: 1.6, mg: 39, k: 86, zn: 0.7 }),
  F('oats', 'Oats, dry', '🥣', 'Grains', [['½ cup', 40]], { kcal: 389, p: 16.9, c: 66.3, f: 6.9, fib: 10.6, fe: 4.7, mg: 177, zn: 4, k: 429 }),
  F('pasta', 'Pasta, cooked', '🍝', 'Grains', [['1 cup', 140]], { kcal: 158, p: 5.8, c: 30.9, f: 0.9, fib: 1.8, fe: 1.3, mg: 18, k: 44 }),
  F('wheat-bread', 'Whole wheat bread', '🍞', 'Grains', [['1 slice', 32]], { kcal: 252, p: 12.4, c: 42.7, f: 3.5, fib: 6, sug: 4.4, na: 455, fe: 2.5, mg: 76, k: 254, ca: 161 }),
  F('white-bread', 'White bread', '🍞', 'Grains', [['1 slice', 25]], { kcal: 266, p: 8.9, c: 49, f: 3.3, fib: 2.4, sug: 5.7, na: 491, ca: 151, fe: 3.6, fol: 111 }),
  F('bagel', 'Bagel', '🥯', 'Grains', [['1 bagel', 105]], { kcal: 250, p: 10, c: 49, f: 1.5, fib: 2.1, sug: 6, na: 430, fe: 3.7 }),
  F('tortilla', 'Flour tortilla', '🫓', 'Grains', [['1 medium', 45]], { kcal: 306, p: 8.2, c: 50, f: 8, fib: 3.5, na: 736, ca: 146, fe: 3.6 }),
  F('quinoa', 'Quinoa, cooked', '🍚', 'Grains', [['1 cup', 185]], { kcal: 120, p: 4.4, c: 21.3, f: 1.9, fib: 2.8, mg: 64, fe: 1.5, k: 172, fol: 42, zn: 1.1 }),
  // Nuts & fats
  F('almonds', 'Almonds', '🌰', 'Nuts & fats', [['1 oz (23 nuts)', 28]], { kcal: 579, p: 21.2, c: 21.6, f: 49.9, fib: 12.5, sat: 3.8, ca: 269, mg: 270, k: 733, fe: 3.7, zn: 3.1 }),
  F('peanut-butter', 'Peanut butter', '🥜', 'Nuts & fats', [['2 tbsp', 32]], { kcal: 588, p: 25, c: 20, f: 50, fib: 6, sug: 9, sat: 10, na: 459, mg: 154, k: 558, zn: 2.9 }),
  F('walnuts', 'Walnuts', '🌰', 'Nuts & fats', [['1 oz', 28]], { kcal: 654, p: 15.2, c: 13.7, f: 65.2, fib: 6.7, sat: 6.1, mg: 158, k: 441, fe: 2.9 }),
  F('olive-oil', 'Olive oil', '🫒', 'Nuts & fats', [['1 tbsp', 13.5]], { kcal: 884, p: 0, c: 0, f: 100, sat: 13.8 }),
  F('hummus', 'Hummus', '🥙', 'Nuts & fats', [['2 tbsp', 30]], { kcal: 166, p: 7.9, c: 14.3, f: 9.6, fib: 6, na: 379, fe: 2.4, mg: 71 }),
  // Meals
  F('pizza', 'Cheese pizza', '🍕', 'Meals', [['1 slice', 107]], { kcal: 266, p: 11.4, c: 33.3, f: 9.7, fib: 2.3, sug: 3.6, sat: 4.5, chol: 17, na: 598, ca: 188, fe: 2.5 }),
  F('cheeseburger', 'Cheeseburger', '🍔', 'Meals', [['1 burger', 119]], { kcal: 252, p: 13, c: 26, f: 10.5, sat: 4.6, chol: 34, na: 620, ca: 140, fe: 2.4 }),
  F('fries', 'French fries', '🍟', 'Meals', [['medium', 117]], { kcal: 312, p: 3.4, c: 41.4, f: 15, fib: 3.8, na: 210, k: 579 }),
  F('burrito', 'Beef & bean burrito', '🌯', 'Meals', [['1 burrito', 300]], { kcal: 200, p: 9, c: 22, f: 8, fib: 3, sat: 3.5, na: 520, ca: 80, fe: 2 }),
  F('sushi', 'California roll', '🍣', 'Meals', [['6 pieces', 165]], { kcal: 155, p: 3.6, c: 23, f: 5, fib: 1.4, na: 400 }),
  // Snacks
  F('dark-chocolate', 'Dark chocolate 70%', '🍫', 'Snacks', [['1 oz', 28]], { kcal: 598, p: 7.8, c: 45.9, f: 42.6, fib: 10.9, sug: 24, sat: 24.5, fe: 11.9, mg: 228, k: 715, zn: 3.3 }),
  F('ice-cream', 'Ice cream', '🍨', 'Snacks', [['½ cup', 66]], { kcal: 207, p: 3.5, c: 23.6, f: 11, sat: 6.8, sug: 21, chol: 44, ca: 128 }),
  F('cookie', 'Chocolate chip cookie', '🍪', 'Snacks', [['1 cookie', 16]], { kcal: 488, p: 5, c: 64, f: 24, sug: 35, sat: 8, na: 350 }),
  F('popcorn', 'Popcorn, air-popped', '🍿', 'Snacks', [['1 cup', 8], ['3 cups', 24]], { kcal: 387, p: 12.9, c: 77.8, f: 4.5, fib: 14.5, mg: 144, fe: 3.2 }),
  F('rice-cake', 'Rice cake', '🍘', 'Snacks', [['1 cake', 9]], { kcal: 387, p: 8.2, c: 81.5, f: 2.8, fib: 4.2, mg: 131 }),
  F('honey', 'Honey', '🍯', 'Snacks', [['1 tbsp', 21]], { kcal: 304, p: 0.3, c: 82.4, f: 0, sug: 82.1 }),
  // Drinks
  F('coffee', 'Coffee, black', '☕', 'Drinks', [['1 cup', 237]], { kcal: 1, p: 0.1, c: 0, f: 0, k: 49, mg: 3 }),
  F('orange-juice', 'Orange juice', '🧃', 'Drinks', [['1 cup', 248]], { kcal: 45, p: 0.7, c: 10.4, f: 0.2, sug: 8.4, k: 200, vc: 50, fol: 30 }),
  F('cola', 'Cola', '🥤', 'Drinks', [['1 can', 368]], { kcal: 42, p: 0, c: 10.6, f: 0, sug: 10.6, na: 4 }),
  F('beer', 'Beer', '🍺', 'Drinks', [['1 can', 356]], { kcal: 43, p: 0.5, c: 3.6, f: 0 }),
  F('wine', 'Red wine', '🍷', 'Drinks', [['1 glass', 147]], { kcal: 85, p: 0.1, c: 2.6, f: 0, k: 127 }),
];
