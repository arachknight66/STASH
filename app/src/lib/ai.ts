const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Mock fallbacks for when there's no API key
const MOCK_TAGS: Record<string, string[]> = {
  FOOD: ['comfort food', 'late night craving', 'meal prep fail', 'weekend treat', 'sweet tooth'],
  DRIP: ['impulse buy', 'wardrobe update', 'treat yourself', 'sale find'],
  ENTERTAINMENT: ['weekend plans', 'memory maker', 'subscription', 'boredom cure'],
  COFFEE: ['caffeine fix', 'morning ritual', 'pick me up', 'productivity fuel'],
  TRANSPORT: ['commute', 'getting around', 'road trip', 'surge pricing'],
  INCOME: ['payday', 'side hustle', 'cash flow', 'bucket fuel'],
  BILLS: ['adulting', 'recurring', 'necessary evil'],
  OTHER: ['random', 'necessity', 'splurge'],
};

const MOCK_INSIGHTS: Record<string, string[]> = {
  FOOD: ['Eating out again? Your wallet is crying, but your stomach is happy.', 'That could have been 3 days of groceries.'],
  DRIP: ['Looking fresh costs money. Hope you wear it more than once.', 'Retail therapy is real.'],
  COFFEE: ['Fueling the machine one cup at a time.', 'That $5 coffee adds up, but who is counting?'],
  ENTERTAINMENT: ['Money comes back, time doesn\'t. Good spend.', 'Having fun is allowed. Proceed.'],
  INCOME: ['The eagle has landed. Put some in a bucket.', 'Money up! Stay focused.'],
};

function getRandomFallback(arr: string[], count: number) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export async function generateTags(merchant: string, amount: number, category: string, type: string): Promise<string[]> {
  if (!GEMINI_API_KEY) {
    const pool = MOCK_TAGS[category] || MOCK_TAGS.OTHER;
    return getRandomFallback(pool, Math.floor(Math.random() * 2) + 2); // 2-3 tags
  }

  try {
    const prompt = `You are a financial tagging AI. Given this transaction, generate 2-4 SHORT tags (2-3 words each) that describe the spending pattern or behavior.

Transaction:
- Merchant: ${merchant}
- Amount: $${amount.toFixed(2)}
- Category: ${category}
- Type: ${type}

Rules:
- Tags should be lowercase
- Tags should be insightful (e.g. "weekend splurge", "recurring expense", "impulse buy", "meal prep fail", "caffeine fix", "payday spend")
- Do NOT use generic tags like "expense" or "purchase"
- Be witty but useful

Respond with ONLY a JSON array of strings, nothing else. Example: ["impulse buy", "late night order", "comfort food"]`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 100 },
        }),
      }
    );

    if (!res.ok) throw new Error('API error');

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No array found');

    const tags = JSON.parse(match[0]);
    return Array.isArray(tags) ? tags.slice(0, 4).map((t: string) => String(t).toLowerCase()) : [];
  } catch {
    const pool = MOCK_TAGS[category] || MOCK_TAGS.OTHER;
    return getRandomFallback(pool, 2);
  }
}

export async function generateInsight(merchant: string, amount: number, category: string, type: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    const pool = MOCK_INSIGHTS[category] || ['Just another transaction.', 'Keeps the economy moving.'];
    return getRandomFallback(pool, 1)[0];
  }

  try {
    const prompt = `You are a brutally honest Gen-Z financial advisor. Give ONE short sentence (max 15 words) about this transaction. Be witty, useful, slightly savage.

- Merchant: ${merchant}
- Amount: $${amount.toFixed(2)}
- Category: ${category}
- Type: ${type}

Respond with ONLY the sentence, no quotes, no explanation.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 50 },
        }),
      }
    );

    if (!res.ok) throw new Error('API error');

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    return text.length > 0 && text.length < 200 ? text : null;
  } catch {
    const pool = MOCK_INSIGHTS[category] || ['Just another transaction.'];
    return getRandomFallback(pool, 1)[0];
  }
}
