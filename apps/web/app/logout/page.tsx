'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const TOKEN_KEY = 'orderly_token';

export default function LogoutPage(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    async function logout(): Promise<void> {
      localStorage.removeItem(TOKEN_KEY);
      await fetch('/api/logout', { method: 'POST' }).catch(() => undefined);
      router.replace('/login');
    }

    logout().catch(() => {
      router.replace('/login');
    });
  }, [router]);

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">로그아웃</h2>
      <p className="text-sm text-slate-300">로그아웃 처리 중입니다...</p>
    </section>
  );
}
