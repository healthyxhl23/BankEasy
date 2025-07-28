// app/api/create-link-token/route.ts
import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';

console.log(
  'PLAID vars in route →',
  process.env.PLAID_CLIENT_ID,
  process.env.PLAID_SECRET,
  'Environment:', process.env.PLAID_ENV
);

export async function GET() {
  try {
    // For sandbox testing, start with minimal products
    const products = process.env.PLAID_ENV === 'sandbox' 
      ? [Products.Transactions] // This includes basic account info
      : [Products.Transactions, Products.Identity];

    const token = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'demo-user-' + Date.now() },
      client_name: 'BankEasy',
      language: 'en',
      products: products,
      country_codes: [CountryCode.Us],
      // Optional: Add redirect_uri if needed
      // redirect_uri: 'http://localhost:3000/dashboard',
    });

    console.log('Link token created successfully');
    return NextResponse.json({ link_token: token.data.link_token });
  } catch (err: any) {
    // Plaid wraps axios errors; err.response?.data holds a JSON error object
    console.error('Plaid error details:', {
      error: err.response?.data,
      message: err.message,
      code: err.code
    });
    
    return NextResponse.json(
      { 
        error: err.response?.data || 'Failed to create link token',
        details: err.response?.data?.error_message || err.message 
      },
      { status: 500 }
    );
  }
}