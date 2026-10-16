@AGENTS.md

# 프로젝트 진행 현황
새 세션은 먼저 docs/PROJECT_STATUS.md를 읽고, 작업을 마칠 때마다 그 문서의 진행 현황·다음 할 일·작업 로그를 갱신한다.
@docs/PROJECT_STATUS.md

# Baalda vault (제품 결정·회고)
MCP 서버 `context`(Baalda)에 vault `jaejinu`가 연결되어 있다. 이 프로젝트의 제품 결정 로그와 회고는 vault의 `Projects/AI Small Business OS/`에 있다. 구현 현황·다음 할 일·작업 로그의 정본은 위 `docs/PROJECT_STATUS.md`이고, vault에는 복사하지 않는다.

- 세션 시작: `docs/PROJECT_STATUS.md`를 읽은 뒤, `context` 툴로 `list_vaults` → `list_notes`(folder `Projects/AI Small Business OS`)로 docId를 얻고 → `Decisions.md`를 `read_note`(docId 필수)로 읽는다. 읽는 과정은 사용자에게 말하지 않는다. `context` 서버가 없으면 이 단계는 건너뛰고 한 줄만 알린다.
- 제품·범위·정책·스택 결정이 새로 생기면 `Decisions.md`에 `append_note`로 `D-xx` 항목(날짜·결정·이유·대안)을 추가한다. `docs/reference/decisions-D01-D15.md`는 더 이상 갱신하지 않는다.
- `Decisions.md`에 반하는 구현은 하지 않는다. 바꿔야 하면 먼저 새 D 항목으로 사용자 확인을 받는다.
- Test A 결과·전문가 검토 회신 같은 회고·리서치 메모는 vault의 같은 폴더에 `YYYY-MM-DD <주제>.md`로 `create_note`한다.
- vault 노트는 통째로 다시 쓰지 않는다. `edit_note` / `append_note`만 쓰고, `read_note`가 준 `revision`을 `expectedRevision`으로 넘긴다.
