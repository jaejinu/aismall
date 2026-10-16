import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
export const metadata = { title: '로그인 · AI Small Business OS', robots: { index: false, follow: false } };
export default function LoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-subtle px-5 py-12 text-fg">
    <section className="w-full max-w-md rounded-xl border border-line bg-surface p-6 sm:p-8">
      <p className="mb-3 text-label-sm text-fg-secondary">AI Small Business OS</p>
      <h1 className="text-h1">로그인하고 시작해요</h1>
      <p className="mb-8 mt-3 text-body-md text-fg-secondary">회원은 내 예약을, 운영자는 사업장 업무를 확인할 수 있어요. 사업장에서 안내받은 이메일로 로그인해 주세요.</p>
      <LoginForm />
      <p className="mt-6 text-body-sm text-fg-secondary">지금은 사전에 등록한 개발 계정으로 이용할 수 있어요.</p>
      <Link href="/" className="mt-4 inline-block text-label-sm underline">프로젝트 소개 보기</Link>
    </section>
  </main>;
}
