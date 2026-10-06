import { redirect } from "next/navigation";

/* 관리자 모바일 첫 화면은 오늘 탭이에요. */
export default function MobileIndex() {
  redirect("/mobile/today");
}
