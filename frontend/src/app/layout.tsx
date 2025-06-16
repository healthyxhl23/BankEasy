// app/layout.tsx
import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";

export const metadata = { title: "BankEasy" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <nav className="bg-white shadow p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-green-600">BankEasy</h1>
            <ul className="flex space-x-4">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/signin">Sign In</Link></li>
            </ul>
          </nav>
          <main className="p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
