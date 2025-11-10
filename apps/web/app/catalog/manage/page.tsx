'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type Money = {
  amount: number;
  currency: string;
};

type Product = {
  id: string;
  name: string;
  description?: string;
  price: Money;
  status: string;
  sku?: string;
  thumbnailUrl?: string;
  updatedAt?: string;
};

type ProductsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: Product[] };

type ActionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };

const TOKEN_KEY = 'orderly_token';
const STATUS_OPTIONS = ['DRAFT', 'ACTIVE', 'INACTIVE', 'DISCONTINUED'] as const;
const STATUS_LABELS: Record<string, string> = {
  DRAFT: '초안',
  ACTIVE: '판매중',
  INACTIVE: '일시중지',
  DISCONTINUED: '판매종료'
};

const moneyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW'
});

function ensureToken(): string {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    throw new Error('관리자 권한으로 로그인한 뒤 다시 시도해주세요.');
  }
  return token;
}

function toDisplayPrice(money: Money): string {
  return money.currency === 'KRW'
    ? moneyFormatter.format(money.amount)
    : `${money.amount} ${money.currency}`;
}

const initialCreateForm = {
  name: '',
  description: '',
  priceAmount: '',
  priceCurrency: 'KRW',
  sku: '',
  thumbnailUrl: ''
};

export default function CatalogManagePage(): JSX.Element {
  const [productsState, setProductsState] = useState<ProductsState>({ status: 'loading' });
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createState, setCreateState] = useState<ActionState>({ status: 'idle' });
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(initialCreateForm);
  const [editState, setEditState] = useState<ActionState>({ status: 'idle' });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusSelection, setStatusSelection] = useState<Record<string, string>>({});

  const loadProducts = useCallback(async () => {
    setProductsState({ status: 'loading' });
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/catalog/products', {
        headers,
        cache: 'no-store'
      });

      const data = await response
        .json()
        .catch(() => ({ message: '상품 목록을 불러오지 못했습니다.' }));

      if (!response.ok) {
        throw new Error(data?.message ?? '상품 목록을 가져올 수 없습니다.');
      }

      if (!Array.isArray(data)) {
        throw new Error('상품 데이터 형식이 올바르지 않습니다.');
      }

      const normalized = data as Product[];
      setProductsState({ status: 'success', items: normalized });
      setStatusSelection(
        Object.fromEntries(normalized.map((product) => [product.id, product.status]))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '상품 목록을 불러오지 못했습니다.';
      setProductsState({ status: 'error', message });
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function updateCreateForm(field: string, value: string): void {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  function updateEditForm(field: string, value: string): void {
    setEditForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      const token = ensureToken();
      const amount = Number(createForm.priceAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        setCreateState({
          status: 'error',
          message: '가격은 0보다 큰 숫자여야 합니다.'
        });
        return;
      }

      setCreateState({ status: 'submitting' });
      const response = await fetch('/api/catalog/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          price: {
            amount: Math.round(amount),
            currency: createForm.priceCurrency.trim().toUpperCase()
          },
          sku: createForm.sku.trim() || undefined,
          thumbnailUrl: createForm.thumbnailUrl.trim() || undefined
        })
      });

      const data = await response
        .json()
        .catch(() => ({ message: '상품을 등록하지 못했습니다.' }));

      if (!response.ok) {
        throw new Error(data?.message ?? '상품 등록에 실패했습니다.');
      }

      setCreateState({
        status: 'success',
        message: '새 상품이 등록되었습니다.'
      });
      setCreateForm(initialCreateForm);
      await loadProducts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '상품 등록 중 오류가 발생했습니다.';
      setCreateState({ status: 'error', message });
    }
  }

  function startEdit(product: Product): void {
    setEditTarget(product);
    setEditForm({
      name: product.name,
      description: product.description ?? '',
      priceAmount: product.price.amount.toString(),
      priceCurrency: product.price.currency,
      sku: product.sku ?? '',
      thumbnailUrl: product.thumbnailUrl ?? ''
    });
    setEditState({ status: 'idle' });
  }

  function computeEditPayload(): Record<string, unknown> | null {
    if (!editTarget) return null;
    const payload: Record<string, unknown> = {};

    if (editForm.name.trim() !== editTarget.name) {
      payload.name = editForm.name.trim();
    }

    const normalizedDescription = editForm.description.trim();
    if ((normalizedDescription || undefined) !== (editTarget.description ?? undefined)) {
      payload.description = normalizedDescription;
    }

    const amount = Number(editForm.priceAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('가격은 0보다 큰 숫자여야 합니다.');
    }

    if (
      amount !== editTarget.price.amount ||
      editForm.priceCurrency.trim().toUpperCase() !== editTarget.price.currency
    ) {
      payload.price = {
        amount: Math.round(amount),
        currency: editForm.priceCurrency.trim().toUpperCase()
      };
    }

    if ((editForm.sku.trim() || undefined) !== (editTarget.sku ?? undefined)) {
      payload.sku = editForm.sku.trim();
    }

    if (
      (editForm.thumbnailUrl.trim() || undefined) !==
      (editTarget.thumbnailUrl ?? undefined)
    ) {
      payload.thumbnailUrl = editForm.thumbnailUrl.trim();
    }

    if (Object.keys(payload).length === 0) {
      return null;
    }

    return payload;
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!editTarget) {
      setEditState({ status: 'error', message: '수정할 상품을 먼저 선택해주세요.' });
      return;
    }

    let payload: Record<string, unknown> | null = null;
    try {
      payload = computeEditPayload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '상품 정보를 검증하지 못했습니다.';
      setEditState({ status: 'error', message });
      return;
    }

    if (!payload) {
      setEditState({
        status: 'error',
        message: '변경된 내용이 없습니다.'
      });
      return;
    }

    try {
      const token = ensureToken();
      setEditState({ status: 'submitting' });
      const response = await fetch(`/api/catalog/products/${editTarget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response
        .json()
        .catch(() => ({ message: '상품을 수정하지 못했습니다.' }));

      if (!response.ok) {
        throw new Error(data?.message ?? '상품 수정에 실패했습니다.');
      }

      setEditState({
        status: 'success',
        message: '상품 정보가 업데이트되었습니다.'
      });
      await loadProducts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '상품 수정 중 오류가 발생했습니다.';
      setEditState({ status: 'error', message });
    }
  }

  async function updateStatus(productId: string): Promise<void> {
    try {
      setStatusMessage(null);
      const token = ensureToken();
      const status = statusSelection[productId];
      const response = await fetch(`/api/catalog/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status
        })
      });

      const data = await response
        .json()
        .catch(() => ({ message: '상품 상태를 변경하지 못했습니다.' }));

      if (!response.ok) {
        throw new Error(data?.message ?? '상태 변경에 실패했습니다.');
      }

      setStatusMessage('상품 상태가 업데이트되었습니다.');
      await loadProducts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '상품 상태 변경 중 오류가 발생했습니다.';
      setStatusMessage(message);
    }
  }

  const latestUpdateInfo = useMemo(() => {
    if (productsState.status !== 'success') {
      return null;
    }

    const mostRecentProduct = [...productsState.items].sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTime - aTime;
    })[0];

    if (!mostRecentProduct?.updatedAt) {
      return null;
    }

    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(mostRecentProduct.updatedAt));
  }, [productsState]);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">상품 관리</h1>
        <p className="text-sm text-slate-300">
          관리자 전용 페이지입니다. API Gateway 인증 토큰을 입력한 뒤 상품을 등록·수정하거나 상태를 전환하세요.
        </p>
        <p className="text-xs text-slate-400">
          서버는 catalog-service와 통신할 때 공유된 X-Admin-Token을 전달합니다. (추후 Role 기반 권한으로 전환 예정)
        </p>
      </header>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-xl font-semibold text-emerald-300">새 상품 등록</h2>
        <form className="mt-4 space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">상품명</span>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(event) => updateCreateForm('name', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">SKU</span>
              <input
                type="text"
                value={createForm.sku}
                onChange={(event) => updateCreateForm('sku', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-200">설명</span>
            <textarea
              value={createForm.description}
              onChange={(event) => updateCreateForm('description', event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">가격 (KRW 기준 원 단위)</span>
              <input
                type="number"
                min="1"
                required
                value={createForm.priceAmount}
                onChange={(event) => updateCreateForm('priceAmount', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">통화</span>
              <input
                type="text"
                required
                value={createForm.priceCurrency}
                onChange={(event) => updateCreateForm('priceCurrency', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm uppercase focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-1">
              <span className="font-medium text-slate-200">썸네일 URL</span>
              <input
                type="url"
                value={createForm.thumbnailUrl}
                onChange={(event) => updateCreateForm('thumbnailUrl', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={createState.status === 'submitting'}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            {createState.status === 'submitting' ? '등록 중...' : '상품 등록'}
          </button>
        </form>
        {createState.status === 'error' && (
          <p className="mt-3 rounded-md border border-rose-500 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {createState.message}
          </p>
        )}
        {createState.status === 'success' && (
          <p className="mt-3 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
            {createState.message ?? '상품이 등록되었습니다.'}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">상품 목록</h2>
            {latestUpdateInfo && (
              <p className="text-xs text-slate-400">최근 수정: {latestUpdateInfo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              void loadProducts();
            }}
            className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-100 hover:border-emerald-500"
          >
            새로고침
          </button>
        </div>

        {productsState.status === 'loading' && (
          <p className="text-sm text-slate-300">상품 목록을 불러오는 중입니다...</p>
        )}

        {productsState.status === 'error' && (
          <p className="rounded-md border border-rose-500 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {productsState.message}
          </p>
        )}

        {productsState.status === 'success' && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">상품명</th>
                  <th className="px-4 py-3">가격</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                {productsState.items.map((product) => (
                  <tr key={product.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-100">{product.name}</p>
                      {product.description && (
                        <p className="mt-1 text-xs text-slate-400">{product.description}</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-500">
                        SKU: {product.sku ?? '미지정'} · ID: {product.id}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-100">{toDisplayPrice(product.price)}</td>
                    <td className="px-4 py-4 text-slate-100">
                      <div className="space-y-2">
                        <select
                          value={statusSelection[product.id] ?? product.status}
                          onChange={(event) =>
                            setStatusSelection((prev) => ({
                              ...prev,
                              [product.id]: event.target.value
                            }))
                          }
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option value={status} key={status}>
                              {STATUS_LABELS[status] ?? status}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            void updateStatus(product.id);
                          }}
                          className="w-full rounded-md border border-emerald-500 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/10"
                        >
                          상태 저장
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-100">
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-100 hover:border-emerald-500"
                      >
                        수정 폼에 불러오기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {statusMessage && (
          <p className="text-sm text-slate-300">{statusMessage}</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-xl font-semibold text-emerald-300">상품 정보 수정</h2>
        {editTarget ? (
          <p className="text-xs text-slate-400">
            현재 선택된 상품: <span className="font-semibold">{editTarget.name}</span> (
            {editTarget.id})
          </p>
        ) : (
          <p className="text-xs text-slate-400">목록에서 수정할 상품을 먼저 선택하세요.</p>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleEditSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">상품명</span>
              <input
                type="text"
                value={editForm.name}
                onChange={(event) => updateEditForm('name', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">SKU</span>
              <input
                type="text"
                value={editForm.sku}
                onChange={(event) => updateEditForm('sku', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-200">설명</span>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(event) => updateEditForm('description', event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">가격 (원 단위)</span>
              <input
                type="number"
                min="1"
                value={editForm.priceAmount}
                onChange={(event) => updateEditForm('priceAmount', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">통화</span>
              <input
                type="text"
                value={editForm.priceCurrency}
                onChange={(event) => updateEditForm('priceCurrency', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm uppercase focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-200">썸네일 URL</span>
              <input
                type="url"
                value={editForm.thumbnailUrl}
                onChange={(event) => updateEditForm('thumbnailUrl', event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={editState.status === 'submitting'}
            className="rounded-md border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:text-slate-500"
          >
            {editState.status === 'submitting' ? '수정 중...' : '상품 정보 수정'}
          </button>
        </form>

        {editState.status === 'error' && (
          <p className="mt-3 rounded-md border border-rose-500 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {editState.message}
          </p>
        )}
        {editState.status === 'success' && (
          <p className="mt-3 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
            {editState.message ?? '상품 정보가 수정되었습니다.'}
          </p>
        )}
      </section>
    </div>
  );
}
