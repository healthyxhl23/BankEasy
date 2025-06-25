// app/home/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/signin');
      return;
    }

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Check profile status
    checkProfile();
  }, [session, status, router]);

  const checkProfile = async () => {
    try {
      const res = await fetch('/api/user/check-profile');
      const data = await res.json();
      
      console.log('Profile check response:', data); // Debug log
      
      if (data.newUser || !data.onboarded) {
        // Only redirect to onboarding if it's a new user
        if (data.newUser) {
          router.push('/onboarding');
          return;
        }
        // Otherwise just set the onboarded status
        setIsOnboarded(false);
      } else {
        setIsOnboarded(data.onboarded);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error checking profile:', error);
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const features = [
    {
      title: 'View Transactions',
      description: 'See all your bank transactions in one place',
      icon: '💳',
      href: '/transactions',
      available: isOnboarded,
    },
    {
      title: 'Balance Forecast',
      description: 'Predict your future balance based on spending patterns',
      icon: '📊',
      href: '/forecast',
      available: isOnboarded, // Fixed: was session.user.onboarded
    },
    {
      title: 'Voice Assistant',
      description: 'Ask questions about your finances using voice',
      icon: '🎤',
      href: '/assistant',
      available: true,
    },
    {
      title: 'Profile Settings',
      description: 'Manage your account and preferences',
      icon: '⚙️',
      href: '/settings',
      available: true,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {greeting}, {session.user.name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-gray-600">
          {isOnboarded 
            ? "Here's your financial overview"
            : "Complete your setup to access all features"}
        </p>
      </div>

      {/* Alert for non-onboarded users */}
      {!isOnboarded && (
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-800">Complete Your Setup</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Connect your bank account to unlock transaction tracking and balance forecasting.
              </p>
              <Link href="/onboarding">
                <button className="mt-2 text-sm bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">
                  Complete Setup
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats (only for onboarded users) */}
      {isOnboarded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current Balance</h3>
            <p className="text-2xl font-bold text-green-600">$5,432.00</p>
            <p className="text-sm text-gray-500 mt-1">↑ 2.3% from last month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Spending</h3>
            <p className="text-2xl font-bold text-blue-600">$1,234.00</p>
            <p className="text-sm text-gray-500 mt-1">23 transactions</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Savings Goal</h3>
            <p className="text-2xl font-bold text-purple-600">68%</p>
            <p className="text-sm text-gray-500 mt-1">$3,400 of $5,000</p>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.available ? feature.href : '#'}
            className={feature.available ? '' : 'cursor-not-allowed'}
          >
            <div
              className={`bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow
                ${!feature.available ? 'opacity-50' : 'hover:translate-y-[-2px]'}`}
            >
              <div className="flex items-start">
                <span className="text-3xl mr-4">{feature.icon}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                    {!feature.available && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        Requires bank connection
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>


    </div>
  );
}