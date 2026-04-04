'use client';

import { useState, useMemo } from 'react';

export interface Transaction {
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

interface Filters {
  dateFrom: string;
  dateTo: string;
  category: string;
  amountMin: string;
  amountMax: string;
  direction: 'all' | 'debit' | 'credit';
}

const emptyFilters: Filters = { dateFrom: '', dateTo: '', category: '', amountMin: '', amountMax: '', direction: 'all' };

interface TransactionFilterProps {
  transactions: Transaction[];
  children: (filteredTransactions: Transaction[]) => React.ReactNode;
}

export default function TransactionFilter({ transactions, children }: TransactionFilterProps) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(true);

  const updateFilter = (key: keyof Filters, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters(emptyFilters);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.dateFrom) c++; if (filters.dateTo) c++; if (filters.category) c++;
    if (filters.amountMin) c++; if (filters.amountMax) c++; if (filters.direction !== 'all') c++;
    return c;
  }, [filters]);

  const categoryOptions = useMemo(() => {
    const s = new Set<string>();
    for (const tx of transactions) {
      if (tx.personal_finance_category) s.add(tx.personal_finance_category.primary);
      else if (tx.category?.[0]) s.add(tx.category[0]);
    }
    return Array.from(s).sort();
  }, [transactions]);

  const fmtCat = (r: string) => r.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const filteredTransactions = useMemo(() => transactions.filter(tx => {
    if (filters.dateFrom && tx.date < filters.dateFrom) return false;
    if (filters.dateTo && tx.date > filters.dateTo) return false;
    if (filters.category) { const c = tx.personal_finance_category?.primary || tx.category?.[0] || ''; if (c !== filters.category) return false; }
    if (filters.amountMin) { const m = parseFloat(filters.amountMin); if (!isNaN(m) && Math.abs(tx.amount) < m) return false; }
    if (filters.amountMax) { const m = parseFloat(filters.amountMax); if (!isNaN(m) && Math.abs(tx.amount) > m) return false; }
    if (filters.direction === 'debit' && tx.amount <= 0) return false;
    if (filters.direction === 'credit' && tx.amount >= 0) return false;
    return true;
  }), [transactions, filters]);

  const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filter header */}
      <div onClick={() => setShowFilters(f => !f)}
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 select-none rounded-t-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">Filter Transactions</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold min-w-[20px]">{activeFilterCount}</span>
          )}
          <span className="text-xs text-gray-500 ml-1">— {filteredTransactions.length} of {transactions.length} shown</span>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Filter controls — 2 rows × 3 cols */}
      {showFilters && (
        <div className="px-5 py-5 border-b border-gray-200 bg-gray-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">From Date</label>
              <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">To Date</label>
              <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
              <select value={filters.category} onChange={e => updateFilter('category', e.target.value)} className={inputCls}>
                <option value="">All Categories</option>
                {categoryOptions.map(cat => <option key={cat} value={cat}>{fmtCat(cat)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Min Amount ($)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={filters.amountMin} onChange={e => updateFilter('amountMin', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Max Amount ($)</label>
              <input type="number" min="0" step="0.01" placeholder="Any" value={filters.amountMax} onChange={e => updateFilter('amountMax', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Direction</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden h-[38px]">
                {(['all', 'debit', 'credit'] as const).map(dir => (
                  <button key={dir} onClick={() => updateFilter('direction', dir)}
                    className={`flex-1 text-sm font-medium transition-colors ${
                      filters.direction === dir
                        ? dir === 'debit' ? 'bg-red-50 text-red-700' : dir === 'credit' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}>
                    {dir === 'all' ? 'All' : dir === 'debit' ? '↑ Debit' : '↓ Credit'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-end mt-4">
              <button onClick={clearFilters} className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collapsed filter pills */}
      {!showFilters && activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-200">
          {filters.dateFrom && <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">From: {filters.dateFrom}<button onClick={() => updateFilter('dateFrom', '')} className="ml-0.5">×</button></span>}
          {filters.dateTo && <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">To: {filters.dateTo}<button onClick={() => updateFilter('dateTo', '')} className="ml-0.5">×</button></span>}
          {filters.category && <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-medium px-2.5 py-1 rounded-full">{fmtCat(filters.category)}<button onClick={() => updateFilter('category', '')} className="ml-0.5">×</button></span>}
          {filters.amountMin && <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">Min: ${filters.amountMin}<button onClick={() => updateFilter('amountMin', '')} className="ml-0.5">×</button></span>}
          {filters.amountMax && <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">Max: ${filters.amountMax}<button onClick={() => updateFilter('amountMax', '')} className="ml-0.5">×</button></span>}
          {filters.direction !== 'all' && <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${filters.direction === 'debit' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{filters.direction === 'debit' ? '↑ Debit' : '↓ Credit'}<button onClick={() => updateFilter('direction', 'all')} className="ml-0.5">×</button></span>}
          <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-600 ml-1">Clear all</button>
        </div>
      )}

      {/* Render children with filtered transactions */}
      {children(filteredTransactions)}
    </div>
  );
}
