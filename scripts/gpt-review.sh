#!/usr/bin/env bash
# ChatGPT 검수: 시안 이미지 + 브리프 → 검수 메모(stdout)
# 사용: scripts/gpt-review.sh <image.png|jpg> <brief.md>
# 키: 클라우드 세션에서는 api.openai.com 네트워크 시크릿을 프록시가 넣는다.
#     로컬에서는 OPENAI_API_KEY 환경변수를 쓴다.
set -euo pipefail
IMG="$1"; BRIEF="$2"
MODEL="${OPENAI_REVIEW_MODEL:-gpt-5.5}"
KEY="${OPENAI_API_KEY:-sk-proxy-injected}"
case "$IMG" in *.png) MIME=image/png;; *) MIME=image/jpeg;; esac
B64=$(base64 -w0 "$IMG")

PROMPT=$(cat <<P
너는 인테리어/건축 제안서 검수자다. 아래 브리프 기준으로 시안을 본다.
순서: 1) 목적 부합 2) 시선 위계 3) 가독성 4) 브랜드 정합성 5) 디테일.
출력: 잘된 점 1개, 고칠 점 최대 3개("무엇을 → 어떻게"), 각 항목에 [필수]/[권장]/[취향].
"세련되게" 같은 추상어 금지. 마지막 줄: 지금 당장 손볼 것 하나.

브리프:
$(cat "$BRIEF")
P
)

jq -n --arg m "$MODEL" --arg p "$PROMPT" --arg u "data:$MIME;base64,$B64" \
  '{model:$m, messages:[{role:"user", content:[{type:"text",text:$p},{type:"image_url",image_url:{url:$u}}]}]}' \
| curl -sS https://api.openai.com/v1/chat/completions \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d @- \
| jq -r '.choices[0].message.content // ("ERROR: " + (.error.message // tostring))'
