// app/dashboard/account/[accountId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TransactionDetailModal from '@/app/components/dashboard/TransactionDetailModal';
import TransactionFilter from '@/app/components/dashboard/TransactionFilter';
import type { Transaction } from '@/app/components/dashboard/TransactionFilter';

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

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        setLoading(true);
        const accessToken = localStorage.getItem('plaid_access_token');
        if (!accessToken) { router.push('/dashboard'); return; }

        const accountsRes = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: accessToken }) });
        if (accountsRes.ok) {
          const data = await accountsRes.json();
          const found = data.accounts.find((acc: Account) => acc.account_id === accountId);
          if (found) setAccount(found); else { router.push('/dashboard'); return; }
        }

        const transactionsRes = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: accessToken }) });
        if (transactionsRes.ok) {
          const data = await transactionsRes.json();
          setTransactions((data.transactions || []).filter((t: Transaction) => t.account_id === accountId));
        }
      } catch (error) {
        console.error('Error fetching account details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccountDetails();
  }, [accountId, router]);

  const formatCurrency = (amount: number | null, currencyCode: string) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode || 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const fmtCat = (r: string) => r.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (loading || !account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading account details...</p>
        </div>
      </div>
    );
  }

  const totalSpent = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalReceived = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const pendingCount = transactions.filter(t => t.pending).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Account header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
              <p className="text-gray-500 mt-1">{account.type} • {account.subtype} • ****{account.mask}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(account.balances.current, account.balances.iso_currency_code)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-xl font-semibold">{formatCurrency(account.balances.available, account.balances.iso_currency_code)}</p>
            </div>
            {account.balances.limit !== null && (
              <div>
                <p className="text-sm text-gray-500">Credit Limit</p>
                <p className="text-xl font-semibold">{formatCurrency(account.balances.limit, account.balances.iso_currency_code)}</p>
              </div>
            )}
            {account.balances.limit !== null && account.balances.current !== null && (
              <div>
                <p className="text-sm text-gray-500">Available Credit</p>
                <p className="text-xl font-semibold">{formatCurrency(account.balances.limit - account.balances.current, account.balances.iso_currency_code)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button onClick={() => setActiveTab('overview')} className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Overview</button>
              <button onClick={() => setActiveTab('transactions')} className={`py-3 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === 'transactions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Transactions ({transactions.length})</button>
            </nav>
          </div>
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Spent</h3>
              <p className="text-2xl font-bold text-red-600">-{formatCurrency(totalSpent, account.balances.iso_currency_code)}</p>
              <p className="text-sm text-gray-500 mt-1">This period</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Received</h3>
              <p className="text-2xl font-bold text-green-600">+{formatCurrency(totalReceived, account.balances.iso_currency_code)}</p>
              <p className="text-sm text-gray-500 mt-1">This period</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending</h3>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-sm text-gray-500 mt-1">Transactions</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 md:col-span-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
              <div className="space-y-3">
                {(() => {
                  const m = new Map<string, number>();
                  transactions.filter(t => t.amount > 0).forEach(t => {
                    const cat = t.personal_finance_category?.primary || t.category?.[0] || 'Uncategorized';
                    m.set(cat, (m.get(cat) || 0) + t.amount);
                  });
                  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between items-center">
                      <span className="text-gray-600">{fmtCat(cat)}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(amt, account.balances.iso_currency_code)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Transactions with shared filter */}
        {activeTab === 'transactions' && (
          <TransactionFilter transactions={transactions}>
            {(filtered) => filtered.length === 0 ? (
              <div className="p-8 text-center">
                {transactions.length === 0
                  ? <p className="text-gray-500">No transactions found for this account.</p>
                  : <><svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><p className="text-gray-500">No transactions match your filters.</p></>
                }
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map(tx => (
                      <tr key={tx.transaction_id} className="hover:bg-gray-50 cursor-pointer transition-colors group" onClick={() => setSelectedTransaction(tx)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(tx.date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{tx.merchant_name || tx.name || 'Unknown'}{tx.pending && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>}</span>
                            <span className="text-blue-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">View details →</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tx.personal_finance_category ? (() => {
                            const pc = tx.personal_finance_category!;
                            const cc = ({ HIGH: 'text-green-600', MEDIUM: 'text-yellow-600', LOW: 'text-gray-400' } as Record<string,string>)[pc.confidence_level] || 'text-gray-400';
                            return (
                              <div className="group relative cursor-help">
                                <div className="flex items-center"><span>{fmtCat(pc.primary)}</span><svg className={`ml-1 w-3 h-3 ${cc}`} fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" opacity="0.3"/><circle cx="10" cy="10" r="6"/></svg></div>
                                <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-2 px-3 bottom-full left-0 mb-2 w-64">
                                  <div className="font-medium mb-1">{fmtCat(pc.detailed)}</div>
                                  <div className="text-gray-300">Confidence: <span className={cc}>{pc.confidence_level}</span></div>
                                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" />
                                </div>
                              </div>
                            );
                          })() : tx.category?.length ? tx.category[0] : <span className="text-gray-400 italic">Uncategorized</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={tx.amount > 0 ? 'text-red-600' : 'text-green-600'}>{tx.amount > 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TransactionFilter>
        )}

        <TransactionDetailModal transaction={selectedTransaction} account={account} onClose={() => setSelectedTransaction(null)} />
      </div>
    </div>
  );
}
