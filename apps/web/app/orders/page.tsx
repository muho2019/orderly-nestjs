'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Money = {
  amount: number;
  currency: string;
};

type Product = {
  id: string;
  name: string;
  price: Money;
};

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; products: Product[] };

type OrderState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; orderId: string }
  | { status: 'error'; message: string };

function toDisplayAmount(money: Money): number {
  const fractionDigits = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: money.currency
  }).resolvedOptions().maximumFractionDigits ?? 0;

  const divisor = Math.pow(10, fractionDigits);
  return money.amount / divisor;
}

function formatMoney(money: Money): string {
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: money.currency
  });

  return formatter.format(toDisplayAmount(money));
}

export default function OrdersPage(): JSX.Element {
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [orderState, setOrderState] = useState<OrderState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    async function loadProducts(): Promise<void> {
      setFetchState({ status: 'loading' });
      try {
        const response = await fetch('/api/products', { cache: 'no-store' });
        const data = await response
          .json()
          .catch(() => ({ message: '상품 정보를 불러오지 못했습니다.' }));

        if (!response.ok) {
          throw new Error(data?.message ?? '상품 목록을 가져올 수 없습니다.');
        }

        if (!Array.isArray(data)) {
          throw new Error('상품 데이터 형식이 올바르지 않습니다.');
        }

        if (cancelled) return;

        setFetchState({ status: 'success', products: data as Product[] });
        setQuantities(
          Object.fromEntries((data as Product[]).map((product) => [product.id, 0]))
        );
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : '상품 목록을 불러오지 못했습니다.';
        setFetchState({ status: 'error', message });
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedItems = useMemo(() => {
    if (fetchState.status !== 'success') {
      return [];
    }

    return fetchState.products
      .map((product) => ({
        product,
        quantity: quantities[product.id] ?? 0
      }))
      .filter((item) => item.quantity > 0);
  }, [fetchState, quantities]);

  const total = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      return acc + item.product.price.amount * item.quantity;
    }, 0);
  }, [selectedItems]);

  const totalMoney: Money | null =
    fetchState.status === 'success' && selectedItems.length > 0
      ? {
          amount: total,
          currency: selectedItems[0]?.product.price.currency ?? 'KRW'
        }
      : null;

  function setQuantity(productId: string, value: number): void {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, Math.min(99, Math.floor(value)))
    }));
  }

  async function handleSubmit(): Promise<void> {
    if (fetchState.status !== 'success') {
      return;
    }

    if (selectedItems.length === 0) {
      setOrderState({ status: 'error', message: '주문할 상품을 선택해주세요.' });
      return;
    }

    const token = localStorage.getItem('orderly_token');
    if (!token) {
      setOrderState({
        status: 'error',
        message: '주문을 진행하려면 먼저 로그인해야 합니다.'
      });
      return;
    }

    setOrderState({ status: 'submitting' });

    const payload = {
      items: selectedItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price
      })),
      note: note.trim() ? note.trim() : undefined
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response
        .json()
        .catch(() => ({ message: '주문 생성에 실패했습니다.' }));

      if (!response.ok) {
        setOrderState({
          status: 'error',
          message: data?.message ?? '주문 생성 중 오류가 발생했습니다.'
        });
        return;
      }

      setOrderState({
        status: 'success',
        orderId: data?.id ?? 'unknown-order'
      });
      setQuantities(Object.fromEntries(fetchState.products.map((p) => [p.id, 0])));
      setNote('');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다.';
      setOrderState({ status: 'error', message });
    }
  }

  const isLoadingProducts = fetchState.status === 'loading';
  const isSubmitting = orderState.status === 'submitting';

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">상품 주문</h2>
        <p className="text-sm text-slate-300">
          Mock 카탈로그에서 원하는 상품을 선택하고 주문을 생성해보세요. 주문 전 로그인 여부를 확인하세요.
        </p>
      </div>

      {fetchState.status === 'error' && (
        <div className="rounded-md border border-rose-500 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          <p>{fetchState.message}</p>
          <p className="mt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setFetchState({ status: 'loading' });
                setTimeout(() => {
                  window.location.reload();
                }, 50);
              }}
              className="underline"
            >
              새로고침
            </button>
          </p>
        </div>
      )}

      {fetchState.status === 'loading' && (
        <p className="text-sm text-slate-300">상품 목록을 불러오는 중입니다...</p>
      )}

      {fetchState.status === 'success' && (
        <div className="space-y-6">
          <ul className="space-y-4">
            {fetchState.products.map((product) => {
              const quantity = quantities[product.id] ?? 0;
              const lineTotal =
                quantity > 0
                  ? formatMoney({
                      amount: product.price.amount * quantity,
                      currency: product.price.currency
                    })
                  : null;

              return (
                <li
                  key={product.id}
                  className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-100">{product.name}</h3>
                      <p className="text-sm text-slate-400">{formatMoney(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-8 w-8 rounded-md border border-slate-700 bg-slate-800 text-lg text-slate-100 transition hover:bg-slate-700"
                        onClick={() => setQuantity(product.id, (quantities[product.id] ?? 0) - 1)}
                        disabled={quantity === 0}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={quantity}
                        onChange={(event) => setQuantity(product.id, Number(event.target.value))}
                        className="h-8 w-16 rounded-md border border-slate-700 bg-slate-900 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        className="h-8 w-8 rounded-md border border-emerald-600 bg-emerald-500 text-lg text-emerald-950 transition hover:bg-emerald-400"
                        onClick={() => setQuantity(product.id, (quantities[product.id] ?? 0) + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {lineTotal && (
                    <p className="text-xs text-emerald-300">소계: {lineTotal}</p>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-200" htmlFor="order-note">
              주문 메모 (선택)
            </label>
            <textarea
              id="order-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="예: 문 앞에 두고 가주세요."
            />
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-900/60 p-4 text-sm">
            <div className="flex items-center justify-between text-slate-300">
              <span>선택한 상품 수</span>
              <span>{selectedItems.reduce((acc, item) => acc + item.quantity, 0)}개</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>총 금액</span>
              <span>{totalMoney ? formatMoney(totalMoney) : '0'}</span>
            </div>
            <p className="text-xs text-slate-500">
              주문을 제출하면 Orders 서비스에서 Kafka 이벤트를 발행하고, 향후 결제 및 읽기 모델과 연동됩니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isLoadingProducts || selectedItems.length === 0}
            className="inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {isSubmitting ? '주문 생성 중...' : '주문 생성'}
          </button>
        </div>
      )}

      {orderState.status === 'success' && (
        <div className="rounded-md border border-emerald-500 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          <p>주문이 성공적으로 생성되었습니다.</p>
          <p className="mt-1 text-xs text-emerald-100">주문 ID: {orderState.orderId}</p>
          <p className="mt-3 text-xs text-emerald-100">
            <Link href="/" className="underline">
              홈으로 돌아가기
            </Link>{' '}
            또는{' '}
            <button
              type="button"
              onClick={() => setOrderState({ status: 'idle' })}
              className="underline"
            >
              계속 주문하기
            </button>
          </p>
        </div>
      )}

      {orderState.status === 'error' && (
        <div className="rounded-md border border-rose-500 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {orderState.message}
        </div>
      )}

      <div className="rounded-md border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
        <p>주문 서비스 API는 MVP 1 단계에서 Mock 상품 데이터를 사용합니다.</p>
        <p className="mt-2">
          로그인 토큰은 로컬 스토리지에 저장되며, 주문 시 Bearer 토큰으로 전송되어 API Gateway가 주입한 헤더를 시뮬레이션합니다.
        </p>
      </div>
    </section>
  );
}
