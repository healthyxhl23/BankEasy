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

  const [accounts, setAccounts] = useState([{name: "Checking", balance: {current: 1200.45}}]);
  const [transactions, setTransactions] = useState([{name: "Starbucks", amount: 5.75, date: "2025-06-22"},
    {name: "Amazon", amount: 29.99, date: "2025-05-31"}
  ]);

  return(
    <main className='p-6 max-w-4xl mx-auto space-y-6'>
      <h1 className="text-3xl font-bold text-center">Welcome back!</h1>

      {/*Accounts Summary*/}
      <section className=" bg-green-500 shadow p-4 rounded-xl">
        <h2 className="text-xl font-semibold mb-2">
          Accounts Summary
        </h2>
        {accounts.map((acct, i) => (
          <p key={i}>
            {acct.name}: $(acct.balance.current)
          </p>
        )
        )}
      </section>

      {/*Recent Transactions*/}
      <section className="bg-white shadow p-4 rounded-xl ">
        <h2 className="text-xl font-semibold mb-2">
          Recent Transactions
        </h2>
        <ul className="space-y-2">
          {transactions.map((tran, i) => (
            <li key={i}>
              <strong>${tran.amount}</strong> - {tran.name} {(tran.date)}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}