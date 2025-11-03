import './globals.css';
import type { Metadata } from 'next';

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
        <main className="mx-auto flex w-full max-w-xl flex-col gap-10 px-6 py-12">
          <header>
            <h1 className="text-3xl font-semibold">Orderly</h1>
            <p className="text-sm text-slate-400">Nest.js MSA 학습용 포트폴리오 웹</p>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
