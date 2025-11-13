'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
      <Card>
        <CardHeader>
          <CardTitle>로그아웃 처리 중</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>세션을 종료하고 로그인 페이지로 이동합니다. 잠시만 기다려 주세요.</p>
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    </section>
  );
}
