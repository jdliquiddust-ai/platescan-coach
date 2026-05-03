const ANTHROPIC = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const KEY = import.meta.env.VITE_ANTHROPIC_KEY;

async function callClaude(messages, max_tokens = 1024) {
  const res = await fetch(ANTHROPIC, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens, messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Claude API error');
  return data.content[0].text;
}

function parseJSON(text) {
  const clean = text.replace(/```(?:json)?\n?/g, '').trim();
  return JSON.parse(clean);
}

export async function analyzePhoto(base64, mediaType) {
  const text = await callClaude([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      {
        type: 'text',
        text: `Analyze this meal photo. Return ONLY valid JSON, no markdown:
{"items":[{"name":"item name","calories":0,"protein":0,"carbs":0,"fat":0}],"totalCalories":0,"totalProtein":0,"totalCarbs":0,"totalFat":0}
Use realistic portion-size estimates. All values are numbers.`,
      },
    ],
  }]);
  return parseJSON(text);
}

export async function analyzeText(description) {
  const text = await callClaude([{
    role: 'user',
    content: `Parse this meal description and return ONLY valid JSON, no markdown:
{"items":[{"name":"item name","calories":0,"protein":0,"carbs":0,"fat":0}],"totalCalories":0,"totalProtein":0,"totalCarbs":0,"totalFat":0}

Meal: "${description}"

Use standard USDA nutritional data. All macro values in grams, calories as kcal.`,
  }]);
  return parseJSON(text);
}

export async function lookupBarcode(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = await res.json();
  if (data.status !== 1) throw new Error('Product not found. Check the barcode and try again.');

  const p = data.product;
  const n = p.nutriments || {};
  const cal = Math.round(n['energy-kcal_serving'] ?? n['energy-kcal_100g'] ?? 0);
  const pro = Math.round(n.proteins_serving ?? n.proteins_100g ?? 0);
  const crb = Math.round(n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0);
  const fat = Math.round(n.fat_serving ?? n.fat_100g ?? 0);

  return {
    items: [{ name: p.product_name || 'Unknown Product', calories: cal, protein: pro, carbs: crb, fat, servingSize: p.serving_size || '100g' }],
    totalCalories: cal, totalProtein: pro, totalCarbs: crb, totalFat: fat,
  };
}

export async function getCoachInsight(profile, meals, goals) {
  const consumed = meals.reduce(
    (a, m) => ({ calories: a.calories + m.totalCalories, protein: a.protein + m.totalProtein, carbs: a.carbs + m.totalCarbs, fat: a.fat + m.totalFat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const rem = {
    calories: goals.calories - consumed.calories,
    protein:  goals.protein  - consumed.protein,
    carbs:    goals.carbs    - consumed.carbs,
    fat:      goals.fat      - consumed.fat,
  };
  const h = new Date().getHours();
  const timeOfDay = h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  const mealLog = meals.length
    ? meals.map(m => `${m.mealType}: ${m.items.map(i => i.name).join(', ')} (${m.totalCalories} kcal, ${m.totalProtein}g protein)`).join('\n')
    : 'No meals logged yet today.';
  const goalLabel = profile.goal === 'lose' ? 'lose weight' : profile.goal === 'build' ? 'build muscle' : 'maintain weight';

  const text = await callClaude([{
    role: 'user',
    content: `You are a direct, knowledgeable nutrition coach for ${profile.name || 'this person'} whose goal is to ${goalLabel}.

Today's log (${timeOfDay}):
${mealLog}

Daily goals: ${goals.calories} kcal | P:${goals.protein}g C:${goals.carbs}g F:${goals.fat}g
Consumed:    ${consumed.calories} kcal | P:${consumed.protein}g C:${consumed.carbs}g F:${consumed.fat}g
Remaining:   ${rem.calories} kcal | P:${rem.protein}g C:${rem.carbs}g F:${rem.fat}g

Return ONLY valid JSON, no markdown:
{"insight":"exactly 2 sentences, personal and motivating, reference specific numbers","suggestions":["specific food + portion that helps hit remaining protein/macro target","second specific food + portion option"]}`,
  }], 512);
  return parseJSON(text);
}
