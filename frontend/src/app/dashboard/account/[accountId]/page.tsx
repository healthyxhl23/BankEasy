// app/dashboard/account/[accountId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Account {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
    iso_currency_code: string;
  };
}

interface Transaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[];
  personal_finance_category?: {
    confidence_level: string;
    detailed: string;
    primary: string;
  };
  pending: boolean;
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;
  
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        setLoading(true);
        const accessToken = localStorage.getItem('plaid_access_token');
        
        if (!accessToken) {
          router.push('/dashboard');
          return;
        }

        // Fetch accounts
        const accountsRes = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        });
        
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          const foundAccount = accountsData.accounts.find((acc: Account) => acc.account_id === accountId);
          if (foundAccount) {
            setAccount(foundAccount);
          } else {
            router.push('/dashboard');
            return;
          }
        }

        // Fetch transactions
        const transactionsRes = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        });
        
        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          // Filter transactions for this account only
          const accountTransactions = transactionsData.transactions.filter(
            (t: Transaction) => t.account_id === accountId
          );
          setTransactions(accountTransactions);
        }
      } catch (error) {
        console.error('Error fetching account details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountDetails();
  }, [accountId, router]);

  // Format currency
  const formatCurrency = (amount: number | null, currencyCode: string) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading || !account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account details...</p>
        </div>
      </div>
    );
  }

  // Calculate transaction statistics
  const totalSpent = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalReceived = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const pendingTransactions = transactions.filter(t => t.pending).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Account Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
              <p className="text-gray-500 mt-1">
                {account.type} • {account.subtype} • ****{account.mask}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(account.balances.current, account.balances.iso_currency_code)}
              </p>
            </div>
          </div>

          {/* Balance Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-xl font-semibold">
                {formatCurrency(account.balances.available, account.balances.iso_currency_code)}
              </p>
            </div>
            {account.balances.limit !== null && (
              <div>
                <p className="text-sm text-gray-500">Credit Limit</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(account.balances.limit, account.balances.iso_currency_code)}
                </p>
              </div>
            )}
            {account.balances.limit !== null && account.balances.current !== null && (
              <div>
                <p className="text-sm text-gray-500">Available Credit</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(
                    account.balances.limit - account.balances.current,
                    account.balances.iso_currency_code
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Transactions ({transactions.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Spent</h3>
              <p className="text-2xl font-bold text-red-600">
                -{formatCurrency(totalSpent, account.balances.iso_currency_code)}
              </p>
              <p className="text-sm text-gray-500 mt-1">This period</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Received</h3>
              <p className="text-2xl font-bold text-green-600">
                +{formatCurrency(totalReceived, account.balances.iso_currency_code)}
              </p>
              <p className="text-sm text-gray-500 mt-1">This period</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending</h3>
              <p className="text-2xl font-bold text-yellow-600">{pendingTransactions}</p>
              <p className="text-sm text-gray-500 mt-1">Transactions</p>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-lg shadow p-6 md:col-span-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
              <div className="space-y-3">
                {(() => {
                  const categoryTotals = new Map<string, number>();
                  transactions
                    .filter(t => t.amount > 0)
                    .forEach(t => {
                      const category = t.personal_finance_category?.primary || 
                                     (t.category && t.category[0]) || 
                                     'Uncategorized';
                      const current = categoryTotals.get(category) || 0;
                      categoryTotals.set(category, current + t.amount);
                    });
                  
                  return Array.from(categoryTotals.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="text-gray-600">
                          {category.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ')}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(amount, account.balances.iso_currency_code)}
                        </span>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No transactions found for this account.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.transaction_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.merchant_name || transaction.name || 'Unknown'}
                          {transaction.pending && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            if (transaction.personal_finance_category) {
                              const primaryCategory = transaction.personal_finance_category.primary
                                .toLowerCase()
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                              
                              return primaryCategory;
                            } else if (transaction.category && transaction.category.length > 0) {
                              return transaction.category[0];
                            } else {
                              return <span className="text-gray-400 italic">Uncategorized</span>;
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={transaction.amount > 0 ? 'text-red-600' : 'text-green-600'}>
                            {transaction.amount > 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}