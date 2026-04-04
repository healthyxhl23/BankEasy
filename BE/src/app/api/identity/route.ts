// app/api/identity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();
    
    const response = await plaidClient.identityGet({
      access_token,
    });
    
    return NextResponse.json({
      accounts: response.data.accounts,
      item: response.data.item,
    });
  } catch (error: any) {
    console.error('Error fetching identity:', error.response?.data ?? error);
    return NextResponse.json(
      { error: error.response?.data ?? 'Failed to fetch identity' },
      { status: 500 }
    );
  }
}