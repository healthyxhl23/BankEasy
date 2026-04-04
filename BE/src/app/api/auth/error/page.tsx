// app/auth/error/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        
        <p className="text-gray-600 mb-6">
          {error === 'Configuration' && 'There is a problem with the server configuration.'}
          {error === 'AccessDenied' && 'You do not have permission to sign in.'}
          {error === 'Verification' && 'The verification token has expired or has already been used.'}
          {!error && 'An unknown error occurred during authentication.'}
        </p>

        <div className="space-y-3">
          <Link href="/signin" className="block">
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
              Try Again
            </button>
          </Link>
          
          <Link href="/" className="block">
            <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded">
              Go Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}