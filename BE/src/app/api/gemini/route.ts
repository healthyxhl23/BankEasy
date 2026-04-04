// app/api/gemini/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { prompt, type, transactionData, financialContext, audioData, audioMimeType } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // ── Build financial context string (shared by chat & voice-chat) ──
    const buildFinancialContext = () => {
      if (!financialContext) return '';
      let ctx = '';
      const { accounts, transactions } = financialContext;

      if (accounts?.length > 0) {
        ctx += `\n\nThe user's connected bank accounts:\n`;
        for (const acc of accounts) {
          ctx += `- ${acc.name} (${acc.type}/${acc.subtype}, ending ****${acc.mask}): Current balance ${acc.balances.current !== null ? '$' + acc.balances.current.toFixed(2) : 'N/A'}`;
          if (acc.balances.available !== null) ctx += `, Available $${acc.balances.available.toFixed(2)}`;
          if (acc.balances.limit !== null) ctx += `, Credit limit $${acc.balances.limit.toFixed(2)}`;
          ctx += ` (${acc.balances.iso_currency_code})\n`;
        }
      }

      if (transactions?.length > 0) {
        ctx += `\nThe user's recent transactions (most recent first):\n`;
        for (const tx of transactions.slice(0, 30)) {
          const amountStr = tx.amount > 0 ? `-$${tx.amount.toFixed(2)} spent` : `+$${Math.abs(tx.amount).toFixed(2)} received`;
          const merchant = tx.merchant_name || tx.name || 'Unknown';
          const category = tx.personal_finance_category
            ? tx.personal_finance_category.primary.toLowerCase().replace(/_/g, ' ')
            : (tx.category?.[0] || 'uncategorized');
          ctx += `- ${tx.date}: ${merchant} | ${amountStr} | Category: ${category}${tx.pending ? ' (PENDING)' : ''}\n`;
        }
      }
      return ctx;
    };

    const systemPrompt = `You are a friendly financial assistant designed specifically to help seniors understand their bank accounts and transactions. 

Guidelines:
- Use simple, clear language without financial jargon
- Be patient and thorough in explanations
- Use relatable examples when possible
- Be reassuring and supportive
- If discussing potential concerns, be gentle but clear
- Always prioritize clarity over brevity
- When the user asks about their transactions or accounts, reference the actual data provided below
- If the user asks about a specific transaction, find the matching one from the data and explain it
- If the user asks about spending patterns, calculate totals from the transaction data`;

    // ── Voice chat: audio input via Gemini multimodal ──
    if (type === 'voice-chat') {
      if (!audioData) {
        return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
      }

      const contextSection = buildFinancialContext();

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: audioMimeType || 'audio/webm',
            data: audioData,
          },
        },
        {
          text: `${systemPrompt}
${contextSection}

The user has sent a voice message (audio above). First, understand what they are asking, then respond helpfully. Respond in text only — do not include a transcription of their words, just answer their question or request directly.`
        },
      ]);

      const response = await result.response;
      const text = response.text();
      return NextResponse.json({ text });
    }

    // ── Text chat ──
    if (type === 'chat') {
      const contextSection = buildFinancialContext();
      const fullPrompt = `${systemPrompt}
${contextSection}

User message: ${prompt}`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      return NextResponse.json({ text });
    }

    // ── Explain transaction ──
    if (type === 'explain-transaction') {
      const fullPrompt = `You are a helpful financial assistant for seniors. Please explain this financial transaction in simple, clear terms that an elderly person would understand. Avoid jargon and use everyday language.

Transaction details:
- Amount: ${transactionData.amount > 0 ? `-$${transactionData.amount}` : `+$${Math.abs(transactionData.amount)}`} (${transactionData.amount > 0 ? 'money spent' : 'money received'})
- Date: ${transactionData.date}
- Description: ${transactionData.name}
- Merchant: ${transactionData.merchant_name || 'Not specified'}
- Category: ${transactionData.category}
- Status: ${transactionData.pending ? 'Pending (not final yet)' : 'Completed'}

Please provide:
1. A simple explanation of what this transaction is
2. Why this charge/credit appeared
3. If it's a normal transaction or if they should be concerned
4. Any helpful tips related to this type of transaction

Keep the response friendly, reassuring, and easy to understand.`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      return NextResponse.json({ text });
    }

    // ── Fallback: raw prompt ──
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return NextResponse.json({ text });

  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
