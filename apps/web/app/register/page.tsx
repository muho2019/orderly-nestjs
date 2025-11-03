'use client';

import { FormEvent, useState } from 'react';

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export default function RegisterPage(): JSX.Element {
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      name: formData.get('name') ? String(formData.get('name')) : undefined
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
      event.currentTarget.reset();
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
        <h2 className="text-2xl font-semibold">회원 등록</h2>
        <p className="text-sm text-slate-300">
          주문 서비스를 이용하려면 이메일과 비밀번호를 입력하여 계정을 생성하세요.
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
            placeholder="8자 이상 비밀번호"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-slate-200">
            이름 (선택)
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="홍길동"
            autoComplete="name"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isSubmitting ? '등록 중...' : '회원가입'}
        </button>
      </form>

      {formState.status === 'success' && (
        <p className="rounded-md border border-emerald-500 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          {formState.message}
        </p>
      )}

      {formState.status === 'error' && (
        <p className="rounded-md border border-rose-500 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {formState.message}
        </p>
      )}
    </section>
  );
}
