// app/api/gemini/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini - make sure GEMINI_API_KEY is in your .env.local
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { prompt, type, transactionData } = await req.json();

    // Use Gemini 1.5 Flash for free tier
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let fullPrompt = '';

    if (type === 'explain-transaction') {
      fullPrompt = `You are a helpful financial assistant for seniors. Please explain this financial transaction in simple, clear terms that an elderly person would understand. Avoid jargon and use everyday language.

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
    } else if (type === 'chat') {
      fullPrompt = `You are a friendly financial assistant designed specifically to help seniors understand their bank accounts and transactions. 

Guidelines:
- Use simple, clear language without financial jargon
- Be patient and thorough in explanations
- Use relatable examples when possible
- Be reassuring and supportive
- If discussing potential concerns, be gentle but clear
- Always prioritize clarity over brevity

User message: ${prompt}`;
    } else {
      fullPrompt = prompt;
    }

    const result = await model.generateContent(fullPrompt);
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