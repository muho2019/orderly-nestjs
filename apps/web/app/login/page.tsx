'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; token: string }
  | { status: 'error'; message: string };

export default function LoginPage(): JSX.Element {
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();

    if (!email || !password) {
      setFormState({ status: 'error', message: '이메일과 비밀번호를 입력해주세요.' });
      return;
    }

    if (password.length < 8) {
      setFormState({ status: 'error', message: '비밀번호는 8자 이상이어야 합니다.' });
      return;
    }

    setFormState({ status: 'submitting' });

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response
      .json()
      .catch(() => ({ message: '로그인 중 오류가 발생했습니다.' }));

    if (!response.ok) {
      setFormState({
        status: 'error',
        message: data?.message ?? '로그인에 실패했습니다.'
      });
      return;
    }

    const token = data.accessToken ?? '';
    if (token) {
      localStorage.setItem('orderly_token', token);
    }
    setFormState({ status: 'success', token });
    form.reset();
  }

  const isSubmitting = formState.status === 'submitting';

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">로그인</h2>
        <p className="text-sm text-muted-foreground">
          발급된 계정으로 로그인하여 Orderly의 주문·카탈로그 기능을 체험해 보세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>계정 인증</CardTitle>
              <CardDescription>API Gateway는 로그인 시 Orders/Auth 서비스와 JWT 계약을 검증합니다.</CardDescription>
            </div>
            <Badge variant="secondary">JWT 기반</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                placeholder="비밀번호"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        아직 계정이 없으신가요?{' '}
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          회원가입하러 가기
        </Link>
      </p>

      {formState.status === 'success' && (
        <Alert variant="success" className="flex flex-col gap-2">
          <AlertTitle>로그인 성공</AlertTitle>
          <AlertDescription className="space-y-2 text-sm text-emerald-50">
            <p>프로필을 수정하거나 주문을 진행해 Orderly의 백엔드 플로우를 이어가 보세요.</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Button asChild size="sm" variant="secondary">
                <Link href="/profile">프로필 페이지</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href="/orders">주문 관리</Link>
              </Button>
            </div>
            {formState.token && (
              <details className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-100">
                <summary className="cursor-pointer font-medium">발급된 토큰 보기</summary>
                <code className="mt-2 block break-all">{formState.token}</code>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}

      {formState.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>로그인 실패</AlertTitle>
          <AlertDescription>{formState.message}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
