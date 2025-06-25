'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AuthButton() {
  const { data: session, status } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Set loading state
      setIsSigningOut(true);
      // Close dropdown
      setShowDropdown(false);
      
      // Use NextAuth signOut
      await signOut({ 
        redirect: false 
      });
      
      // Clear all cookies manually
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Clear storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Force a hard refresh to clear any cached state
      window.location.href = '/';
      
    } catch (error) {
      console.error('Error signing out:', error);
      // Force redirect even if there's an error
      window.location.href = '/';
    }
  };

  if (status === 'loading') {
    return (
      <div className="w-20 h-8 bg-gray-200 animate-pulse rounded"></div>
    );
  }

  if (session) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isSigningOut}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none disabled:opacity-50"
        >
          {session.user?.image && (
            <img
              src={session.user.image}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm font-medium">
            {session.user?.name || session.user?.email || 'User'}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            ></div>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
              <Link href="/settings">
                <div className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                  Settings
                </div>
              </Link>
              <hr className="my-1" />
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Link href="/signin">
      <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">
        Sign In
      </button>
    </Link>
  );
}