'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useRouter } from 'next/navigation';
import TransactionDetailModal from '@/app/components/dashboard/TransactionDetailModal';
import TransactionFilter from '@/app/components/dashboard/TransactionFilter';
import type { Transaction } from '@/app/components/dashboard/TransactionFilter';

interface Account {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balances: { available: number | null; current: number | null; limit: number | null; iso_currency_code: string };
}

interface Identity {
  account_id: string;
  owners: Array<{
    names: string[];
    emails: Array<{ data: string; primary: boolean }>;
    phone_numbers: Array<{ data: string; primary: boolean }>;
    addresses: Array<{ data: { street: string; city: string; region: string; postal_code: string; country: string }; primary: boolean }>;
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
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const fetchLinkToken = useCallback(async () => { try { const r = await fetch('/api/create-link-token'); if (!r.ok) throw 0; const { link_token } = await r.json(); setLinkToken(link_token); return true; } catch { setError('Failed to initialize Plaid Link'); return false; } }, []);
  const exchangePublicToken = useCallback(async (pt: string) => { try { setLoading(true); const r = await fetch('/api/exchange-public-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_token: pt }) }); if (!r.ok) throw 0; const { access_token } = await r.json(); setAccessToken(access_token); localStorage.setItem('plaid_access_token', access_token); await fetchAccountData(access_token); } catch { setError('Failed to connect account'); } finally { setLoading(false); } }, []);
  const fetchAccountData = useCallback(async (token: string) => { try { setLoading(true); const aR = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: token }) }); if (aR.ok) { const d = await aR.json(); setAccounts(d.accounts); } try { const tR = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: token }) }); if (tR.ok) { const d = await tR.json(); setTransactions(d.transactions || []); } } catch {} try { const iR = await fetch('/api/identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: token }) }); if (iR.ok) { const d = await iR.json(); setIdentity(d.accounts); } } catch {} } catch { setError('Failed to fetch account data'); } finally { setLoading(false); } }, []);
  const { open, ready } = usePlaidLink({ token: linkToken || '', onSuccess: (pt) => exchangePublicToken(pt), onExit: () => {} });
  useEffect(() => { const t = localStorage.getItem('plaid_access_token'); if (t) { setAccessToken(t); fetchAccountData(t); } }, [fetchAccountData]);
  useEffect(() => { if (linkToken && ready && !accessToken) open(); }, [linkToken, ready, open, accessToken]);

  const formatCurrency = (a: number | null, c: string) => a === null ? 'N/A' : new Intl.NumberFormat('en-US', { style: 'currency', currency: c || 'USD' }).format(a);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const fmtCat = (r: string) => r.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const handleDisconnect = () => { localStorage.removeItem('plaid_access_token'); setAccessToken(null); setAccounts([]); setTransactions([]); setIdentity([]); setLinkToken(null); };
  const handleConnect = () => { if (!linkToken) fetchLinkToken(); else if (ready) open(); };

  if (loading) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" /><p className="mt-4 text-gray-600">Loading account information...</p></div></div>);
  if (!accessToken) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><h1 className="text-3xl font-bold text-gray-900 mb-8">Connect Your Bank Account</h1><button onClick={handleConnect} disabled={!!linkToken && !ready} className="rounded-lg bg-blue-600 px-8 py-4 text-white text-lg font-medium hover:bg-blue-700 disabled:opacity-50">Connect with Plaid</button>{error && <p className="mt-4 text-red-600">{error}</p>}</div></div>);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Account Dashboard</h1>
          <div className="flex gap-4">
            <button onClick={() => router.push('/dashboard/assistant')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>Financial Assistant</button>
            <button onClick={() => fetchAccountData(accessToken!)} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Refreshing...' : 'Refresh Data'}</button>
            <button onClick={handleDisconnect} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Disconnect Account</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6"><div className="border-b border-gray-200"><nav className="-mb-px flex">
          {(['accounts', 'transactions', 'identity'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-3 px-6 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'accounts' ? `Accounts (${accounts.length})` : tab === 'transactions' ? `Transactions (${transactions.length})` : 'Identity'}
            </button>
          ))}
        </nav></div></div>

        {activeTab === 'accounts' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map(account => (
              <div key={account.account_id} className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all" onClick={() => router.push(`/dashboard/account/${account.account_id}`)}>
                <div className="flex justify-between items-start mb-4"><h3 className="text-lg font-semibold text-gray-900">{account.name}</h3><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div>
                <p className="text-sm text-gray-500 mb-4">{account.type} • {account.subtype} • ****{account.mask}</p>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Current Balance:</span><span className="font-medium">{formatCurrency(account.balances.current, account.balances.iso_currency_code)}</span></div>
                  {account.balances.available !== null && <div className="flex justify-between"><span className="text-gray-600">Available:</span><span className="font-medium">{formatCurrency(account.balances.available, account.balances.iso_currency_code)}</span></div>}
                  {account.balances.limit !== null && <div className="flex justify-between"><span className="text-gray-600">Credit Limit:</span><span className="font-medium">{formatCurrency(account.balances.limit, account.balances.iso_currency_code)}</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transactions' && (
          <TransactionFilter transactions={transactions}>
            {(filtered) => filtered.length === 0 ? (
              <div className="p-8 text-center">
                {transactions.length === 0
                  ? <><p className="text-gray-500 mb-2">No transactions found.</p><p className="text-sm text-gray-400">In Plaid sandbox mode, transactions may take a moment to sync.</p></>
                  : <><svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><p className="text-gray-500">No transactions match your filters.</p></>
                }
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filtered.map(tx => {
                      const acc = accounts.find(a => a.account_id === tx.account_id);
                      return (
                        <tr key={tx.transaction_id} className="hover:bg-gray-50 cursor-pointer transition-colors group" onClick={() => setSelectedTransaction(tx)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(tx.date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900"><div className="flex items-center justify-between gap-2"><span className="truncate">{tx.merchant_name || tx.name || 'Unknown'}{tx.pending && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>}</span><span className="text-blue-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">View details →</span></div></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600"><div className="cursor-pointer hover:text-blue-600" onClick={e => { e.stopPropagation(); router.push(`/dashboard/account/${tx.account_id}`); }}><div className="font-medium">{acc?.name || 'Unknown Account'}</div><div className="text-xs text-gray-500">****{acc?.mask}</div></div></td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tx.personal_finance_category ? (() => { const pc = tx.personal_finance_category!; const cc = ({ HIGH: 'text-green-600', MEDIUM: 'text-yellow-600', LOW: 'text-gray-400' } as Record<string,string>)[pc.confidence_level] || 'text-gray-400'; return (<div className="group relative cursor-help"><div className="flex items-center"><span>{fmtCat(pc.primary)}</span><svg className={`ml-1 w-3 h-3 ${cc}`} fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" opacity="0.3"/><circle cx="10" cy="10" r="6"/></svg></div><div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded py-2 px-3 bottom-full left-0 mb-2 w-64"><div className="font-medium mb-1">{fmtCat(pc.detailed)}</div><div className="text-gray-300">Confidence: <span className={cc}>{pc.confidence_level}</span></div><div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" /></div></div>); })() : tx.category?.length ? tx.category[0] : <span className="text-gray-400 italic">Uncategorized</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium"><span className={tx.amount > 0 ? 'text-red-600' : 'text-green-600'}>{tx.amount > 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TransactionFilter>
        )}

        {activeTab === 'identity' && (
          <div className="space-y-6">
            {identity.length === 0 ? (<div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-gray-500">Identity information is not available.</p></div>) : identity.map(acc => (
              <div key={acc.account_id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account ending in ****{accounts.find(a => a.account_id === acc.account_id)?.mask}</h3>
                {acc.owners.map((owner, idx) => (<div key={idx} className="space-y-4">
                  <div><h4 className="font-medium text-gray-700">Name</h4><p className="text-gray-900">{owner.names.join(', ')}</p></div>
                  {owner.emails.length > 0 && <div><h4 className="font-medium text-gray-700">Email</h4>{owner.emails.map((e, i) => <p key={i} className="text-gray-900">{e.data}{e.primary && <span className="text-sm text-gray-500 ml-2">(Primary)</span>}</p>)}</div>}
                  {owner.phone_numbers.length > 0 && <div><h4 className="font-medium text-gray-700">Phone</h4>{owner.phone_numbers.map((p, i) => <p key={i} className="text-gray-900">{p.data}{p.primary && <span className="text-sm text-gray-500 ml-2">(Primary)</span>}</p>)}</div>}
                  {owner.addresses.length > 0 && <div><h4 className="font-medium text-gray-700">Address</h4>{owner.addresses.map((a, i) => <div key={i} className="text-gray-900"><p>{a.data.street}</p><p>{a.data.city}, {a.data.region} {a.data.postal_code}</p><p>{a.data.country}</p>{a.primary && <p className="text-sm text-gray-500">(Primary)</p>}</div>)}</div>}
                </div>))}
              </div>
            ))}
          </div>
        )}

        <TransactionDetailModal transaction={selectedTransaction} account={accounts.find(a => a.account_id === selectedTransaction?.account_id)} onClose={() => setSelectedTransaction(null)} />
      </div>
    </div>
  );
}
