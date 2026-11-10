#!/usr/bin/env bash
# ChatGPT 렌더: 모델 캡처(형태 고정) + 지시문 → 렌더 PNG
# 사용: scripts/gpt-render.sh <image.png> "<지시문>" <out.png>
set -euo pipefail
IMG="$1"; PROMPT="$2"; OUT="$3"
MODEL="${OPENAI_IMAGE_MODEL:-gpt-image-1}"
KEY="${OPENAI_API_KEY:-sk-proxy-injected}"
LOCK="Keep every wall, window, opening and furniture position exactly as in the input image. Do not add any text or letters."

RESP=$(curl -sS https://api.openai.com/v1/images/edits \
  -H "Authorization: Bearer $KEY" \
  -F model="$MODEL" -F "image=@$IMG" -F prompt="$PROMPT. $LOCK" -F size=1536x1024)
B64=$(jq -r '.data[0].b64_json // empty' <<<"$RESP")
if [ -z "$B64" ]; then echo "ERROR: $(jq -r '.error.message // tostring' <<<"$RESP")" >&2; exit 1; fi
base64 -d <<<"$B64" > "$OUT"
echo "$OUT"
