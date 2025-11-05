import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Orderly Portal',
  description: 'Orderly portfolio front-end',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-12">
          <header className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold">Orderly</h1>
              <p className="text-sm text-slate-400">Nest.js MSA 학습용 포트폴리오 웹</p>
            </div>
            <nav className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/"
                className="rounded-md border border-slate-800 px-3 py-1 text-slate-300 transition hover:border-emerald-500 hover:text-emerald-200"
              >
                홈
              </Link>
              <Link
                href="/orders"
                className="rounded-md border border-slate-800 px-3 py-1 text-slate-300 transition hover:border-emerald-500 hover:text-emerald-200"
              >
                주문
              </Link>
              <Link
                href="/profile"
                className="rounded-md border border-slate-800 px-3 py-1 text-slate-300 transition hover:border-emerald-500 hover:text-emerald-200"
              >
                프로필
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-slate-800 px-3 py-1 text-slate-300 transition hover:border-emerald-500 hover:text-emerald-200"
              >
                로그인
              </Link>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
