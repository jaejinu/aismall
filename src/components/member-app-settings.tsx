"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/cn";

/*
 * Figma: Desktop / 설정 · 회원 앱·문의 페이지 (151:3)
 * 회원 앱 = 회원이 직접 예약하는 곳, 문의 페이지 = 가입하지 않은 고객이 문의를 남기는 곳(문의함으로 들어와요).
 * 회원 AI 도우미는 유료 플랜에서만 켤 수 있어요. 예약 변경은 회원이 직접 확인해야 실행돼요.
 */
const formFields = [
  { key: "name", label: "이름", required: true },
  { key: "phone", label: "휴대폰 번호", required: true },
  { key: "program", label: "희망 프로그램" },
  { key: "time", label: "희망 일시" },
  { key: "message", label: "문의 내용", required: true },
  { key: "photo", label: "사진 첨부" },
];

const previewSessions = [
  { when: "10/15(목) 10:00 그룹 필라테스", meta: "박준서 · 6/8명", action: "예약" },
  { when: "10/16(금) 19:00 그룹 필라테스", meta: "박준서 · 6/8명", action: "예약" },
  { when: "10/17(토) 09:00 기구 필라테스", meta: "최서연 · 3/6명 · 관리자 확인", action: "신청" },
];

/* QR 자리 표시 — 실제 QR이 아니라 모양만 보여 주는 예시 패턴 */
function QrPlaceholder({ seed }: { seed: number }) {
  const cells = Array.from({ length: 49 }, (_, i) => {
    const r = Math.floor(i / 7);
    const c = i % 7;
    const finder = (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
    return finder || (i * 7 + seed * 13) % 5 < 2;
  });
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="grid size-[84px] grid-cols-7 gap-px rounded-lg border border-line bg-surface p-2" aria-hidden>
        {cells.map((on, i) => (
          <span key={i} className={on ? "bg-fg" : "bg-surface"} />
        ))}
      </div>
      <span className="text-caption text-fg-muted">QR 예시</span>
    </div>
  );
}

function LinkField({ id, label, url, seed, onToast }: { id: string; label: string; url: string; seed: number; onToast: (t: string) => void }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <QrPlaceholder seed={seed} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label htmlFor={id} className="text-label-sm text-fg">
          {label}
        </label>
        <input id={id} readOnly value={url} className="h-10 rounded-md border border-line bg-surface px-3 text-body-md text-fg" />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              navigator.clipboard?.writeText(`https://${url}`).catch(() => {});
              onToast(`${label}를 복사했어요`);
            }}
          >
            링크 복사
          </Button>
          <Button size="sm" onClick={() => onToast("프로토타입이라 QR 파일은 만들지 않아요")}>
            QR 내려받기
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MemberAppSettings() {
  const [bookingOpen, setBookingOpen] = useState(true);
  const [assistant, setAssistant] = useState(true);
  const [fields, setFields] = useState<Record<string, boolean>>({ name: true, phone: true, program: true, time: true, message: true, photo: false });
  const [preview, setPreview] = useState<"app" | "ask">("app");
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-6 lg:p-8">
        <p className="text-caption text-fg-muted">
          <Link href="/admin/settings" className="hover:text-fg">
            설정
          </Link>{" "}
          › 회원 앱·문의 페이지
        </p>
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-h1 text-fg">회원 앱·문의 페이지</h1>
            <p className="text-body-md text-fg-secondary">강남점 회원이 예약하고 문의하는 페이지예요. 링크와 QR을 인스타그램·카카오 채널에 올려요.</p>
          </div>
          <Link href="/member/home" className="rounded-md bg-secondary px-4 py-2 text-label-md text-on-secondary hover:bg-secondary-hover">
            회원 앱 열어 보기
          </Link>
        </header>

        {toast && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            <CheckCircle size={16} aria-hidden />
            {toast}
          </p>
        )}

        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-h3 text-fg">회원 앱</h2>
            <p className="text-body-sm text-fg-secondary">회원이 수업을 보고 직접 예약하는 곳이에요.</p>
          </div>
          <LinkField id="app-link" label="회원 앱 링크" url="jaejin.app/gangnam" seed={1} onToast={setToast} />
          <div className="flex items-center gap-4 border-t border-line pt-4">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label-md text-fg">회원 예약 열기</span>
              <span className="text-body-sm text-fg-secondary">
                {bookingOpen
                  ? "끄면 회원 앱에서 새 예약을 받지 않아요. 이미 확정된 예약과 대기는 그대로예요."
                  : "지금 회원 앱에서 새 예약을 받지 않아요. 확정된 예약과 대기는 그대로예요."}
              </span>
            </span>
            <Toggle checked={bookingOpen} onChange={setBookingOpen} label="회원 예약 열기" />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-h3 text-fg">문의 페이지</h2>
            <p className="text-body-sm text-fg-secondary">가입하지 않은 사람도 문의를 남길 수 있어요. 문의는 문의함으로 들어와요.</p>
          </div>
          <LinkField id="ask-link" label="문의 페이지 링크" url="jaejin.app/gangnam/ask" seed={2} onToast={setToast} />
          <div className="border-t border-line pt-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 text-label-md text-fg">문의 폼 항목</legend>
              {formFields.map((f) => (
                <label key={f.key} className={cn("flex w-fit items-center gap-2 text-body-md text-fg", f.required ? "cursor-default" : "cursor-pointer")}>
                  <input
                    type="checkbox"
                    checked={fields[f.key]}
                    disabled={f.required}
                    onChange={(e) => setFields((v) => ({ ...v, [f.key]: e.target.checked }))}
                    className="size-4 accent-[var(--color-primary)]"
                  />
                  {f.label}
                  {f.required && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-caption text-fg-secondary">
                      <Lock size={10} aria-hidden />
                      필수
                    </span>
                  )}
                </label>
              ))}
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-subtle px-4 py-3 text-body-sm text-fg-secondary">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden />폼 아래에 &lsquo;AI가 답변 초안을 만들고, 사람이 확인해 보내요&rsquo;라는 안내가 함께
                보여요. 사람만 답하길 원하면 문의에 적을 수 있어요. 문의 확인 링크는 30일 동안 열 수 있어요.
              </p>
            </fieldset>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-h3 text-fg">회원 AI 도우미</h2>
            <span className="rounded-full bg-ai-bg px-2 py-0.5 text-label-sm text-ai-fg">유료 플랜</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-label-md text-fg">회원 AI 도우미 켜기</span>
              <span className="text-body-sm text-fg-secondary">
                회원이 앱에서 수업·예약을 물어보면 AI가 답해요. 예약 변경은 회원이 직접 확인해야 실행되고, 답하기 어려우면 담당자에게 넘겨요.
              </span>
            </span>
            <Toggle checked={assistant} onChange={setAssistant} label="회원 AI 도우미 켜기" />
          </div>
        </section>
      </main>

      <aside className="flex w-full flex-col gap-4 border-line bg-canvas px-5 py-6 xl:sticky xl:top-[57px] xl:h-[calc(100vh-57px)] xl:w-[400px] xl:shrink-0 xl:overflow-y-auto xl:border-l">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-h3 text-fg">미리보기</h2>
          <div role="tablist" aria-label="미리보기" className="flex gap-0.5 rounded-md bg-subtle p-0.5">
            {(
              [
                ["app", "회원 앱"],
                ["ask", "문의 페이지"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={preview === k}
                onClick={() => setPreview(k)}
                className={cn(
                  "cursor-pointer rounded-sm px-3 py-1 text-label-sm",
                  preview === k ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start gap-2">
            <span className="flex flex-1 flex-col">
              <span className="text-label-md text-fg">재진필라테스</span>
              <span className="text-caption text-fg-muted">강남점</span>
            </span>
            {preview === "app" && (
              <span className={cn("rounded-full px-2 py-0.5 text-label-sm", bookingOpen ? "bg-success-bg text-success-fg" : "bg-neutral-bg text-neutral-fg")}>
                {bookingOpen ? "예약 열림" : "예약 닫힘"}
              </span>
            )}
          </div>
          {preview === "app" ? (
            <>
              <span className="text-label-md text-fg">이번 주 수업</span>
              {!bookingOpen && (
                <p className="rounded-lg bg-subtle px-3 py-2 text-body-sm text-fg-secondary">지금은 앱에서 새 예약을 받지 않아요. 스튜디오로 문의해 주세요.</p>
              )}
              <ul className="flex flex-col gap-2">
                {previewSessions.map((p) => (
                  <li key={p.when} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-label-sm text-fg">{p.when}</span>
                      <span className="text-caption text-fg-muted">{p.meta}</span>
                    </span>
                    <span className={cn("rounded-md px-3 py-1 text-label-sm", bookingOpen ? "bg-primary text-on-primary" : "bg-subtle text-fg-muted")}>
                      {p.action}
                    </span>
                  </li>
                ))}
              </ul>
              {assistant && <p className="rounded-lg bg-subtle px-3 py-2 text-body-sm text-fg-secondary">궁금한 게 있으면 AI 도우미에게 물어보세요</p>}
              <nav className="flex justify-between border-t border-line pt-2 text-caption text-fg-secondary" aria-label="회원 앱 탭 미리보기">
                {["홈", "수업", "내 예약", ...(assistant ? ["AI 도우미"] : []), "내 정보"].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </nav>
            </>
          ) : (
            <>
              <span className="text-label-md text-fg">문의 남기기</span>
              <ul className="flex flex-col gap-2">
                {formFields
                  .filter((f) => fields[f.key])
                  .map((f) => (
                    <li key={f.key} className="flex flex-col gap-1">
                      <span className="text-caption text-fg-secondary">
                        {f.label}
                        {f.required && " *"}
                      </span>
                      <span className={cn("rounded-md border border-line bg-surface", f.key === "message" ? "h-14" : "h-8")} />
                    </li>
                  ))}
              </ul>
              <p className="text-caption text-fg-muted">AI가 답변 초안을 만들고, 사람이 확인해 보내요.</p>
              <span className="rounded-md bg-primary px-3 py-2 text-center text-label-md text-on-primary">문의 보내기</span>
            </>
          )}
        </div>
        <p className="text-caption text-fg-muted">회원은 브랜드에 한 번 가입하면 강남점·홍대점·마포점 수업을 모두 볼 수 있어요.</p>
      </aside>
    </div>
  );
}
