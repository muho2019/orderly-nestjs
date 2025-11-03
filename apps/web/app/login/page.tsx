'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

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

    setFormState({ status: 'success', token: data.accessToken ?? '' });
    form.reset();
  }

  const isSubmitting = formState.status === 'submitting';

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">로그인</h2>
        <p className="text-sm text-slate-300">
          발급된 계정으로 로그인하여 Orderly 서비스를 체험해 보세요.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-200">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-200">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="비밀번호"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {formState.status === 'success' && (
        <div className="space-y-2 rounded-md border border-emerald-500 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          <p>로그인 성공! 발급된 토큰:</p>
          <code className="block break-all text-xs text-emerald-100">{formState.token}</code>
        </div>
      )}

      {formState.status === 'error' && (
        <p className="rounded-md border border-rose-500 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {formState.message}
        </p>
      )}

      <p className="text-sm text-slate-400">
        아직 계정이 없으신가요?{' '}
        <Link href="/register" className="text-emerald-400 underline-offset-4 hover:underline">
          회원가입하러 가기
        </Link>
      </p>
    </section>
  );
}
