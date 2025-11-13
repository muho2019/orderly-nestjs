import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ThemeProvider } from '@/components/theme-provider';

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
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider enableSystem attribute="class" defaultTheme="dark">
          <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-4 py-10 sm:px-8 lg:px-10">
            <header className="space-y-4 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">Orderly Portal</p>
                <h1 className="text-3xl font-semibold text-foreground">Orderly</h1>
                <p className="text-sm text-muted-foreground">Nest.js MSA 학습용 포트폴리오 웹</p>
              </div>
              <nav className="flex flex-wrap gap-2 text-sm">
                <Link
                  href="/"
                  className="rounded-lg border border-border px-3 py-1.5 text-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                  홈
                </Link>
                <Link
                  href="/orders"
                  className="rounded-lg border border-border px-3 py-1.5 text-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                  주문
                </Link>
                <Link
                  href="/profile"
                  className="rounded-lg border border-border px-3 py-1.5 text-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                  프로필
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-border px-3 py-1.5 text-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                  로그인
                </Link>
              </nav>
            </header>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
