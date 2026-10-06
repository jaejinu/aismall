"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResultBlock } from "@/components/ui/rows";

/* 오늘 탭 '확인이 필요한 일' — 예약은 됐고 메시지만 실패한 건. 다시 보내면 결과가 바뀌어요(데모). */
export function MobileResendBlock() {
  const [state, setState] = useState<"failed" | "resent" | "manual">("failed");
  if (state !== "failed") {
    return (
      <ResultBlock
        tone="success"
        title={state === "resent" ? "메시지를 다시 보냈어요" : "직접 연락함으로 처리했어요"}
        done={["예약 생성 · 한서윤님 10/16(금) 19:00 그룹 필라테스", state === "resent" ? "확정 메시지 전송 · 알림톡" : "직접 연락 · 홍지수 기록"]}
      />
    );
  }
  return (
    <ResultBlock
      title="예약은 완료, 메시지는 보내지 못했어요"
      done={["예약 생성 · 한서윤님 10/16(금) 19:00 그룹 필라테스"]}
      failed={["메시지 전송 실패 · 알림톡 일시 오류"]}
      actions={
        <>
          <Button size="sm" onClick={() => setState("resent")}>
            메시지 다시 보내기
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setState("manual")}>
            직접 연락함으로 처리
          </Button>
        </>
      }
    />
  );
}
