'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Package, PencilLine, PlusCircle, RefreshCw } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

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
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

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
    setEditDialogOpen(true);
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
      setEditDialogOpen(false);
      setEditTarget(null);
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
    <section className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
          <Package className="h-4 w-4" />
          Catalog Admin
        </div>
        <h1 className="text-3xl font-semibold">상품 관리</h1>
        <p className="text-sm text-muted-foreground">
          API Gateway에 관리자 토큰을 전달해 catalog-service와 직접 통신하며 상품을 등록·수정하거나 상태를 전환합니다.
        </p>
        <p className="text-xs text-muted-foreground">
          MVP 단계에서는 공유된 X-Admin-Token을 사용하며, 추후 Role 기반 권한으로 전환할 예정입니다.
        </p>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="create">신규 상품 등록</TabsTrigger>
          <TabsTrigger value="manage">상품 상태/수정</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <PlusCircle className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wide">Create</span>
              </div>
              <CardTitle>신규 상품 등록</CardTitle>
              <CardDescription>Next.js API Route가 catalog-service로 REST 요청을 전달합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleCreate}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">상품명</Label>
                    <Input
                      id="create-name"
                      required
                      value={createForm.name}
                      onChange={(event) => updateCreateForm('name', event.target.value)}
                      placeholder="예: NestJS 티셔츠"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-sku">SKU (선택)</Label>
                    <Input
                      id="create-sku"
                      value={createForm.sku}
                      onChange={(event) => updateCreateForm('sku', event.target.value)}
                      placeholder="SKU-001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-thumbnail">썸네일 URL (선택)</Label>
                  <Input
                    id="create-thumbnail"
                    value={createForm.thumbnailUrl}
                    onChange={(event) => updateCreateForm('thumbnailUrl', event.target.value)}
                    placeholder="https://"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-description">설명</Label>
                  <Textarea
                    id="create-description"
                    rows={3}
                    value={createForm.description}
                    onChange={(event) => updateCreateForm('description', event.target.value)}
                    placeholder="상품 설명을 입력하세요."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="create-price-amount">가격 (원 단위)</Label>
                    <Input
                      id="create-price-amount"
                      type="number"
                      min={1}
                      required
                      value={createForm.priceAmount}
                      onChange={(event) => updateCreateForm('priceAmount', event.target.value)}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>화폐 코드</Label>
                    <Select
                      value={createForm.priceCurrency}
                      onValueChange={(value) => updateCreateForm('priceCurrency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="KRW" />
                      </SelectTrigger>
                      <SelectContent>
                        {['KRW', 'USD', 'EUR'].map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createState.status === 'submitting'}>
                  {createState.status === 'submitting' ? '등록 중...' : '상품 등록'}
                </Button>
              </form>

              {createState.status === 'error' && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>등록 실패</AlertTitle>
                  <AlertDescription>{createState.message}</AlertDescription>
                </Alert>
              )}

              {createState.status === 'success' && (
                <Alert variant="success" className="mt-4">
                  <AlertTitle>등록 완료</AlertTitle>
                  <AlertDescription>{createState.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          {productsState.status === 'loading' && (
            <Card className="border-border/70">
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          )}

          {productsState.status === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>상품 목록을 불러오지 못했습니다.</AlertTitle>
              <AlertDescription>{productsState.message}</AlertDescription>
            </Alert>
          )}

          {productsState.status === 'success' && (
            <>
              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ClipboardList className="h-5 w-5" />
                      <span className="text-sm font-medium uppercase tracking-wide">Inventory</span>
                    </div>
                    <CardTitle>상품 상태 관리</CardTitle>
                    <CardDescription>
                      Catalog 서비스 상태 값은 Kafka 이벤트로 퍼블리시되어 Orders/Payments 읽기 모델과 동기화됩니다.
                    </CardDescription>
                  </div>
                  {latestUpdateInfo && (
                    <p className="text-sm text-muted-foreground">
                      최근 업데이트: <span className="font-medium text-foreground">{latestUpdateInfo}</span>
                    </p>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>상품</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>가격</TableHead>
                        <TableHead>상태 조정</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsState.items.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku ?? 'SKU 미설정'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{STATUS_LABELS[product.status] ?? product.status}</Badge>
                          </TableCell>
                          <TableCell>{toDisplayPrice(product.price)}</TableCell>
                          <TableCell>
                            <Select
                              value={statusSelection[product.id] ?? product.status}
                              onValueChange={(value) =>
                                setStatusSelection((prev) => ({
                                  ...prev,
                                  [product.id]: value
                                }))
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {STATUS_LABELS[option]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void updateStatus(product.id)}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                상태 적용
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(product)}>
                                <PencilLine className="mr-2 h-4 w-4" />
                                세부 수정
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {statusMessage && (
                <Alert variant="info">
                  <AlertTitle>상태 업데이트</AlertTitle>
                  <AlertDescription>{statusMessage}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={isEditDialogOpen && Boolean(editTarget)}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditTarget(null);
            setEditState({ status: 'idle' });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>상품 수정</DialogTitle>
            <DialogDescription>
              {editTarget ? `${editTarget.name} (${editTarget.id.slice(0, 8)})` : '대상 상품을 선택하세요.'}
            </DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">상품명</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(event) => updateEditForm('name', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sku">SKU</Label>
                  <Input
                    id="edit-sku"
                    value={editForm.sku}
                    onChange={(event) => updateEditForm('sku', event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">설명</Label>
                <Textarea
                  id="edit-description"
                  rows={3}
                  value={editForm.description}
                  onChange={(event) => updateEditForm('description', event.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-price-amount">가격</Label>
                  <Input
                    id="edit-price-amount"
                    type="number"
                    min={1}
                    value={editForm.priceAmount}
                    onChange={(event) => updateEditForm('priceAmount', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price-currency">화폐</Label>
                  <Input
                    id="edit-price-currency"
                    value={editForm.priceCurrency}
                    onChange={(event) => updateEditForm('priceCurrency', event.target.value)}
                    className="uppercase"
                  />
                </div>
              </div>

              <Button type="submit" disabled={editState.status === 'submitting'}>
                {editState.status === 'submitting' ? '저장 중...' : '변경 사항 저장'}
              </Button>

              {editState.status === 'error' && (
                <Alert variant="destructive">
                  <AlertTitle>수정 실패</AlertTitle>
                  <AlertDescription>{editState.message}</AlertDescription>
                </Alert>
              )}

              {editState.status === 'success' && (
                <Alert variant="success">
                  <AlertTitle>수정 완료</AlertTitle>
                  <AlertDescription>{editState.message}</AlertDescription>
                </Alert>
              )}
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">편집할 상품을 먼저 선택해주세요.</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
