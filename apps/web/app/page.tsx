import Link from 'next/link';

export default function HomePage(): JSX.Element {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">시작하기</h2>
      <p className="leading-relaxed text-slate-300">
        Orderly는 백엔드 학습을 위해 설계된 프로젝트입니다. 아래 버튼을 눌러 회원 등록 플로우를 체험해 보세요.
      </p>
      <Link
        href="/register"
        className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
      >
        회원 등록 화면으로 이동
      </Link>
    </section>
  );
}
