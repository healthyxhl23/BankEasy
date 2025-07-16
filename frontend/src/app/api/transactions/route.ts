// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();
    
    // First, try to sync transactions (this ensures we have the latest data)
    try {
      await plaidClient.transactionsSync({
        access_token,
      });
      console.log('Transactions synced successfully');
    } catch (syncError) {
      console.log('Sync not needed or not available:', syncError);
    }
    
    // Get transactions from the last 90 days (sandbox might not have recent transactions)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);
    
    console.log('Fetching transactions between:', {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    });
    
    const response = await plaidClient.transactionsGet({
      access_token,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      options: {
        count: 100,
        offset: 0,
      }
    });
    
    console.log('Transactions response:', {
      total: response.data.total_transactions,
      fetched: response.data.transactions.length,
      sample: response.data.transactions[0] // Log first transaction to see structure
    });
    
    // Ensure all transactions have required fields
    const safeTransactions = response.data.transactions.map(transaction => ({
      ...transaction,
      category: transaction.category || [],
      merchant_name: transaction.merchant_name || null,
      name: transaction.name || 'Unknown Transaction',
    }));
    
    return NextResponse.json({
      transactions: safeTransactions,
      total_transactions: response.data.total_transactions,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', {
      error: error.response?.data,
      message: error.message,
      code: error.code
    });
    
    // If it's a specific Plaid error about products not being ready
    if (error.response?.data?.error_code === 'PRODUCT_NOT_READY') {
      return NextResponse.json({
        transactions: [],
        total_transactions: 0,
        message: 'Transactions are still being processed. Please try again in a few moments.'
      });
    }
    
    return NextResponse.json(
      { 
        error: error.response?.data || 'Failed to fetch transactions',
        transactions: [],
        total_transactions: 0
      },
      { status: 500 }
    );
  }
}