'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useRouter } from 'next/navigation';

/**
 * Home – one‑button Plaid Link demo with token exchange
 */
export default function Plaid() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /**
   * Fetch a link_token from our Next.js route.
   * Returns true on success, false on any error.
   */
  const fetchLinkToken = useCallback(async () => {
    const res = await fetch('/api/create-link-token');
    if (!res.ok) {
      console.error('Link‑token fetch failed', await res.text());
      return false;
    }
    const { link_token } = await res.json();
    setLinkToken(link_token);
    return true;
  }, []);

  /**
   * Exchange public token for access token
   */
  const exchangeToken = useCallback(async (publicToken: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_token: publicToken }),
      });

      if (!res.ok) {
        throw new Error('Failed to exchange token');
      }

      const { access_token } = await res.json();
      
      // Store access token in localStorage (in production, use secure storage)
      localStorage.setItem('plaid_access_token', access_token);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error exchanging token:', error);
      alert('Failed to connect account. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Initialize the Plaid hook. It stays "idle" until
   * we supply a non‑empty token and call open().
   */
  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: (public_token) => {
      console.log('public_token', public_token);
      exchangeToken(public_token);
    },
  });

  /**
   * Automatically open Plaid Link the moment BOTH
   * a linkToken is present and the SDK signals ready.
   */
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  /** Trigger token fetch on first click */
  const handleClick = () => {
    if (!linkToken) void fetchLinkToken();
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Connect Your Bank Account
        </h1>
        <button
          onClick={handleClick}
          disabled={!!linkToken || loading}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors
                     hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Connecting...
            </>
          ) : (
            'Sign in with Plaid'
          )}
        </button>
      </div>
    </main>
  );
}