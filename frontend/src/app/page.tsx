// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <h2 className="text-5xl font-bold text-green-600 mb-4">Welcome to BankEasy</h2>
      <p className="text-lg text-gray-700 mb-8">
        Your simple, secure way to manage your finances.
      </p>
      <Link href="/signin">
        <button className="bg-green-500 hover:bg-green-600 text-white py-2 px-6 rounded-lg shadow">
          Sign In
        </button>
      </Link>
    </div>
  );
}
