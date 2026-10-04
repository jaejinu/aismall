"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { BottomSheet } from "@/components/member/bottom-sheet";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-label-sm text-fg-muted">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">{children}</div>
    </section>
  );
}

function Row({ title, desc, action, danger }: { title: string; desc?: string; action?: React.ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={danger ? "text-label-md text-danger-fg" : "text-label-md text-fg"}>{title}</span>
        {desc && <span className="text-caption text-fg-secondary">{desc}</span>}
      </div>
      {action}
    </div>
  );
}

/* Figma: Member / 내 정보 (156:1185) — 예약 안내와 광고성 수신 동의를 나눠서 받는다. */
export function MeView() {
  const [service, setService] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [changed, setChanged] = useState("10/2");
  const [leaveOpen, setLeaveOpen] = useState(false);

  return (
    <main className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
        <span className="flex size-11 items-center justify-center rounded-full bg-subtle text-label-md text-fg-secondary">김</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-h3 text-fg">김하늘</span>
          <span className="text-caption text-fg-secondary">카카오로 가입 · 2026-09-02</span>
        </div>
        <span className="rounded-full bg-subtle px-2 py-0.5 text-label-sm text-fg-secondary">강남점</span>
      </div>

      <Group title="연락처">
        <Row title="휴대폰 번호" desc="010-2***-1234 · 바꾸면 새 번호로 다시 인증해요" action={<Button size="sm" variant="ghost">변경</Button>} />
        <Row title="이메일" desc="등록하지 않았어요" action={<Button size="sm" variant="ghost">추가</Button>} />
      </Group>

      <Group title="알림 받기 (수신 동의)">
        <Row
          title="예약·수업 안내"
          desc={service ? "예약 확정, 휴강, 대기 결과를 카카오 알림톡·문자로 알려요. 끄면 앱 알림으로만 받아요." : "앱 알림으로만 받아요. 휴강처럼 꼭 필요한 안내는 앱에 남아요."}
          action={<Toggle label="예약·수업 안내" checked={service} onChange={setService} />}
        />
        <Row
          title="혜택·이벤트 소식 (광고성)"
          desc={`마지막 변경 ${changed} · 언제든 바꿀 수 있어요`}
          action={
            <Toggle
              label="혜택·이벤트 소식"
              checked={marketing}
              onChange={(v) => {
                setMarketing(v);
                setChanged("방금");
              }}
            />
          }
        />
      </Group>

      <Group title="내 정보 관리">
        <Row title="내 정보 열람 요청" desc="재진필라테스가 가진 내 정보를 받아볼 수 있어요" action={<Button size="sm" variant="ghost">요청</Button>} />
        <button type="button" className="w-full cursor-pointer text-left hover:bg-subtle">
          <Row title="로그아웃" />
        </button>
        <button type="button" onClick={() => setLeaveOpen(true)} className="w-full cursor-pointer text-left hover:bg-subtle">
          <Row title="탈퇴하기" desc="다가오는 예약 1건과 대기 1건이 있어요. 탈퇴 전에 먼저 정리해요." danger />
        </button>
      </Group>

      <BottomSheet open={leaveOpen} onClose={() => setLeaveOpen(false)} title="탈퇴하기 전에 확인해 주세요">
        <ul className="flex flex-col gap-2 rounded-lg bg-subtle p-4 text-body-sm text-fg">
          <li>· 다가오는 예약 10/15(목) 10:00 그룹 필라테스가 취소돼요. 변경·취소 마감이 지나 스튜디오 확인이 필요해요.</li>
          <li>· 대기 신청 10/14(수) 19:00 그룹 필라테스가 취소돼요.</li>
          <li>· 수신 동의 철회 기록은 법에 따라 보관돼요.</li>
        </ul>
        <Button variant="danger" className="w-full py-3" disabled>
          예약을 정리한 뒤 탈퇴할 수 있어요
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setLeaveOpen(false)}>
          닫기
        </Button>
      </BottomSheet>
    </main>
  );
}
