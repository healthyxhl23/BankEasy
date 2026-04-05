// src/lib/plaid.ts
import plaid, { PlaidEnvironments } from 'plaid';

export const plaidClient = new plaid.PlaidApi(
  new plaid.Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV as 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
        'PLAID-SECRET':    process.env.PLAID_SECRET!,
      },
    },
  })
);
