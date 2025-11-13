'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

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
        <h2 className="text-3xl font-semibold">내 프로필</h2>
        <p className="text-sm text-muted-foreground">
          기본 정보를 확인하고 수정하거나 비밀번호를 변경할 수 있습니다.
        </p>
      </div>

      {loadState.status === 'loading' && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {loadState.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>프로필 정보를 불러오지 못했습니다.</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{loadState.message}</p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/login">로그인 화면으로 이동</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loadState.status === 'success' && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>계정 요약</CardTitle>
                <CardDescription>
                  JWT 토큰은 브라우저 Local Storage에 저장되며, 로그인 시점 기준으로 표시됩니다.
                </CardDescription>
              </div>
              <Badge variant="secondary">User</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <span className="text-muted-foreground">이메일</span>
                <span className="font-medium text-foreground">{loadState.profile.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <span className="text-muted-foreground">이름</span>
                <span className="font-medium text-foreground">{loadState.profile.name ?? '미설정'}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(TOKEN_KEY);
                  fetch('/api/logout', { method: 'POST' }).finally(() => {
                    setLoadState({ status: 'error', message: '로그아웃되었습니다. 다시 로그인해주세요.' });
                  });
                }}
              >
                로그아웃
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>프로필 정보 수정</CardTitle>
              <CardDescription>이름 필드만 수정 가능합니다. 수정 시 Auth 서비스에 즉시 반영됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleProfileSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input id="name" name="name" defaultValue={loadState.profile.name ?? ''} placeholder="홍길동" />
                </div>
                <Button type="submit" disabled={isProfileSubmitting} className="w-full">
                  {isProfileSubmitting ? '저장 중...' : '프로필 저장'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>현재 비밀번호를 검증한 뒤 새 비밀번호로 교체합니다. 최소 8자 이상 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">현재 비밀번호</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    placeholder="현재 비밀번호"
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    minLength={8}
                    required
                    placeholder="8자 이상 새 비밀번호"
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" disabled={isPasswordSubmitting} className="w-full">
                  {isPasswordSubmitting ? '변경 중...' : '비밀번호 변경'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      {message && (
        <Alert variant={message.kind === 'success' ? 'success' : 'destructive'}>
          <AlertTitle>{message.kind === 'success' ? '완료' : '오류'}</AlertTitle>
          <AlertDescription>{message.message}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
