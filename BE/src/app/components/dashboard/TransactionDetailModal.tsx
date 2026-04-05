// app/components/dashboard/TransactionDetailModal.tsx

'use client';

import { useState } from 'react';

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

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  account: Account | undefined;
  onClose: () => void;
}

// Parse simple markdown into React elements
function FormattedExplanation({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Section headers: ### 1. Title or ## Title
    const headerMatch = trimmed.match(/^#{1,3}\s*\d*\.?\s*(.+)/);
    if (headerMatch) {
      elements.push(
        <div key={key++} className="flex items-center gap-2 mt-5 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
          <h4 className="text-base font-semibold text-purple-900">
            {parseBold(headerMatch[1])}
          </h4>
        </div>
      );
      continue;
    }

    // Numbered items without markdown headers: "1. Something"
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={key++} className="flex items-start gap-3 mt-4 mb-1.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0 mt-0.5">
            {numberedMatch[1]}
          </span>
          <h4 className="text-base font-semibold text-purple-900">
            {parseBold(numberedMatch[2])}
          </h4>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-gray-700 leading-relaxed text-[15px] ml-0.5">
        {parseBold(trimmed)}
      </p>
    );
  }

  return <div>{elements}</div>;
}

// Convert **bold** markers to styled spans
function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-semibold text-gray-900">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function TransactionDetailModal({ 
  transaction, 
  account, 
  onClose 
}: TransactionDetailModalProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account?.balances.iso_currency_code || 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCategory = (category: string) => {
    return category
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const explainTransaction = async () => {
    setLoadingExplanation(true);
    setShowExplanation(true);
    
    try {
      const category = transaction.personal_finance_category 
        ? formatCategory(transaction.personal_finance_category.primary)
        : transaction.category?.[0] || 'Uncategorized';

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'explain-transaction',
          transactionData: {
            amount: transaction.amount,
            date: formatDate(transaction.date),
            name: transaction.name,
            merchant_name: transaction.merchant_name,
            category: category,
            pending: transaction.pending
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExplanation(data.text);
      } else {
        setExplanation('Sorry, I couldn\'t explain this transaction right now. Please try again later.');
      }
    } catch (error) {
      setExplanation('Sorry, I couldn\'t explain this transaction right now. Please try again later.');
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Transaction Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Transaction Amount and Status */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 mb-1">Amount</p>
                <p className={`text-3xl font-bold ${transaction.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {transaction.amount > 0 ? '-' : '+'}{formatCurrency(transaction.amount)}
                </p>
              </div>
              {transaction.pending && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              )}
            </div>
          </div>

          {/* Senior-Friendly Explanation Button */}
          <div className="mb-6">
            <button
              onClick={explainTransaction}
              disabled={loadingExplanation}
              className="w-full bg-purple-600 text-white rounded-lg px-4 py-3 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {loadingExplanation ? 'Explaining...' : 'Explain This Transaction (Simple Terms)'}
            </button>
            
            {showExplanation && (
              <div className="mt-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 shadow-sm">
                {/* Explanation Header */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-purple-200">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg text-purple-900">Simple Explanation</h3>
                </div>

                {/* Loading State */}
                {loadingExplanation ? (
                  <div className="flex items-center gap-3 py-4 justify-center text-purple-600">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm font-medium">Generating explanation...</span>
                  </div>
                ) : (
                  <FormattedExplanation text={explanation} />
                )}
              </div>
            )}
          </div>

          {/* Transaction Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Date</h3>
                <p className="text-gray-900">{formatDate(transaction.date)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-gray-900">{transaction.name}</p>
              </div>

              {transaction.merchant_name && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Merchant</h3>
                  <p className="text-gray-900">{transaction.merchant_name}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Account</h3>
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{account?.name || 'Unknown Account'}</p>
                  <p className="text-sm text-gray-600">
                    {account?.type} • {account?.subtype} • ****{account?.mask}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Transaction ID</h3>
                <p className="text-gray-900 font-mono text-sm break-all">{transaction.transaction_id}</p>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
                {transaction.personal_finance_category ? (
                  <div className="space-y-2">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-blue-900">
                            {formatCategory(transaction.personal_finance_category.primary)}
                          </p>
                          <p className="text-sm text-blue-700 mt-1">
                            {formatCategory(transaction.personal_finance_category.detailed)}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          transaction.personal_finance_category.confidence_level === 'HIGH' 
                            ? 'bg-green-100 text-green-800'
                            : transaction.personal_finance_category.confidence_level === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.personal_finance_category.confidence_level} confidence
                        </span>
                      </div>
                    </div>
                  </div>
                ) : transaction.category && transaction.category.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {transaction.category.map((cat, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                        {cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Uncategorized</p>
                )}
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <p className="text-gray-900">{transaction.pending ? 'Pending' : 'Posted'}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
