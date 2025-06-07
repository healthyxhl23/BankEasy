import './globals.css';   // remove this line if you ditched Tailwind

export const metadata = {
  title: 'BankEasy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
