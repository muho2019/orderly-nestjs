'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export default function RegisterPage(): JSX.Element {
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();
    const nameRaw = formData.get('name');
    const name = typeof nameRaw === 'string' ? nameRaw.trim() : undefined;

    if (!email || !password) {
      setFormState({ status: 'error', message: '이메일과 비밀번호를 입력해주세요.' });
      return;
    }

    if (password.length < 8) {
      setFormState({ status: 'error', message: '비밀번호는 8자 이상이어야 합니다.' });
      return;
    }

    const payload = {
      email,
      password,
      name: name ? name : undefined
    };

    setFormState({ status: 'submitting' });

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      setFormState({ status: 'success', message: `${data.email ?? payload.email}님, 가입이 완료되었습니다.` });
      form.reset();
      return;
    }

    const problem = await response
      .json()
      .catch(() => ({ message: '회원 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' }));
    setFormState({
      status: 'error',
      message: problem?.message ?? '회원 등록 중 오류가 발생했습니다.'
    });
  }

  const isSubmitting = formState.status === 'submitting';

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold">회원 등록</h2>
        <p className="text-sm text-muted-foreground">
          주문·결제 서비스를 이용하려면 이메일과 비밀번호를 설정해 계정을 생성하세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>계정 정보 입력</CardTitle>
          <CardDescription>입력된 정보는 Auth 서비스에서 즉시 검증 후 저장됩니다.</CardDescription>
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
                placeholder="8자 이상 비밀번호"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름 (선택)</Label>
              <Input id="name" name="name" type="text" placeholder="홍길동" autoComplete="name" />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? '등록 중...' : '회원가입'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          로그인하러 가기
        </Link>
      </p>

      {formState.status === 'success' && (
        <Alert variant="success">
          <AlertTitle>회원 등록 완료</AlertTitle>
          <AlertDescription>{formState.message}</AlertDescription>
        </Alert>
      )}

      {formState.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>회원 등록 실패</AlertTitle>
          <AlertDescription>{formState.message}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
