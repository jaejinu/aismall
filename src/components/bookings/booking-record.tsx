import {SearchSelect} from './search-select';
import { StatusChip } from '@/components/ui/badges';
import { TeamForm } from '@/components/auth/team-form';
import { saveBookingOperation } from '@/app/workspace/booking-actions';
import type { BookingOverview, BookingScope } from '@/server/services/bookings';

const field = 'mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-body-md';
const attendanceLabels = { unrecorded: '미기록', attended: '출석', no_show: '노쇼' };
const date = (value: string) => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value));

type Props = {
  scope: BookingScope;
  booking: BookingOverview['bookings'][number];
  sessions: BookingOverview['sessions'];
  canManage: boolean;
};

export function BookingRecord({ scope, booking: b, sessions, canManage }: Props) {
  const destinations = sessions.filter(s => s.id !== b.session_id && s.program_id === b.program_id && s.movable && s.confirmed < s.capacity);
  const identity = <><input type="hidden" name="booking" value={b.id} /><input type="hidden" name="version" value={b.version} /></>;
  return <li className="border-b border-line bg-surface transition-colors hover:bg-subtle/40 last:border-b-0">
    <div className="grid grid-cols-2 items-center gap-3 px-4 py-4 md:grid-cols-[1.2fr_1fr_1.2fr_100px_80px]">
      <p className="col-span-2 text-body-sm md:col-span-1">{date(b.starts_at)}</p>
      <p className="flex items-center gap-2 text-label-md"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-info-bg text-label-sm text-info-fg">{b.customer.slice(0,1)}</span>{b.customer}</p>
      <p className="text-body-sm text-fg-secondary">{b.program}</p>
      <span>{b.status==='confirmed'?<StatusChip status="confirmed"/>:<span className="rounded-md bg-subtle px-2 py-1 text-label-sm text-fg-muted">취소됨</span>}</span>
      <p className="text-label-sm text-fg-secondary">{b.status==='confirmed'?attendanceLabels[b.attendance]:'—'}</p>
    </div>
    <details className="px-4 pb-3"><summary className="w-fit cursor-pointer rounded-md px-2 py-1 text-caption text-fg-muted hover:bg-subtle hover:text-fg">예약 상세·관리</summary><div className="mt-3 rounded-lg bg-subtle p-4">
    {b.attendance_reason && <p className="text-body-sm">출석 기록 사유: {b.attendance_reason}</p>}
    {b.cancellation_reason && <p className="text-body-sm">취소 사유: {b.cancellation_reason}</p>}
    {canManage && b.status === 'confirmed' && <div className="mt-4 space-y-4">
      {b.cancellable ? <>
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-label-md">예약 변경</summary>
          <p className="my-3 text-body-sm">같은 프로그램의 다른 회차로 옮겨요. 기존·새 회차 모두 시작 24시간 전까지 가능해요.</p>
          {<TeamForm key={`move-${b.version}`} action={saveBookingOperation.bind(null, scope, 'reschedule')} label="회차 변경하기">
            {identity}
            <SearchSelect scope={scope} kind="session" name="destination" label="변경할 회차" programId={b.program_id} excludeId={b.session_id} initial={destinations.map(s=>({id:s.id,label:`${date(s.starts_at)} · ${s.confirmed}/${s.capacity}명`}))}/>
            <label className="block text-label-sm">변경 사유<input name="reason" className={field} required maxLength={200} /></label>
            <label className="flex gap-2 text-body-sm"><input type="checkbox" name="confirm" value="yes" required />선택한 회차로 예약을 옮겨요.</label>
          </TeamForm>}
        </details>
        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-label-md">예약 취소</summary>
          <div className="mt-3"><TeamForm action={saveBookingOperation.bind(null, scope, 'cancel')} label="예약 취소하기" danger>
            {identity}
            <label className="block text-label-sm">취소 사유<input className={field} name="reason" required maxLength={200} /></label>
            <label className="flex gap-2 text-body-sm"><input type="checkbox" name="confirm" value="yes" required />이 예약을 취소해요.</label>
          </TeamForm></div>
        </details>
      </> : <p className="text-body-sm text-fg-secondary">변경·취소 마감이 지났어요.</p>}
      {b.canAttend ? <details className="rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-label-md">출석 기록·수정</summary>
        <p className="my-3 text-body-sm">출석은 시작 후, 노쇼는 종료 후 기록해요. 수정 사유도 함께 남겨요.</p>
        <TeamForm key={`attendance-${b.version}`} action={saveBookingOperation.bind(null, scope, 'attendance')} label="출석 결과 저장하기">
          {identity}
          <label className="block text-label-sm">출석 결과<select name="outcome" className={field} required defaultValue="">
            <option value="" disabled>결과를 선택해 주세요</option>
            <option value="attended" disabled={b.attendance === 'attended'}>출석</option>
            <option value="no_show" disabled={!b.canNoShow || b.attendance === 'no_show'}>노쇼</option>
            <option value="unrecorded" disabled={b.attendance === 'unrecorded'}>미기록으로 되돌리기</option>
          </select></label>
          <label className="block text-label-sm">출석 기록 사유<input className={field} name="reason" required maxLength={200} /></label>
          <label className="flex gap-2 text-body-sm"><input type="checkbox" name="confirm" value="yes" required />출석 결과와 사유를 확인했어요.</label>
        </TeamForm>
      </details> : <p className="text-body-sm text-fg-secondary">출석은 회차 시작 후 기록할 수 있어요.</p>}
    </div>}
    </div></details>
  </li>;
}
