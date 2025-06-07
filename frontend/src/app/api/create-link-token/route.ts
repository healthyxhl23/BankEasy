import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';

console.log(
    'PLAID vars in route →',
    process.env.PLAID_CLIENT_ID,
    process.env.PLAID_SECRET
  );
  

export async function GET() {
  try {
    const token = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'demo-user' },
      client_name: 'BankEasy',
      language: 'en',
      products:      [Products.Transactions],   // <- simplest sandbox combo
      country_codes: [CountryCode.Us],
    });

    return NextResponse.json({ link_token: token.data.link_token });
  } catch (err: any) {
    // Plaid wraps axios errors; err.response?.data holds a JSON error object
    console.error('Plaid 400 details →', err.response?.data ?? err);
    return NextResponse.json(
      { error: err.response?.data ?? 'unexpected server error' },
      { status: 500 }
    );
  }
}
