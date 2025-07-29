// app/page.tsx
'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MainPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Update isLoggedIn state based on session
  useEffect(() => {
    setIsLoggedIn(!!session);
  }, [session]);

  // Redirect to home if logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/home');
    }
  }, [isLoggedIn, router]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // If logged in but not redirected yet, show loading
  if (isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="mt-4 text-gray-600">Redirecting to home...</p>
      </div>
    );
  }

  // Show the welcome page if not logged in
  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h2 className="text-5xl font-bold text-green-600 mb-4">Welcome to BankEasy</h2>
      <p className="text-lg text-gray-700 mb-8">
        Your simple, secure way to manage your finances.
      </p>
      <Link href="/signin">
        <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg shadow transition-colors">
          Sign In
        </button>
      </Link>
    </div>
  );
}