// app/api/exchange-public-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';

export async function POST(request: NextRequest) {
  try {
    const { public_token } = await request.json();
    
    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });
    
    return NextResponse.json({
      access_token: response.data.access_token,
      item_id: response.data.item_id,
    });
  } catch (error: any) {
    console.error('Error exchanging public token:', error.response?.data ?? error);
    return NextResponse.json(
      { error: error.response?.data ?? 'Failed to exchange public token' },
      { status: 500 }
    );
  }
}