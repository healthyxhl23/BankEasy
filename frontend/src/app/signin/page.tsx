'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignInPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect to home if already signed in
  useEffect(() => {
    if (session) router.replace('/');
  }, [session, router]);

  return (
    <div className="flex flex-col items-center justify-center h-[80vh] space-y-6">
      <h2 className="text-3xl font-semibold">Sign In</h2>

      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg shadow-md"
      >
        <img
          src="/google-icon.svg"
          alt="Google logo"
          className="w-5 h-5"
        />
        <span>Sign in with Google</span>
      </button>
    </div>
  );
}
