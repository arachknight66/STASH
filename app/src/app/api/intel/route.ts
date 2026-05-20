import { NextRequest } from 'next/server';
import { ok, fail, serverError, getUserId } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);

    // Fetch user's recent transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const buckets = await prisma.bucket.findMany({ where: { userId } });

    if (transactions.length === 0) {
      return ok({
        summary: 'No transactions to analyze yet. Start logging your spending!',
        tips: ['Log your first transaction from the Dashboard'],
        vibeCheck: 'Nothing to vibe check yet — go spend something!',
        proInsight: 'Your financial journey starts with the first receipt.',
      });
    }

    // Build stats
    const totalSpent = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const topCategory = Object.entries(categories).sort(([, a], [, b]) => b - a)[0]?.[0] || 'OTHER';
    const recoveryMove = (categories[topCategory] || 0) * 0.2;

    if (!GEMINI_API_KEY) {
      // Mock intel based on real data when API key is missing
      return ok({
        summary: 'Your spending is chaotic but recoverable.',
        tips: [
          'Cut down on food delivery by $50/week.',
          'Your weekend spending is 3x your weekday average.',
          'Consider moving 10% of income directly to buckets on payday.'
        ],
        vibeCheck: 'Treat-yourself mode is activated a bit too often.',
        proInsight: `If you trimmed your top category (${topCategory}) by 20%, you could save $${recoveryMove.toFixed(2)} this month without feeling it.`,
      });
    }
    const catBreakdown = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(', ');

    const bucketSummary = buckets.length > 0
      ? buckets.map(b => `${b.name}: $${b.savedUsd.toFixed(2)}/$${b.targetUsd.toFixed(2)}`).join(', ')
      : 'No savings buckets set up.';

    const prompt = `You are a brutally honest, Gen-Z-friendly personal finance advisor for the app STASH. Analyze this user's financial data and respond in JSON format.

USER DATA:
- Total spent (USD): $${totalSpent.toFixed(2)}
- Total income (USD): $${totalIncome.toFixed(2)}  
- Category breakdown: ${catBreakdown}
- Savings buckets: ${bucketSummary}
- Number of transactions: ${transactions.length}
- Most recent purchase: ${transactions[0].merchant} ($${transactions[0].amount.toFixed(2)}, ${transactions[0].category})

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "summary": "A 1-2 sentence brutally honest overall financial health summary. Be witty but real.",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "vibeCheck": "A short, punchy vibe check of their spending habits. Use Gen-Z slang sparingly.",
  "proInsight": "One specific, actionable piece of advice with a real dollar amount they could save."
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[Intel AI Error]', err);
      // Fallback gracefully to local mock if rate-limited
      return ok({
        summary: 'Your spending is chaotic but recoverable.',
        tips: [
          'Cut down on food delivery by $50/week.',
          'Your weekend spending is 3x your weekday average.',
          'Consider moving 10% of income directly to buckets on payday.'
        ],
        vibeCheck: 'Treat-yourself mode is activated a bit too often.',
        proInsight: `If you trimmed your top category (${topCategory}) by 20%, you could save $${recoveryMove.toFixed(2)} this month without feeling it.`,
      });
    }

    const geminiRes = await res.json();
    const rawText = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse JSON from response (handle possible markdown wrapping)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return ok({
        summary: rawText.slice(0, 200),
        tips: [],
        vibeCheck: 'AI responded but in an unexpected format.',
        proInsight: rawText.slice(0, 300),
      });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return ok(analysis);
  } catch (e) {
    return serverError(e);
  }
}
