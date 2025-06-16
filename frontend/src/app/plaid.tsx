'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';

/**
 * Home – one‑button Plaid Link demo
 */
export default function Plaid() {
  const [linkToken, setLinkToken] = useState<string | null>(null);

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
   * Initialize the Plaid hook. It stays “idle” until
   * we supply a non‑empty token and call open().
   */
  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: (public_token) => {
      console.log('public_token', public_token);
      // TODO: POST to /api/exchange-public-token
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
      <button
        onClick={handleClick}
        disabled={!!linkToken}
        className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors
                   hover:bg-blue-700 disabled:opacity-50"
      >
        Sign in with&nbsp;Plaid
      </button>
    </main>
  );
}
