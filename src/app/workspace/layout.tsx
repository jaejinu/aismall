import { logout } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
export const metadata = { title: '내 조직 · AI Small Business OS', robots: { index: false, follow: false } };
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-subtle text-fg">
    <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-4 sm:px-8"><Link href="/workspace" className="text-label-lg">내 조직</Link><form action={logout}><Button type="submit" variant="ghost">로그아웃</Button></form></header>
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">{children}</main>
  </div>;
}
