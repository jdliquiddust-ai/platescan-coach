// Unit conversions — always store metric internally
export const kgToLbs = (kg)      => Math.round(kg * 2.20462 * 10) / 10;
export const lbsToKg = (lbs)     => Math.round((lbs / 2.20462) * 10) / 10;
export const cmToIn  = (cm)      => Math.round((cm / 2.54) * 10) / 10;
export const inToCm  = (inches)  => Math.round(inches * 2.54 * 10) / 10;

const ACTIVITY = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const calcBMR = ({ weight, height, age, gender }) => {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
};

export const calcTDEE = (profile) =>
  Math.round(calcBMR(profile) * ACTIVITY[profile.activityLevel]);

export const calcGoals = (profile) => {
  const tdee = calcTDEE(profile);
  const calories =
    profile.goal === 'lose'  ? Math.round(tdee * 0.8) :
    profile.goal === 'build' ? Math.round(tdee * 1.1) : tdee;

  const age    = profile.age    || 25;
  const weight = profile.weight || 70;

  // Weight-based protein targets, age-adjusted (g per kg)
  const proteinPerKg =
    age < 13 ? (profile.goal === 'build' ? 1.2 : profile.goal === 'lose' ? 1.1 : 0.95) :
    age < 18 ? (profile.goal === 'build' ? 1.8 : profile.goal === 'lose' ? 1.5 : 1.2)  :
               (profile.goal === 'build' ? 2.0 : profile.goal === 'lose' ? 1.6 : 1.4);

  const protein     = Math.round(weight * proteinPerKg);
  const remaining   = Math.max(0, calories - protein * 4);
  const carbRatio   = profile.goal === 'build' ? 0.65 : 0.55;
  const carbs       = Math.round((remaining * carbRatio) / 4);
  const fat         = Math.round((remaining * (1 - carbRatio)) / 9);

  return { calories, protein, carbs, fat };
};

export const sumMacros = (meals) =>
  meals.reduce(
    (a, m) => ({
      calories: a.calories + (m.totalCalories || 0),
      protein:  a.protein  + (m.totalProtein  || 0),
      carbs:    a.carbs    + (m.totalCarbs    || 0),
      fat:      a.fat      + (m.totalFat      || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABELS = {
  breakfast: { label: 'Breakfast', emoji: '🌅' },
  lunch:     { label: 'Lunch',     emoji: '☀️' },
  dinner:    { label: 'Dinner',    emoji: '🌙' },
  snack:     { label: 'Snack',     emoji: '🍎' },
};

export const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};
