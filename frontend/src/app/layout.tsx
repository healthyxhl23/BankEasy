import "./globals.css";
import { Providers } from "./providers";
import Link from "next/link";
import { AuthButton } from "./components/AuthButton";

export const metadata = { title: "BankEasy" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <nav className="bg-white shadow p-4 flex justify-between items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-green-600 cursor-pointer">BankEasy</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/home" className="text-gray-600 hover:text-gray-800">
                Home
              </Link>
              <AuthButton />
            </div>
          </nav>
          <main className="p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}