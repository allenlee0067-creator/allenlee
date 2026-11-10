---
description: 제안서 파이프라인 실행 — 브리프 확인 → 모델링·레퍼런스·조명/마감재 병렬 → ChatGPT 검수·렌더 → 취합
argument-hint: <프로젝트 폴더명>
---
프로젝트: `$ARGUMENTS`

1. `proposals/$ARGUMENTS/`가 없으면 `proposals/_template/`을 복사해 만든다.
2. `brief.md`의 목적·타깃·채널/규격·금기 중 빈 칸이 있으면 **그것만 물어보고 멈춘다.** 다 차 있으면 한 줄 요약을 보여주고 확인받는다.
3. 확인되면 한 메시지에서 `modeler`, `reference-researcher`, `materials-researcher` 세 에이전트를 동시에 띄운다. 각자에게 brief.md 전문과 프로젝트 폴더 경로를 준다.
4. modeler 썸네일을 받으면 `gpt-reviewer`에 넘긴다.
5. `proposal.md`를 채운다. 마지막 섹션 "사람 확인 필요"에 디자인 판단 항목을 최대 3개 남긴다.
6. 브랜치에 커밋·푸시한다.
