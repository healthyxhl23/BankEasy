'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  //Get current user session and status (loading, authenticated, unauthenticated)
  const { data: session, status } = useSession();
  //Router for client-side navigation
  const router = useRouter();

  //Redirect to /signin if user is NOT authenticated
  useEffect(() => {
    if(status == "unauthenticated"){
      router.push('/');
    }
  }, [status]);

  const [accounts, setAccounts] = useState([{name: "Checking", balance: {current: 1787.76}}]);
  const [transactions, setTransactions] = useState([{name: "Starbucks's 84127 432-324-212 Ca", amount: 5.75, date: "2025-06-22", translation: "$5.75 spent at Starbucks coffee shop in California on June 22, 2025."},
    {name: "Amazon", amount: 29.99, date: "2025-05-31", translation: "$29.99 purchase from Amazon on May 31, 2025"},
    {name: "US TREASURY 310 XXSOC SEC", amount: 1823.50, date: "2025-05-01", translation: "$1,823.50 Social Security income deposited from the U.S. Treasury on May 1, 2025" }
  ]);

  return(
    <main className='bg-gray-50 p-6 max-w-4xl mx-auto space-y-6'>
      <h1 className="text-3xl font-bold text-center">Welcome back!</h1>

      {/*Accounts Summary*/}
      <section className= "bg-white shadow p-4 rounded-xl">
        <h2 className="text-xl font-semibold mb-2">
          Accounts Summary
        </h2>
        {accounts.map((acct, i) => (
          <div key={i} className="flex justify-between">
            <span>{acct.name}</span>
            <span>${acct.balance.current}</span>
          </div>
        )
        )}
      </section>

      {/*Low Balance Forecast Alert*/}
      <section className="bg-orange-100 border-l-4 p-4 border-orange-600 rounded-md shadow-md max-w-4xl mx-auto">
        <h2 className="font-semibold text-orange-700 mb-1">Low Balance Forecast Alert</h2>
        <p className="text-black">
          Your <strong>Checking Account</strong> balance is predicted to fall below <strong>$100</strong> in <strong>3 days</strong>. Please review your upcoming expenses.
        </p>
      </section>

      {/*Recent Transactions*/}
      <section className="bg-white shadow p-4 rounded-xl ">
        <h2 className="text-xl font-semibold mb-2">
          Recent Transactions
        </h2>
        <ul className="space-y-2">
          {transactions.map((tran, i) => (
          <li key={i} className="flex justify-between items-center border-b border-gray-200 pb-3 mb-3">
            <div className="flex flex-col">
              <p className="font-medium">{tran.name}</p>
              <p className="text-sm text-gray-600">{tran.date}</p>
              <p className="text-sm italic text-gray-500 mt-1">→ {tran.translation}</p>
            </div>
            <div className="font-medium">${tran.amount}</div>
          </li>
          ))}
        </ul>
      </section>
    </main>
  )
}