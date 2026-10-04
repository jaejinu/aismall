# AI Small Business OS — 퍼블리싱

Figma 디자인(`JVxCGWm8ui8dTj72PcdX9G`)을 코드로 옮긴 화면이에요. 기획 문서는 manyfast 「AI Small Business OS」 프로젝트에 있어요.

프로젝트 전체 진행 현황·결정·다음 할 일은 [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)에 있어요.

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

## 구조

| 위치 | 내용 |
| --- | --- |
| `src/app/globals.css` | 디자인 토큰(색 라이트·다크, 글자 스타일). Figma 변수와 1:1 |
| `src/components/ui/` | 공통 컴포넌트(배지·버튼·회차 줄·브리핑 줄·결과 블록 등) |
| `src/components/approval-card.tsx` | 승인 카드 C안(근거 펼치기형). 최종안은 Test A 결과로 정해요 |
| `src/components/admin-shell.tsx` | 관리자 데스크톱 틀(사이드바·상단바) |
| `src/components/member/` | 회원 모바일 틀(하단 탭)·회차 카드·신청 시트 |
| `src/data/` | 샘플 데이터. 기준일 2026-10-14(수), 재진필라테스 강남점 |

## 만든 화면

- `/admin/today` 관리자 오늘
- `/admin/inbox` 문의함
- `/admin/approvals` 승인함 (`?id=apr-1`처럼 요청을 골라 열 수 있음)
- `/admin/schedule` 주간 일정
- `/member/schedule` 회원 수업(신청·대기 신청 시트)
- `/member/bookings` 회원 내 예약

나머지 메뉴는 '준비 중' 화면으로 연결돼요. 다크 모드는 시스템 설정을 따르고, `<html data-theme="dark|light">`로 고정할 수 있어요.
