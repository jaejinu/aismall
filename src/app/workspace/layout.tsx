import { logout } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { WorkspaceFrame } from '@/components/workspace/workspace-frame';
export const dynamic = 'force-dynamic';
export const metadata = { title: '내 조직 · AI Small Business OS', robots: { index: false, follow: false } };
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceFrame logout={<form action={logout}><Button type="submit" variant="ghost">로그아웃</Button></form>}>{children}</WorkspaceFrame>;
}
