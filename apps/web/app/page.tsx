import Link from 'next/link';
import { ArrowRight, Boxes, LayoutDashboard, ShieldCheck, ShoppingBag } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const quickLinks = [
  { title: '회원 등록', href: '/register', description: 'API Gateway → Auth 흐름 체험' },
  { title: '로그인', href: '/login', description: 'JWT 발급·저장 플로우' },
  { title: '주문 만들기', href: '/orders', description: 'Orders 서비스 + Kafka 이벤트' },
  { title: '관리자 상품 관리', href: '/catalog/manage', description: 'Catalog Admin 토큰 기반' }
];

const learningPillars = [
  {
    title: 'MSA + EDA 실습',
    description: '서비스 간 REST 호출과 Kafka 이벤트 경로를 그대로 UI에서 학습합니다.',
    icon: Boxes
  },
  {
    title: '보안/인증 흐름',
    description: 'JWT 발급, 토큰 보관, 관리자 토큰 등 인증 실무 요소를 체험합니다.',
    icon: ShieldCheck
  },
  {
    title: '운영 시나리오',
    description: '주문·결제·카탈로그를 하나의 포털에서 점검하며 운영 UX를 디자인했습니다.',
    icon: LayoutDashboard
  }
];

export default function HomePage(): JSX.Element {
  return (
    <section className="flex flex-col gap-8">
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardHeader>
          <Badge variant="success" className="w-fit">
            MVP 1 • 인증 & 주문
          </Badge>
          <CardTitle className="text-3xl font-semibold">
            Orderly 포털에서 Nest.js MSA 여정을 시작하세요.
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            각 화면은 API Gateway와 마이크로서비스를 직접 호출하며, Kafka 이벤트까지 이어지는 백엔드 흐름을 시각적으로
            제공합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/register">
              회원 등록 체험하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/orders">
              주문 플로우 살펴보기
              <ShoppingBag className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Card key={link.href} className="flex flex-col justify-between border-border/60">
            <CardHeader>
              <CardTitle className="text-xl">{link.title}</CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Button variant="ghost" asChild>
                <Link href={link.href}>
                  바로가기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <div className="flex items-center gap-3 text-muted-foreground">
            <ShoppingBag className="h-5 w-5" />
            <p className="text-sm">학습 포인트</p>
          </div>
          <CardTitle>Orderly가 제공하는 경험</CardTitle>
          <CardDescription>
            단순한 화면 이상으로, 서비스 간 계약·이벤트 흐름과 운영 UI를 동시에 살펴볼 수 있도록 설계했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {learningPillars.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-xl border border-border/60 bg-muted/40 p-4">
              <Icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
