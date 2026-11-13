#!/usr/bin/env bash
# SketchUp 설치용 .rbz 만들기 → dist/mmgg_automodel.rbz
# 설치: SketchUp > 확장 프로그램 관리자 > 확장 프로그램 설치 > 이 파일 선택
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/mmgg_automodel.rbz
(cd src && zip -qr ../dist/mmgg_automodel.rbz mmgg_automodel.rb mmgg_automodel)
echo "dist/mmgg_automodel.rbz"
