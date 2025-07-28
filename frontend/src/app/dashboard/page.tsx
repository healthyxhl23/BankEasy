'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useRouter } from 'next/navigation';

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

interface Identity {
  account_id: string;
  owners: Array<{
    names: string[];
    emails: Array<{ data: string; primary: boolean }>;
    phone_numbers: Array<{ data: string; primary: boolean }>;
    addresses: Array<{
      data: {
        street: string;
        city: string;
        region: string;
        postal_code: string;
        country: string;
      };
      primary: boolean;
    }>;
  }>;
}

export default function PlaidDashboard() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [identity, setIdentity] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'identity'>('accounts');

  // Fetch link token
  const fetchLinkToken = useCallback(async () => {
    try {
      const res = await fetch('/api/create-link-token');
      if (!res.ok) throw new Error('Failed to create link token');
      const { link_token } = await res.json();
      setLinkToken(link_token);
      return true;
    } catch (err) {
      setError('Failed to initialize Plaid Link');
      return false;
    }
  }, []);

  // Exchange public token for access token
  const exchangePublicToken = useCallback(async (publicToken: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/exchange-public-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      });
      
      if (!res.ok) throw new Error('Failed to exchange token');
      const { access_token } = await res.json();
      setAccessToken(access_token);
      
      // Store in localStorage for persistence (in production, use secure storage)
      localStorage.setItem('plaid_access_token', access_token);
      
      // Fetch account data immediately after getting access token
      await fetchAccountData(access_token);
    } catch (err) {
      setError('Failed to connect account');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch account data
  const fetchAccountData = useCallback(async (token: string) => {
    try {
      setLoading(true);
      
      // Fetch accounts
      const accountsRes = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
      });
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.accounts);
      }

      // Fetch transactions
      try {
        const transactionsRes = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token }),
        });
        
        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          console.log('Transactions data:', transactionsData);
          setTransactions(transactionsData.transactions || []);
        } else {
          console.error('Failed to fetch transactions:', await transactionsRes.text());
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      }

      // Fetch identity (optional - may not be available in all environments)
      try {
        const identityRes = await fetch('/api/identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token }),
        });
        
        if (identityRes.ok) {
          const identityData = await identityRes.json();
          setIdentity(identityData.accounts);
        } else {
          console.log('Identity data not available - this is normal if identity product is not enabled');
        }
      } catch (err) {
        console.log('Could not fetch identity data:', err);
      }
    } catch (err) {
      setError('Failed to fetch account data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken || '',
    onSuccess: (public_token) => {
      exchangePublicToken(public_token);
    },
    onExit: () => {
      // Handle exit
    },
  });

  // Check for existing access token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('plaid_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
      fetchAccountData(storedToken);
    }
  }, [fetchAccountData]);

  // Auto-open Link when ready
  useEffect(() => {
    if (linkToken && ready && !accessToken) {
      open();
    }
  }, [linkToken, ready, open, accessToken]);

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

  // Handle disconnect
  const handleDisconnect = () => {
    localStorage.removeItem('plaid_access_token');
    setAccessToken(null);
    setAccounts([]);
    setTransactions([]);
    setIdentity([]);
    setLinkToken(null);
  };

  // Handle connect
  const handleConnect = () => {
    if (!linkToken) {
      fetchLinkToken();
    } else if (ready) {
      open();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account information...</p>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Connect Your Bank Account</h1>
          <button
            onClick={handleConnect}
            disabled={!!linkToken && !ready}
            className="rounded-lg bg-blue-600 px-8 py-4 text-white text-lg font-medium
                     transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Connect with Plaid
          </button>
          {error && (
            <p className="mt-4 text-red-600">{error}</p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Account Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => fetchAccountData(accessToken!)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Disconnect Account
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'accounts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Accounts ({accounts.length})
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
              <button
                onClick={() => setActiveTab('identity')}
                className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'identity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Identity
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'accounts' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <div 
                key={account.account_id} 
                className="bg-white rounded-lg shadow p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                onClick={() => router.push(`/dashboard/account/${account.account_id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {account.type} • {account.subtype} • ****{account.mask}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Balance:</span>
                    <span className="font-medium">
                      {formatCurrency(account.balances.current, account.balances.iso_currency_code)}
                    </span>
                  </div>
                  {account.balances.available !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available:</span>
                      <span className="font-medium">
                        {formatCurrency(account.balances.available, account.balances.iso_currency_code)}
                      </span>
                    </div>
                  )}
                  {account.balances.limit !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credit Limit:</span>
                      <span className="font-medium">
                        {formatCurrency(account.balances.limit, account.balances.iso_currency_code)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500 mb-2">No transactions found.</p>
                <p className="text-sm text-gray-400">
                  In Plaid sandbox mode, transactions may take a moment to sync or may not be available for all test accounts. 
                  Try refreshing the data or reconnecting your account.
                </p>
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
                        Account
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
                    {transactions.slice(0, 20).map((transaction) => {
                      const account = accounts.find(acc => acc.account_id === transaction.account_id);
                      return (
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div 
                              className="cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => router.push(`/dashboard/account/${transaction.account_id}`)}
                            >
                              <div className="font-medium">{account?.name || 'Unknown Account'}</div>
                              <div className="text-xs text-gray-500">****{account?.mask}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(() => {
                              if (transaction.personal_finance_category) {
                                const primaryCategory = transaction.personal_finance_category.primary
                                  .toLowerCase()
                                  .split('_')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                
                                const detailedCategory = transaction.personal_finance_category.detailed
                                  .toLowerCase()
                                  .split('_')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                
                                const confidenceColor = {
                                  'HIGH': 'text-green-600',
                                  'MEDIUM': 'text-yellow-600',
                                  'LOW': 'text-gray-400'
                                }[transaction.personal_finance_category.confidence_level] || 'text-gray-400';
                                
                                return (
                                  <div className="group relative cursor-help">
                                    <div className="flex items-center">
                                      <span>{primaryCategory}</span>
                                      <svg 
                                        className={`ml-1 w-3 h-3 ${confidenceColor}`} 
                                        fill="currentColor" 
                                        viewBox="0 0 20 20"
                                      >
                                        <circle cx="10" cy="10" r="10" opacity="0.3"/>
                                        <circle cx="10" cy="10" r="6" />
                                      </svg>
                                    </div>
                                    <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-2 px-3 bottom-full left-0 mb-2 w-64">
                                      <div className="font-medium mb-1">{detailedCategory}</div>
                                      <div className="text-gray-300">
                                        Confidence: <span className={confidenceColor}>{transaction.personal_finance_category.confidence_level}</span>
                                      </div>
                                      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                                    </div>
                                  </div>
                                );
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'identity' && (
          <div className="space-y-6">
            {identity.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">
                  Identity information is not available. This may be because the identity product 
                  is not enabled for your Plaid environment or account type.
                </p>
              </div>
            ) : (
              <>
                {identity.map((acc) => (
                  <div key={acc.account_id} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Account ending in ****{accounts.find(a => a.account_id === acc.account_id)?.mask}
                    </h3>
                    {acc.owners.map((owner, idx) => (
                      <div key={idx} className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-700">Name</h4>
                          <p className="text-gray-900">{owner.names.join(', ')}</p>
                        </div>
                        
                        {owner.emails.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-700">Email</h4>
                            {owner.emails.map((email, i) => (
                              <p key={i} className="text-gray-900">
                                {email.data}
                                {email.primary && <span className="text-sm text-gray-500 ml-2">(Primary)</span>}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {owner.phone_numbers.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-700">Phone</h4>
                            {owner.phone_numbers.map((phone, i) => (
                              <p key={i} className="text-gray-900">
                                {phone.data}
                                {phone.primary && <span className="text-sm text-gray-500 ml-2">(Primary)</span>}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {owner.addresses.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-700">Address</h4>
                            {owner.addresses.map((addr, i) => (
                              <div key={i} className="text-gray-900">
                                <p>{addr.data.street}</p>
                                <p>{addr.data.city}, {addr.data.region} {addr.data.postal_code}</p>
                                <p>{addr.data.country}</p>
                                {addr.primary && <p className="text-sm text-gray-500">(Primary)</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}