'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type Profile = {
  id: string;
  email: string;
  name: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; profile: Profile };

type MessageState = { kind: 'success' | 'error'; message: string } | null;

const TOKEN_KEY = 'orderly_token';

export default function ProfilePage(): JSX.Element {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' });
  const [message, setMessage] = useState<MessageState>(null);
  const [isProfileSubmitting, setProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setPasswordSubmitting] = useState(false);

  function getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }

  async function fetchProfile(signal?: AbortSignal): Promise<void> {
    const token = getToken();
    if (!token) {
      setLoadState({ status: 'error', message: '로그인이 필요합니다. 먼저 로그인해주세요.' });
      return;
    }

    setLoadState({ status: 'loading' });
    const response = await fetch('/api/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal
    });

    const data = await response
      .json()
      .catch(() => ({ message: '프로필 정보를 불러오는 중 오류가 발생했습니다.' }));

    if (!response.ok) {
      setLoadState({
        status: 'error',
        message: data?.message ?? '프로필 정보를 불러오지 못했습니다.'
      });
      return;
    }

    setLoadState({ status: 'success', profile: data });
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchProfile(controller.signal).catch(() => {
      setLoadState({ status: 'error', message: '프로필 정보를 불러오지 못했습니다.' });
    });
    return () => controller.abort();
  }, []);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (loadState.status !== 'success') return;

    const token = getToken();
    if (!token) {
      setMessage({ kind: 'error', message: '로그인이 필요합니다.' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();

    setProfileSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    const data = await response
      .json()
      .catch(() => ({ message: '프로필 수정 중 오류가 발생했습니다.' }));

    if (!response.ok) {
      setMessage({ kind: 'error', message: data?.message ?? '프로필 수정에 실패했습니다.' });
      setProfileSubmitting(false);
      return;
    }

    setLoadState({ status: 'success', profile: data });
    setMessage({ kind: 'success', message: '프로필 정보가 수정되었습니다.' });
    setProfileSubmitting(false);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      setMessage({ kind: 'error', message: '로그인이 필요합니다.' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get('currentPassword') ?? '');
    const newPassword = String(formData.get('newPassword') ?? '');

    if (!currentPassword || !newPassword) {
      setMessage({ kind: 'error', message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ kind: 'error', message: '새 비밀번호는 8자 이상이어야 합니다.' });
      return;
    }

    setPasswordSubmitting(true);
    setMessage(null);

    const response = await fetch('/api/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response
      .json()
      .catch(() => ({ message: '비밀번호 변경 중 오류가 발생했습니다.' }));

    setPasswordSubmitting(false);

    if (!response.ok) {
      setMessage({ kind: 'error', message: data?.message ?? '비밀번호 변경에 실패했습니다.' });
      return;
    }

    setMessage({ kind: 'success', message: '비밀번호가 변경되었습니다.' });
    (event.target as HTMLFormElement).reset();
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">내 프로필</h2>
        <p className="text-sm text-slate-300">
          기본 정보를 확인하고 수정하거나 비밀번호를 변경할 수 있습니다.
        </p>
      </div>

      {loadState.status === 'loading' && <p className="text-sm text-slate-400">프로필 정보를 불러오는 중...</p>}

      {loadState.status === 'error' && (
        <div className="rounded-md border border-rose-500 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          <p>{loadState.message}</p>
          <p className="mt-2">
            <Link href="/login" className="text-rose-200 underline-offset-4 hover:underline">
              로그인 화면으로 이동
            </Link>
          </p>
        </div>
      )}

      {loadState.status === 'success' && (
        <>
          <div className="space-y-2 rounded-md border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm">
            <p><span className="text-slate-400">이메일</span>: {loadState.profile.email}</p>
            <p><span className="text-slate-400">이름</span>: {loadState.profile.name ?? '미설정'}</p>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(TOKEN_KEY);
                fetch('/api/logout', { method: 'POST' }).finally(() => {
                  setLoadState({ status: 'error', message: '로그아웃되었습니다. 다시 로그인해주세요.' });
                });
              }}
              className="inline-flex items-center rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
            >
              로그아웃
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <h3 className="text-lg font-medium">프로필 수정</h3>
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-200">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={loadState.profile.name ?? ''}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="표시할 이름"
              />
            </div>
            <button
              type="submit"
              disabled={isProfileSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isProfileSubmitting ? '저장 중...' : '프로필 저장'}
            </button>
          </form>

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <h3 className="text-lg font-medium">비밀번호 변경</h3>
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-200">
                현재 비밀번호
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="현재 비밀번호"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-200">
                새 비밀번호
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                minLength={8}
                required
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="8자 이상 비밀번호"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={isPasswordSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isPasswordSubmitting ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </>
      )}

      {message && (
        <p
          className={`rounded-md border px-4 py-3 text-sm ${
            message.kind === 'success'
              ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200'
              : 'border-rose-500 bg-rose-950/40 text-rose-200'
          }`}
        >
          {message.message}
        </p>
      )}
    </section>
  );
}
