import { NextRequest } from 'next/server';
import { ok, fail, serverError, getUserId } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);

    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) return fail('Message is required', 400);

    // Fetch user transactions & buckets for real-time context
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const buckets = await prisma.bucket.findMany({
      where: { userId },
    });

    const totalSpent = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const topCategory = Object.entries(categories).sort(([, a], [, b]) => b - a)[0]?.[0] || 'OTHER';
    const catBreakdown = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(', ');

    const bucketSummary = buckets.length > 0
      ? buckets.map(b => `${b.name}: $${b.savedUsd.toFixed(2)}/$${b.targetUsd.toFixed(2)} (${Math.round((b.savedUsd / b.targetUsd) * 100)}% saved)`).join(', ')
      : 'No savings buckets set up.';

    const systemPrompt = `You are STASH, a brutally honest, sarcastic, but highly intelligent Gen-Z personal finance coach. You help the user manage their money, track transactions, and stay on budget. You should analyze their financial data and answer their query directly. Keep it relatively concise, punchy, and funny. Use emojis and Gen-Z slang (no cap, real, down bad, cooked, secure the bag, math ain't mathing) but don't overdo it. Keep your tone realistic and honest.

USER CURRENT FINANCIAL DATA:
- Total spent (USD): $${totalSpent.toFixed(2)}
- Total income (USD): $${totalIncome.toFixed(2)}  
- Category breakdown: ${catBreakdown || 'None logged'}
- Savings buckets: ${bucketSummary}
- Number of transactions: ${transactions.length}
- Top spending category: ${topCategory}

RECENT TRANSACTIONS:
${transactions.slice(0, 10).map(t => `- ${t.merchant}: $${t.amount.toFixed(2)} (${t.category}, ${t.type === 'INCOME' ? 'Income' : 'Expense'})`).join('\n') || 'No transactions logged yet.'}

Provide useful, direct tips. If the user asks general questions, answer them, but relate it back to their spending patterns if relevant.`;

    if (!GEMINI_API_KEY) {
      // Mock witty response when Gemini is not configured
      const fallbackMsgs = [
        `No API key configured, so I'm running on dial-up brain cells right now. But looking at your spend of $${totalSpent.toFixed(2)}, you're down bad. Maybe chill on the ${topCategory} transactions? No cap.`,
        `API key is missing, bestie. But honestly? Your total spend ($${totalSpent.toFixed(2)}) compared to income ($${totalIncome.toFixed(2)}) tells me all I need to know. Make it make sense!`,
        `Running in offline mode. Let's talk about the $${totalSpent.toFixed(2)} you spent. Are we securing the bag, or are we just funding ${topCategory}? Cook some ramen at home tonight.`,
      ];
      const randomMsg = fallbackMsgs[Math.floor(Math.random() * fallbackMsgs.length)];
      return ok({ text: randomMsg });
    }

    // Format Gemini contents structure
    const contents = [
      ...history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[Chat AI Error]', err);
      return ok({ text: `Ugh, my brain cells just short-circuited. (Gemini API errored: ${res.status}). But check your $${totalSpent.toFixed(2)} spending anyway.` });
    }

    const geminiRes = await res.json();
    const rawText = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text ?? "I've got nothing to say... which is rare.";

    return ok({ text: rawText.trim() });
  } catch (e) {
    return serverError(e);
  }
}
