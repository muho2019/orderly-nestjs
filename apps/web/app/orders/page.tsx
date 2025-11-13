'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Package, ReceiptText, ShoppingCart } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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

type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
};

type Order = {
  id: string;
  status: string;
  total: Money;
  items: OrderItem[];
  note?: string;
  clientReference?: string;
  createdAt: string;
  updatedAt: string;
};

type OrdersFetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; orders: Order[] };

type CancelState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message: string };

type PaymentState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

const ORDER_STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'outline' | 'destructive' }
> = {
  CREATED: { label: '생성됨', variant: 'secondary' },
  CONFIRMED: { label: '확정', variant: 'success' },
  COMPLETED: { label: '완료', variant: 'success' },
  CANCELLED: { label: '취소됨', variant: 'destructive' },
  FAILED: { label: '실패', variant: 'destructive' }
};

function getStatusBadge(
  status: string
): { label: string; variant: 'default' | 'secondary' | 'success' | 'outline' | 'destructive' } {
  return ORDER_STATUS_BADGE[status] ?? { label: status, variant: 'outline' };
}

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

const ORDER_DATA_ERROR_MESSAGE = '주문 데이터 형식이 올바르지 않습니다.';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function normalizeOrdersResponse(raw: unknown): Order[] {
  if (!Array.isArray(raw)) {
    throw new Error(ORDER_DATA_ERROR_MESSAGE);
  }

  return raw.map((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(ORDER_DATA_ERROR_MESSAGE);
    }

    const {
      id,
      status,
      total,
      items,
      note,
      clientReference,
      createdAt,
      updatedAt
    } = entry as Record<string, unknown>;

    if (
      typeof id !== 'string' ||
      typeof status !== 'string' ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string'
    ) {
      throw new Error(ORDER_DATA_ERROR_MESSAGE);
    }

    if (
      typeof total !== 'object' ||
      total === null ||
      typeof (total as { amount?: unknown }).amount !== 'number' ||
      typeof (total as { currency?: unknown }).currency !== 'string'
    ) {
      throw new Error(ORDER_DATA_ERROR_MESSAGE);
    }

    if (!Array.isArray(items)) {
      throw new Error(ORDER_DATA_ERROR_MESSAGE);
    }

    const normalizedItems = items.map((item) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(ORDER_DATA_ERROR_MESSAGE);
      }

      const { productId, quantity, unitPrice, lineTotal } = item as Record<string, unknown>;

      if (
        typeof productId !== 'string' ||
        typeof quantity !== 'number' ||
        !Number.isInteger(quantity)
      ) {
        throw new Error(ORDER_DATA_ERROR_MESSAGE);
      }

      if (
        typeof unitPrice !== 'object' ||
        unitPrice === null ||
        typeof (unitPrice as { amount?: unknown }).amount !== 'number' ||
        typeof (unitPrice as { currency?: unknown }).currency !== 'string'
      ) {
        throw new Error(ORDER_DATA_ERROR_MESSAGE);
      }

      if (
        typeof lineTotal !== 'object' ||
        lineTotal === null ||
        typeof (lineTotal as { amount?: unknown }).amount !== 'number' ||
        typeof (lineTotal as { currency?: unknown }).currency !== 'string'
      ) {
        throw new Error(ORDER_DATA_ERROR_MESSAGE);
      }

      return {
        productId,
        quantity,
        unitPrice: {
          amount: (unitPrice as { amount: number }).amount,
          currency: (unitPrice as { currency: string }).currency
        },
        lineTotal: {
          amount: (lineTotal as { amount: number }).amount,
          currency: (lineTotal as { currency: string }).currency
        }
      };
    });

    return {
      id,
      status,
      total: {
        amount: (total as { amount: number }).amount,
        currency: (total as { currency: string }).currency
      },
      items: normalizedItems,
      note: typeof note === 'string' ? note : undefined,
      clientReference: typeof clientReference === 'string' ? clientReference : undefined,
      createdAt,
      updatedAt
    };
  });
}

export default function OrdersPage(): JSX.Element {
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' });
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [orderState, setOrderState] = useState<OrderState>({ status: 'idle' });
  const [ordersState, setOrdersState] = useState<OrdersFetchState>({ status: 'idle' });
  const [cancelStates, setCancelStates] = useState<Record<string, CancelState>>({});
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' });
  const isMountedRef = useRef(true);

  function getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('orderly_token') : null;
  }

  const updateCancelState = useCallback((orderId: string, nextState: CancelState) => {
    setCancelStates((prev) => ({
      ...prev,
      [orderId]: nextState
    }));
  }, []);

  const loadOrders = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('orderly_token') : null;
    if (!token) {
      if (isMountedRef.current) {
        setOrdersState({ status: 'idle' });
      }
      return;
    }

    if (isMountedRef.current) {
      setOrdersState({ status: 'loading' });
    }

    try {
      const response = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store'
      });

      const data = await response
        .json()
        .catch(() => ({ message: '주문 목록을 불러오지 못했습니다.' }));

      if (!response.ok) {
        throw new Error(data?.message ?? '주문 목록을 가져올 수 없습니다.');
      }

      const normalized = normalizeOrdersResponse(data);
      if (isMountedRef.current) {
        setOrdersState({ status: 'success', orders: normalized });
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      const message =
        error instanceof Error ? error.message : '주문 목록을 가져올 수 없습니다.';
      setOrdersState({ status: 'error', message });
    }
  }, [isMountedRef]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, [isMountedRef]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts(): Promise<void> {
      setFetchState({ status: 'loading' });
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('orderly_token') : null;
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch('/api/products', {
          cache: 'no-store',
          headers
        });
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

  useEffect(() => {
    void loadOrders();

    const handleStorage = (event: StorageEvent): void => {
      if (event.key === 'orderly_token') {
        void loadOrders();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadOrders]);

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

  const productLookup = useMemo(() => {
    if (fetchState.status !== 'success') {
      return {} as Record<string, Product>;
    }

    return fetchState.products.reduce<Record<string, Product>>((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});
  }, [fetchState]);

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

  const handleCancel = useCallback(
    async (orderId: string) => {
      const token = localStorage.getItem('orderly_token');
      if (!token) {
        updateCancelState(orderId, {
          status: 'error',
          message: '주문을 취소하려면 먼저 로그인해야 합니다.'
        });
        return;
      }

      const confirmed = window.confirm('선택한 주문을 취소하시겠습니까?');
      if (!confirmed) {
        return;
      }

      updateCancelState(orderId, { status: 'loading' });

      try {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({})
        });

        const data = await response
          .json()
          .catch(() => ({ message: '주문 취소에 실패했습니다.' }));

        if (!response.ok) {
          updateCancelState(orderId, {
            status: 'error',
            message: data?.message ?? '주문 취소 중 오류가 발생했습니다.'
          });
          return;
        }

        updateCancelState(orderId, {
          status: 'success',
          message: '주문이 취소되었습니다.'
        });
        await loadOrders();

        if (isMountedRef.current) {
          setTimeout(() => {
            if (!isMountedRef.current) {
              return;
            }
            setCancelStates((prev) => {
              const current = prev[orderId];
              if (!current || current.status !== 'success') {
                return prev;
              }
              const { [orderId]: _removed, ...rest } = prev;
              return rest;
            });
          }, 3000);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '주문 취소 중 오류가 발생했습니다.';
        updateCancelState(orderId, { status: 'error', message });
      }
    },
    [isMountedRef, loadOrders, updateCancelState]
  );

  const requestPaymentForOrder = useCallback(
    async (order: Order) => {
      const token = getToken();
      if (!token) {
        setPaymentState({
          status: 'error',
          message: '결제를 진행하려면 로그인해야 합니다.'
        });
        return;
      }

      setPaymentState({ status: 'processing' });
      try {
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            orderId: order.id,
            amount: order.total
          })
        });

        const data = await response
          .json()
          .catch(() => ({ message: '결제 요청 처리 중 오류가 발생했습니다.' }));

        if (!response.ok) {
          throw new Error(data?.message ?? '결제에 실패했습니다.');
        }

        setPaymentState({
          status: 'success',
          message: `결제가 완료되었습니다. (결제 ID: ${data.id ?? '확인 중'})`
        });
        await loadOrders();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '결제 요청에 실패했습니다.';
        setPaymentState({ status: 'error', message });
      }
    },
    [loadOrders]
  );

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
    setPaymentState({ status: 'idle' });

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

      const orderId = data?.id ?? 'unknown-order';
      const orderTotal =
        typeof data === 'object' && data !== null && 'total' in data
          ? (data.total as Money)
          : totalMoney;
      setOrderState({
        status: 'success',
        orderId
      });
      setQuantities(Object.fromEntries(fetchState.products.map((p) => [p.id, 0])));
      setNote('');
      if (orderTotal) {
        await requestPaymentForOrder({
          id: orderId,
          total: orderTotal
        } as Order);
      } else {
        await loadOrders();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '주문 생성 중 오류가 발생했습니다.';
      setOrderState({ status: 'error', message });
    }
  }

  const isLoadingProducts = fetchState.status === 'loading';
  const isSubmitting = orderState.status === 'submitting';
  const isRefreshingOrders = ordersState.status === 'loading';
  const totalSelectedQuantity = selectedItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
          <ShoppingCart className="h-4 w-4" />
          Orders Service
        </div>
        <h2 className="text-3xl font-semibold">주문 오케스트레이션</h2>
        <p className="text-sm text-muted-foreground">
          Mock 카탈로그에서 상품을 선택해 주문을 생성하고, Kafka 이벤트 파이프라인을 통해 결제·읽기 모델로 이어지는 흐름을
          살펴보세요.
        </p>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="create">주문 생성</TabsTrigger>
          <TabsTrigger value="history">주문 내역</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {fetchState.status === 'loading' && (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>상품 정보를 불러오는 중</CardTitle>
                <CardDescription>Catalog 서비스의 Mock 데이터를 조회하고 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                잠시만 기다려주세요.
              </CardContent>
            </Card>
          )}

          {fetchState.status === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>상품 목록을 불러오지 못했습니다.</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 text-sm">
                <p>{fetchState.message}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFetchState({ status: 'loading' });
                    setTimeout(() => {
                      window.location.reload();
                    }, 50);
                  }}
                >
                  다시 시도
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {fetchState.status === 'success' && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
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
                    <Card
                      key={product.id}
                      className={cn(
                        'border-border/60 transition hover:border-primary/60',
                        quantity > 0 && 'border-primary bg-primary/5'
                      )}
                    >
                      <CardHeader className="flex flex-row items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-xl">{product.name}</CardTitle>
                          <CardDescription>{formatMoney(product.price)}</CardDescription>
                        </div>
                        {quantity > 0 && (
                          <Badge variant="success" className="whitespace-nowrap">
                            {quantity}개 선택
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={quantity === 0}
                            onClick={() => setQuantity(product.id, quantity - 1)}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            max={99}
                            value={quantity}
                            onChange={(event) =>
                              setQuantity(product.id, Number(event.target.value) || 0)
                            }
                            className="w-20 text-center"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity(product.id, quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        {lineTotal && (
                          <p className="text-xs text-muted-foreground">소계: {lineTotal}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>주문 요약</CardTitle>
                  <CardDescription>
                    선택한 상품과 메모를 확인한 뒤 주문을 제출하면 Orders 서비스가 Kafka 이벤트를 발행합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">선택된 상품</span>
                      <span className="font-semibold text-foreground">{totalSelectedQuantity}개</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-muted-foreground">총 금액</span>
                      <span className="text-lg font-semibold text-primary">
                        {totalMoney ? formatMoney(totalMoney) : '0원'}
                      </span>
                    </div>
                  </div>

                  {selectedItems.length > 0 ? (
                    <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
                      {selectedItems.map((item) => {
                        const lineTotalMoney = {
                          amount: item.product.price.amount * item.quantity,
                          currency: item.product.price.currency
                        };
                        return (
                          <li key={item.product.id} className="flex items-center justify-between p-3 text-sm">
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-xs text-muted-foreground">{formatMoney(item.product.price)}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity}개 · {formatMoney(lineTotalMoney)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">상품을 선택하면 소계가 나타납니다.</p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="order-note">주문 메모 (선택)</Label>
                    <Textarea
                      id="order-note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={3}
                      placeholder="예: 문 앞에 두고 가주세요."
                    />
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    disabled={isSubmitting || isLoadingProducts || selectedItems.length === 0}
                    onClick={() => void handleSubmit()}
                  >
                    {isSubmitting ? '주문 생성 중...' : '주문 생성'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {orderState.status === 'success' && (
            <Alert variant="success">
              <AlertTitle>주문이 생성되었습니다.</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>주문 ID: {orderState.orderId}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setOrderState({ status: 'idle' })}>
                    계속 주문하기
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/">홈으로 이동</Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {orderState.status === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>주문 생성 실패</AlertTitle>
              <AlertDescription>{orderState.message}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>내 주문 내역</CardTitle>
              <CardDescription>로그인한 계정으로 생성한 주문을 확인하고 관리하세요.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadOrders()} disabled={isRefreshingOrders}>
              {isRefreshingOrders ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  갱신 중...
                </>
              ) : (
                <>
                  <ReceiptText className="mr-2 h-4 w-4" />
                  새로고침
                </>
              )}
            </Button>
          </div>

          {ordersState.status === 'idle' && (
            <Card className="border-dashed">
              <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
                <p>로그인 후 주문을 생성하면 이곳에서 주문 내역을 확인할 수 있습니다.</p>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/login">로그인 하러 가기</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {ordersState.status === 'loading' && (
            <Card className="border-border/70">
              <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                주문 내역을 불러오는 중입니다...
              </CardContent>
            </Card>
          )}

          {ordersState.status === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>주문 내역을 가져오지 못했습니다.</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{ordersState.message}</p>
                <Button variant="secondary" size="sm" onClick={() => void loadOrders()}>
                  다시 시도
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {ordersState.status === 'success' && ordersState.orders.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                생성된 주문이 없습니다. 주문을 만들면 목록이 채워집니다.
              </CardContent>
            </Card>
          )}

          {ordersState.status === 'success' && ordersState.orders.length > 0 && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>총 금액</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersState.orders.map((order) => {
                      const cancelState = (cancelStates[order.id] ?? { status: 'idle' }) as CancelState;
                      const isCancelling = cancelState.status === 'loading';
                      const statusBadge = getStatusBadge(order.status);

                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="font-medium">{order.id}</span>
                              {order.note && <span className="text-xs text-muted-foreground">메모: {order.note}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                          </TableCell>
                          <TableCell>{formatMoney(order.total)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    상세
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>주문 상세</DialogTitle>
                                    <DialogDescription>{order.id}</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-3 text-sm">
                                    <p className="font-medium text-foreground">상품 목록</p>
                                    <ul className="space-y-2 rounded-xl border border-border/70 p-3">
                                      {order.items.map((item, index) => {
                                        const productName = productLookup[item.productId]?.name ?? item.productId;
                                        return (
                                          <li
                                            key={`${order.id}-${item.productId}-${index}`}
                                            className="flex items-center justify-between"
                                          >
                                            <span>{productName}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {item.quantity}개 · {formatMoney(item.lineTotal)}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                    {order.note && (
                                      <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">주문 메모</p>
                                        <p className="mt-1 text-foreground">{order.note}</p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {order.status === 'CREATED' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isCancelling || isRefreshingOrders}
                                    onClick={() => void handleCancel(order.id)}
                                  >
                                    {isCancelling ? '취소 중...' : '주문 취소'}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={paymentState.status === 'processing'}
                                    onClick={() => void requestPaymentForOrder(order)}
                                  >
                                    {paymentState.status === 'processing' ? '결제 중...' : '결제 요청'}
                                  </Button>
                                </>
                              )}
                            </div>
                            {cancelState.status !== 'idle' && cancelState.message && (
                              <p
                                className={cn(
                                  'mt-2 text-xs',
                                  cancelState.status === 'error' ? 'text-destructive' : 'text-emerald-400'
                                )}
                              >
                                {cancelState.message}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {paymentState.status === 'processing' && (
        <Alert variant="info">
          <AlertTitle>결제 요청 중</AlertTitle>
          <AlertDescription>Payments 서비스에서 결제 이벤트를 처리하는 중입니다.</AlertDescription>
        </Alert>
      )}

      {paymentState.status === 'success' && (
        <Alert variant="success">
          <AlertTitle>결제가 완료되었습니다.</AlertTitle>
          <AlertDescription>{paymentState.message}</AlertDescription>
        </Alert>
      )}

      {paymentState.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>결제 요청 실패</AlertTitle>
          <AlertDescription>{paymentState.message}</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/70 bg-muted/20">
        <CardHeader>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <p className="text-sm font-medium">Architecture Notes</p>
          </div>
          <CardTitle className="text-xl">MVP 1 주문 플로우</CardTitle>
          <CardDescription>
            주문 생성 시 Orders → Kafka → Payments 순으로 이벤트가 이어지며, 로그인 토큰은 Local Storage의 Bearer 값을 통해
            API Gateway 인증을 시뮬레이션합니다.
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}
