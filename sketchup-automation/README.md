# MMGG 자동 모델링 (SketchUp)

치수 사양 **JSON 하나**로 슬래브·외벽·내벽·창호·계단·가구·태그·재질·장면(아이소/층별 평면/단면)을 만들고,
JSON을 고쳐 저장하면 모델이 **다시 생성**된다. 장면 PNG와 실면적표 CSV까지 한 번에 뽑는다.

`architecture-ai`(치수 → 2D 도면)와 같은 원칙: **형태는 코드가 정확히, 같은 입력이면 같은 모델.**

---

## 1. 프로세스

```
 ① 실 리스트 (엑셀)        ② 사양 JSON              ③ SketchUp               ④ 결과물
 층,실명,x,y,w,d  ──CSV──▶  건물 외곽·층고·벽두께  ──▶  확장 프로그램 메뉴  ──▶  장면 PNG 5장
                           개구부·문·계단·가구          "JSON 사양으로 생성"       실면적표.csv
                                 ▲                         │                    .skp
                                 └──── 수정·저장 ◀──────────┘ (자동 갱신 켜면 저장 즉시 재생성)
```

| 단계 | 하는 일 | 도구 |
|---|---|---|
| ① 입력 | 엑셀에서 실 리스트를 CSV로 저장 | `tools/rooms_csv_to_spec.rb` |
| ② 검사 | SketchUp 없이 오류·경고·면적 확인 | `tools/plan_dump.rb` |
| ③ 생성 | SketchUp에서 메뉴 한 번 | `src/mmgg_automodel` 확장 |
| ④ 반복 | JSON 수정 → 저장 → 자동 재생성 | 메뉴 "JSON 저장 시 자동 갱신" |
| ⑤ 출력 | 장면 PNG + 실면적표 CSV | 메뉴 "장면 PNG + 면적표 내보내기" |

## 2. 설치 (1회)

```bash
./tools/build_rbz.sh          # → dist/mmgg_automodel.rbz
```
SketchUp › **확장 프로그램 › 확장 프로그램 관리자 › 확장 프로그램 설치** › `dist/mmgg_automodel.rbz`.
메뉴 **확장 프로그램 › MMGG 자동 모델링**이 생기면 끝. (SketchUp 2017 이상)

## 3. 쓰는 법

1. `spec/sample.json` 을 복사해 프로젝트 이름으로 저장
2. (선택) 실 리스트 CSV를 반영: `ruby tools/rooms_csv_to_spec.rb 실리스트.csv 내사양.json > 내사양.json.new`
3. 검사: `ruby tools/plan_dump.rb 내사양.json` → `경고 없음` 확인
4. SketchUp › MMGG 자동 모델링 › **JSON 사양으로 생성…** › 파일 선택
5. **JSON 저장 시 자동 갱신** 체크 → 에디터에서 숫자 고치고 저장할 때마다 모델이 바뀜
6. **장면 PNG + 면적표 내보내기** → `내사양_export/` 폴더에 PNG 5장 + `실면적표.csv`

같은 JSON으로 다시 생성하면 이전 결과(그룹·장면·단면)는 자동으로 지워진다. 실행 1회 = 실행 취소 1회.

## 4. 사양 규칙 (mm)

좌표 원점 = 대지 좌하단. X = 폭, Y = 깊이. 실·개구부·문·계단·가구 좌표는 **건물 외곽 좌하단 기준**.

| 키 | 의미 |
|---|---|
| `site {w,d}` | 대지 판 |
| `building {x,y,w,d}` | 건물 외곽 (대지 위 위치) |
| `wall {exterior, interior, door_head}` | 외벽·내벽 두께, 내부 문 높이 |
| `slab`, `roof.parapet` | 슬래브 두께, 파라펫 높이 |
| `levels[]` | `name`, `height`(층고), `copy_from`(앞 층 복사) |
| `rooms[]` | `{name,x,y,w,d}` — **내벽은 실 경계에서 자동 생성**, 실명·면적 라벨 자동 |
| `openings[]` | `{side:S/N/E/W, offset, width, height, sill, type:window/glass/door}`, `repeat {n, step}` |
| `interior_doors[]` | `{x, y, width}` — 내벽 선 위의 점에 문 구멍 |
| `stairs[]` | `{x,y,w,d, dir:+x/-x/+y/-y, type:U/straight, landing}` — 단수는 층고로 자동, 위층 슬래브에 자동 구멍 |
| `furniture[]` | `{name,x,y,w,d,h}`, `repeat {nx,ny,dx,dy}` — 같은 치수는 컴포넌트 1개로 공유 |
| `export` | `scenes`, `plan_cut`(평면 절단 높이), `section_y`, `png_width` |

offset 기준: **S·N 면은 X 방향, E·W 면은 Y 방향**으로 건물 모서리에서 잰다.

### 자동 검사 (생성 전에 막거나 경고)
- 개구부가 벽 밖으로 나감 / 개구부끼리 겹침 / 층 높이 초과 → **오류, 생성 중단**
- 실이 건물 외곽을 벗어남 / 앞 층이 없는 `copy_from` → **오류**
- 내부 문이 어떤 내벽 위에도 없음 → 경고
- 계단 단너비 250mm 미만 → 경고
- 가구끼리, 가구와 벽·계단이 겹침 → 경고

## 5. 생성되는 구조

```
프로젝트 그룹
├─ 1F  (태그 L-1F)  ─ 슬래브 · 외벽 · 내벽 · 유리 · 문 · 계단 · 가구   (각각 태그 A-외벽, A-창호 …)
├─ 2F  (태그 L-2F)
├─ 3F  …
├─ RF  (지붕 슬래브 · 파라펫)
└─ 대지
장면: 01 아이소 · 02~ 평면 nF (윗층 숨김 + 절단) · 단면 A
```
- 벽은 불리언 없이 **조각(기둥·하부·인방)으로 분절** → 항상 솔리드, 겹침 0.
- 내벽 T자·십자 접합: X 방향 벽은 연속, Y 방향 벽을 끊어 겹침 없이 맞댄다.
- 단면 방향이 반대로 보이면: 단면 선택 › 메뉴 **선택한 단면 뒤집기**.

## 6. 경로 B — Claude + SketchUp 연결(Trimble)로 바로 만들기

플러그인 설치 없이 대화로 만들 때: Claude에게 사양 JSON을 주고 "이 사양으로 SketchUp 모델 만들어"라고 하면,
같은 Planner 계산 결과를 Trimble SketchUp 연결로 클라우드 모델에 넣고 `.skp` 다운로드 링크를 준다.
`spec/sample.json` 은 이 경로로 실제 SketchUp에서 생성해 검증했다 (부재 179개, 부재 간 겹침 0).

## 7. 개발

```bash
ruby test/planner_test.rb        # 계산 로직 (겹침·틈·T자 접합·검사 규칙)
ruby test/builder_smoke_test.rb  # SketchUp API 가짜 객체로 생성·재생성·내보내기 경로 실행
```
| 파일 | 역할 |
|---|---|
| `src/mmgg_automodel/planner.rb` | 사양 → 부재 목록 계산. SketchUp 의존 없음 |
| `src/mmgg_automodel/builder.rb` | 부재 목록 → SketchUp 그룹·컴포넌트·태그·재질·장면·내보내기 |
| `src/mmgg_automodel/main.rb` | 메뉴, 자동 갱신 타이머, 빠른 매스 입력창 |

### 아직 안 되는 것
- 사선·곡선 벽, 경사 지붕 (축 정렬 사각형만)
- 창호 프레임·문틀 상세 (유리판·문짝 판만)
- 실제 데스크톱 SketchUp에서의 장면 PNG 결과는 아직 사람 눈으로 확인 전
