"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Clock, Info, Send } from "lucide-react";
import { AskActions, AskHeader, AskHero, AskNote, Summary, askGhost, askPrimary, askSecondary } from "./ask-shell";
import { cn } from "@/lib/cn";

/*
 * 공개 문의 페이지 — Figma: Member / 공개 문의 (155:1022~155:1142, 165:1233, 165:1308)
 * 가입하지 않은 고객이 문의하고, 문자로 받은 확인 링크(30일)에서 답변과 진행 상태를 봐요.
 * 링크 다시 받기는 10분에 한 번, 문의가 있었는지는 알려 주지 않아요.
 * 데이터는 문의함의 한유진님 문의(10/14 12:40)와 같아요.
 */
const programs = ["그룹 필라테스", "기구 필라테스", "1:1 레슨", "아직 모르겠어요"];
const times = ["선택 안 함", "평일 저녁", "평일 오전", "주말"];
const inputCls = "h-11 w-full rounded-md border border-line bg-surface px-3 text-body-md text-fg focus:border-line-strong focus:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-sm text-fg">{label}</span>
      {children}
      {hint && <span className="text-caption text-fg-muted">{hint}</span>}
    </label>
  );
}

const maskPhone = (p: string) => p.replace(/^(\d{3})-?(\d{3,4})-?(\d{4})$/, "$1-****-$3");

export function AskForm() {
  const [name, setName] = useState("한유진");
  const [phone, setPhone] = useState("010-0000-1234");
  const [program, setProgram] = useState(programs[0]);
  const [time, setTime] = useState(times[1]);
  const [message, setMessage] = useState("필라테스는 처음인데 평일 저녁 그룹 수업 있나요? 체험도 되는지 궁금해요.");
  const [agree, setAgree] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [sent, setSent] = useState(false);
  const valid = name.trim() && /^01\d-?\d{3,4}-?\d{4}$/.test(phone.trim()) && message.trim() && agree;

  if (sent) {
    return (
      <>
        <AskHeader title="문의하기" />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <AskHero title="문의를 보냈어요" desc={`${maskPhone(phone)}로 확인 링크를 문자로 보냈어요. 링크에서 답변과 진행 상태를 볼 수 있어요.`} />
          <Summary
            chip={{ label: "접수", cls: "bg-info-bg text-info-fg" }}
            rows={[
              ["희망 프로그램", program],
              ["희망 일시", time],
              ["접수 시각", "10/14(수) 12:40"],
            ]}
          />
          <AskNote>답변은 보통 영업시간 안에 드려요. 확인 링크는 30일 동안 쓸 수 있어요.</AskNote>
          <Link href="/ask/status?state=pending" className="text-center text-label-sm text-link">
            문자로 받은 링크 열어 보기 (예시)
          </Link>
        </main>
        <AskActions>
          <Link href="/ask/resend" className={askSecondary}>
            문자가 안 왔나요? 링크 다시 받기
          </Link>
          <button type="button" onClick={() => setSent(false)} className={askGhost}>
            닫기
          </button>
        </AskActions>
      </>
    );
  }

  return (
    <>
      <AskHeader title="문의하기" />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2 text-fg">궁금한 걸 남겨 주세요</h2>
          <p className="text-body-md text-fg-secondary">가입하지 않아도 문의할 수 있어요. 답변은 문자로 받은 링크에서 봐요.</p>
        </div>
        <Field label="이름">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" />
        </Field>
        <Field label="휴대폰 번호">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} autoComplete="tel" />
        </Field>
        <Field label="희망 프로그램">
          <select value={program} onChange={(e) => setProgram(e.target.value)} className={inputCls}>
            {programs.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="희망 일시" hint="선택이에요. 원하는 시간이 있으면 골라 주세요.">
          <select value={time} onChange={(e) => setTime(e.target.value)} className={inputCls}>
            {times.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="문의 내용">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={cn(inputCls, "h-auto py-2")} />
        </Field>
        <AskNote icon={Info}>AI가 답변 초안을 만들고 강남점 담당자가 확인해 보내요. 사람만 답하길 원하면 문의 내용에 적어 주세요.</AskNote>
        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-center gap-2 text-body-md text-fg">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
            개인정보 수집·이용 동의 (필수)
            <button type="button" onClick={() => setShowTerms((v) => !v)} className="ml-auto cursor-pointer text-label-sm text-link">
              {showTerms ? "접기" : "보기"}
            </button>
          </label>
          {showTerms && (
            <p className="rounded-md bg-subtle px-3 py-2 text-caption text-fg-secondary">
              이름·휴대폰 번호·문의 내용을 문의 답변과 예약 안내에만 써요. 광고 문자는 보내지 않아요. 보관 기간과 자세한 내용은 개인정보 처리방침을 따라요.
            </p>
          )}
        </div>
      </main>
      <AskActions>
        <button type="button" disabled={!valid} onClick={() => setSent(true)} className={askPrimary}>
          문의 보내기
        </button>
      </AskActions>
    </>
  );
}

export function AskResend() {
  const [phone, setPhone] = useState("010-0000-1234");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [limited, setLimited] = useState(false);
  const [view, setView] = useState<"form" | "done">("form");

  const submit = () => {
    // 10분에 한 번만 보내요. 문의가 있었는지는 어느 경우에도 알려 주지 않아요.
    if (sentAt && Date.now() - sentAt < 10 * 60 * 1000) {
      setLimited(true);
      setView("done");
      return;
    }
    setSentAt(Date.now());
    setLimited(false);
    setView("done");
  };

  if (view === "done") {
    return (
      <>
        <AskHeader title="문의하기" />
        <main className="flex flex-1 flex-col gap-4 p-4">
          {limited ? (
            <AskHero icon={Clock} tone="neutral" title="조금 뒤에 다시 받아 주세요" desc="링크는 10분에 한 번만 보낼 수 있어요. 방금 요청한 문자가 곧 도착할 수 있어요." />
          ) : (
            <AskHero title="요청을 받았어요" desc="입력한 번호로 문의한 내역이 있으면 몇 분 안에 문자로 링크가 도착해요." />
          )}
          <AskNote icon={Info}>문자가 오지 않으면 번호를 다시 확인하거나 새로 문의해 주세요. 링크는 10분에 한 번만 보낼 수 있어요.</AskNote>
        </main>
        <AskActions>
          <Link href="/ask" className={askSecondary}>
            새로 문의하기
          </Link>
          <button type="button" onClick={() => setView("form")} className={askGhost}>
            번호 다시 입력
          </button>
        </AskActions>
      </>
    );
  }

  return (
    <>
      <AskHeader title="문의하기" />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2 text-fg">확인 링크 다시 받기</h2>
          <p className="text-body-md text-fg-secondary">문의할 때 쓴 휴대폰 번호를 넣어 주세요.</p>
        </div>
        <Field label="휴대폰 번호" hint="보안을 위해 이 번호로 문의가 있는지는 알려 드리지 않아요.">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} />
        </Field>
        <button type="button" disabled={!/^01\d-?\d{3,4}-?\d{4}$/.test(phone.trim())} onClick={submit} className={askPrimary}>
          링크 보내기
        </button>
      </main>
    </>
  );
}

const answer =
  "안녕하세요 한유진님! 평일 저녁에는 수·금 19:00에 그룹 필라테스가 있어요. 오늘(수)은 마감이고, 10/16(금) 19:00은 아직 자리가 있어요. 처음 오시면 수업 10분 전까지 도착해 간단한 상담을 받으시면 돼요. 이 시간으로 원하시면 아래 버튼을 눌러 주세요.";

export type StatusState = "pending" | "answered" | "requested" | "expired";

export function AskStatus({ initial }: { initial: StatusState }) {
  const [state, setState] = useState<StatusState>(initial);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [askedAt, setAskedAt] = useState<string | null>(null);

  if (state === "expired") {
    return (
      <>
        <AskHeader title="문의 확인" />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <AskHero icon={Clock} tone="neutral" title="링크가 만료됐어요" desc="확인 링크는 30일 동안 쓸 수 있어요. 새 링크를 받으면 문의 내용과 답변을 다시 볼 수 있어요." />
        </main>
        <AskActions>
          <Link href="/ask/resend" className={askPrimary}>
            새 링크 받기
          </Link>
          <Link href="/ask" className={askSecondary}>
            새로 문의하기
          </Link>
        </AskActions>
      </>
    );
  }

  const hero = {
    pending: { icon: Clock, title: "강남점이 확인하고 있어요", desc: "답변이 오면 문자로 알려 드려요. 이 페이지에서도 볼 수 있어요." },
    answered: { icon: CheckCircle, title: "답변이 도착했어요", desc: "강남점이 10/14(수) 14:20에 답변했어요. 원하시면 이 시간으로 바로 요청할 수 있어요." },
    requested: { icon: Clock, title: "이 시간으로 요청했어요", desc: "강남점이 자리를 확인하고 있어요. 확정되면 문자로 알려 드려요." },
  }[state];
  const chip = {
    pending: { label: "접수", cls: "bg-info-bg text-info-fg" },
    answered: { label: "답변 완료", cls: "bg-success-bg text-success-fg" },
    requested: { label: "확인 중", cls: "bg-info-bg text-info-fg" },
  }[state];

  return (
    <>
      <AskHeader title="문의 확인" />
      <main className="flex flex-1 flex-col gap-4 p-4">
        <AskHero icon={hero.icon} title={hero.title} desc={hero.desc} />
        <Summary
          chip={chip}
          rows={[
            ["희망 프로그램", "그룹 필라테스"],
            ["희망 일시", state === "requested" ? "10/16(금) 19:00 · 1명" : "평일 저녁"],
            ["접수 시각", "10/14(수) 12:40"],
          ]}
        />
        {state !== "pending" && (
          <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            <p className="flex items-center gap-2">
              <span className="text-label-md text-fg">강남점의 답변</span>
              <span className="text-caption text-fg-muted">10/14(수) 14:20</span>
            </p>
            <p className="text-body-md text-fg">{answer}</p>
            <p className="text-caption text-fg-muted">AI가 초안을 쓰고 강남점 담당자가 확인해 보냈어요</p>
          </section>
        )}
        {askedAt && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 text-label-md text-success-fg">
            <Send size={14} aria-hidden />
            질문을 보냈어요 · 답변이 오면 문자로 알려 드려요
          </p>
        )}
        {asking && (
          <label className="flex flex-col gap-1">
            <span className="text-label-sm text-fg">궁금한 시간이나 내용을 적어 주세요</span>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="예: 다음 주 수요일 저녁도 되나요?" className={cn(inputCls, "h-auto py-2")} />
          </label>
        )}
        <AskNote>
          {state === "requested"
            ? "확정 전까지는 자리가 잡히지 않아요. 그사이 자리가 차면 다른 시간을 안내해 드려요."
            : state === "answered"
              ? "요청하면 강남점이 자리를 확인한 뒤 확정 문자를 보내요. 확정 전까지는 자리가 잡히지 않아요. 이 링크는 11/13까지 쓸 수 있어요."
              : "이 링크는 11/13까지 쓸 수 있어요."}
        </AskNote>
        {state === "pending" && (
          <button type="button" onClick={() => setState("answered")} className="text-center text-label-sm text-link">
            답변이 도착했을 때 보기 (예시)
          </button>
        )}
      </main>
      <AskActions>
        {asking ? (
          <>
            <button
              type="button"
              disabled={!question.trim()}
              onClick={() => {
                setAsking(false);
                setAskedAt("방금");
                setQuestion("");
              }}
              className={askPrimary}
            >
              질문 보내기
            </button>
            <button type="button" onClick={() => setAsking(false)} className={askGhost}>
              취소
            </button>
          </>
        ) : state === "answered" ? (
          <>
            <button type="button" onClick={() => setState("requested")} className={askPrimary}>
              10/16(금) 19:00으로 요청할게요
            </button>
            <button type="button" onClick={() => setAsking(true)} className={askGhost}>
              다른 시간 물어보기
            </button>
          </>
        ) : state === "requested" ? (
          <>
            <button type="button" onClick={() => setState("answered")} className={askSecondary}>
              요청 취소하기
            </button>
            <button type="button" onClick={() => setAsking(true)} className={askGhost}>
              다른 시간 물어보기
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setAsking(true)} className={askSecondary}>
            내용 더 보내기
          </button>
        )}
      </AskActions>
    </>
  );
}
