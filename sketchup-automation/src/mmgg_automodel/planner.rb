# frozen_string_literal: true
#
# MMGG 자동 모델링 — Planner
#
# 치수 사양(JSON 해시)을 받아 "무엇을 어디에 몇 mm로 만들지"만 계산한다.
# SketchUp API를 전혀 쓰지 않으므로 SketchUp 밖에서도(plain ruby) 테스트할 수 있다.
# 실제 형상 생성은 builder.rb 가 이 결과(plan)를 받아서 한다.
#
# 좌표계 (모두 mm)
#   X = 건물 폭(W), Y = 건물 깊이(D), Z = 높이. 원점 = 대지 좌하단.
#   rooms / openings / doors / furniture / stairs 좌표는 건물 외곽 좌하단 기준.
#   외벽은 건물 외곽선 안쪽으로 두께만큼 들어온다.
#   개구부 offset: S·N 면은 X 방향, E·W 면은 Y 방향으로 건물 모서리에서 잰다.

module MMGG
  module AutoModel
    class SpecError < StandardError; end

    module Planner
      module_function

      DEFAULTS = {
        'wall' => { 'exterior' => 300, 'interior' => 150, 'door_head' => 2100 },
        'slab' => 250,
        'roof' => { 'parapet' => 1000 },
        'export' => { 'scenes' => true, 'plan_cut' => 1200, 'png_width' => 2400 }
      }.freeze

      MIN_STAIR_RISE = 150
      MAX_STAIR_RISE = 200

      # ------------------------------------------------------------------
      # 진입점
      # ------------------------------------------------------------------
      # @return [Hash] { items:, labels:, rooms:, scenes:, levels:, bounds:, warnings: }
      def plan(spec)
        spec = normalize(spec)
        b = spec['building']
        t_ext = spec['wall']['exterior']
        t_int = spec['wall']['interior']
        slab = spec['slab']

        items = []
        labels = []
        rooms_out = []
        level_info = []
        warnings = []

        # 대지
        if spec['site']
          s = spec['site']
          items << box('대지', 'site', 'SITE', 'M-대지', 0, 0, -100, s['w'], s['d'], 100)
        end

        z = 0
        spec['levels'].each_with_index do |lv, li|
          name = lv['name']
          h = lv['height']
          tag = "L-#{name}"
          ox = b['x']
          oy = b['y']

          # 바닥 슬래브 (아래층 계단 자리는 구멍)
          holes = []
          if li.positive?
            spec['levels'][li - 1]['stairs'].each do |st|
              holes << rect(ox + st['x'], oy + st['y'], st['w'], st['d'])
            end
          end
          items << box("#{name} 슬래브", 'slab', name, 'M-슬래브',
                       ox, oy, z, b['w'], b['d'], slab, level: name, holes: holes)

          wall_z = z + slab
          wall_h = h - slab

          # 외벽 (개구부로 분절)
          ext_segments(b, t_ext).each do |seg|
            ops = lv['openings'].select { |o| o['side'] == seg[:side] }.map do |o|
              { from: o['offset'], to: o['offset'] + o['width'], sill: o['sill'],
                head: o['sill'] + o['height'], type: o['type'] }
            end
            check_openings!(ops, seg, wall_h, "#{name} #{seg[:side]}면", warnings)
            items.concat(segment_items(seg, ops, ox, oy, wall_z, wall_h, t_ext,
                                       "#{name} 외벽#{seg[:side]}", 'wall_ext', name))
          end

          # 내벽 (실 경계선에서 자동 추출, 문 위치 절단)
          int_lines(lv['rooms'], b, t_ext, t_int).each_with_index do |seg, wi|
            ops = []
            lv['interior_doors'].each do |d|
              on = seg[:axis] == :x ? (d['y'] - seg[:coord]).abs < 1 : (d['x'] - seg[:coord]).abs < 1
              next unless on

              c = seg[:axis] == :x ? d['x'] : d['y']
              next unless c > seg[:from] && c < seg[:to]

              ops << { from: c - d['width'] / 2.0, to: c + d['width'] / 2.0, sill: 0,
                       head: spec['wall']['door_head'], type: 'opening' }
            end
            check_openings!(ops, seg, wall_h, "#{name} 내벽#{wi + 1}", warnings)
            items.concat(segment_items(seg, ops, ox, oy, wall_z, wall_h, t_int,
                                       "#{name} 내벽#{wi + 1}", 'wall_int', name))
          end
          lv['interior_doors'].each do |d|
            hit = int_lines(lv['rooms'], b, t_ext, t_int).any? do |seg|
              c = seg[:axis] == :x ? d['x'] : d['y']
              on = seg[:axis] == :x ? (d['y'] - seg[:coord]).abs < 1 : (d['x'] - seg[:coord]).abs < 1
              on && c > seg[:from] && c < seg[:to]
            end
            warnings << "#{name}: 내부 문 (#{d['x']}, #{d['y']}) 이 어떤 내벽 위에도 없음" unless hit
          end

          # 계단
          lv['stairs'].each_with_index do |st, si|
            items.concat(stair_items(st, ox, oy, wall_z, h, "#{name} 계단#{si + 1}", name, warnings))
          end

          # 가구
          lv['furniture'].each do |f|
            expand_repeat(f).each_with_index do |(fx, fy), fi|
              items << box("#{f['name']}#{fi + 1}", 'furniture', name, f['material'] || 'M-가구',
                           ox + fx, oy + fy, wall_z, f['w'], f['d'], f['h'],
                           level: name, component: "#{f['name']}_#{f['w']}x#{f['d']}x#{f['h']}")
            end
          end

          # 가구 충돌 검사 (가구끼리, 가구와 벽·계단)
          mine = items.select { |i| i[:level] == name }
          furn = mine.select { |i| i[:kind] == 'furniture' }
          solid = mine.select { |i| %w[wall_ext wall_int stair].include?(i[:kind]) }
          furn.each_with_index do |f, fi|
            (furn[(fi + 1)..] + solid).each do |o|
              warnings << "#{name}: '#{f[:name]}' 이(가) '#{o[:name]}' 과(와) 겹침" if overlap?(f, o)
            end
          end

          # 실 라벨 · 면적
          lv['rooms'].each do |r|
            area = (r['w'] * r['d']) / 1_000_000.0
            rooms_out << { level: name, name: r['name'], area_m2: area.round(2),
                           x: r['x'], y: r['y'], w: r['w'], d: r['d'] }
            labels << { text: "#{r['name']}\n#{format('%.1f', area)}㎡", level: name, tag: 'A-실명',
                        x: ox + r['x'] + r['w'] / 2.0, y: oy + r['y'] + r['d'] / 2.0, z: wall_z }
          end

          level_info << { name: name, z: z, height: h, tag: tag }
          z += h
        end

        # 지붕 슬래브 + 파라펫
        top = spec['levels'].last
        roof_holes = top['stairs'].map { |st| rect(b['x'] + st['x'], b['y'] + st['y'], st['w'], st['d']) }
        items << box('지붕 슬래브', 'slab', 'RF', 'M-슬래브', b['x'], b['y'], z, b['w'], b['d'], slab,
                     level: 'RF', holes: roof_holes)
        par = spec['roof']['parapet'].to_f
        if par.positive?
          ext_segments(b, t_ext).each do |seg|
            items.concat(segment_items(seg, [], b['x'], b['y'], z + slab, par, t_ext,
                                       "파라펫#{seg[:side]}", 'parapet', 'RF'))
          end
        end
        level_info << { name: 'RF', z: z, height: slab + par, tag: 'L-RF' }

        {
          project: spec['project'],
          items: items,
          labels: labels,
          rooms: rooms_out,
          levels: level_info,
          scenes: scenes(spec, level_info),
          bounds: { w: (spec['site'] || b)['w'], d: (spec['site'] || b)['d'], h: z + slab + par },
          warnings: warnings
        }
      end

      # ------------------------------------------------------------------
      # 사양 정리 / 검증
      # ------------------------------------------------------------------
      def normalize(raw)
        raise SpecError, '사양이 비어 있음' unless raw.is_a?(Hash)

        spec = deep_merge(DEFAULTS, raw)
        spec['slab'] = spec['slab'].to_f
        b = spec['building'] or raise SpecError, 'building { x, y, w, d } 가 필요함'
        %w[x y w d].each { |k| b[k] = num!(b[k], "building.#{k}") }
        levels = spec['levels']
        raise SpecError, 'levels 가 1개 이상 필요함' unless levels.is_a?(Array) && !levels.empty?

        by_name = {}
        spec['levels'] = levels.map.with_index do |lv, i|
          lv = lv.dup
          lv['name'] ||= "#{i + 1}F"
          if lv['copy_from']
            src = by_name[lv['copy_from']] or raise SpecError, "#{lv['name']}: copy_from '#{lv['copy_from']}' 를 앞 층에서 찾을 수 없음"
            %w[rooms openings interior_doors stairs furniture].each do |k|
              lv[k] = deep_copy(src[k]) unless lv.key?(k)
            end
          end
          lv['height'] = num!(lv['height'], "#{lv['name']}.height")
          raise SpecError, "#{lv['name']}: 층고가 슬래브보다 작음" if lv['height'] <= spec['slab']

          %w[rooms openings interior_doors stairs furniture].each { |k| lv[k] ||= [] }
          lv['openings'] = lv['openings'].flat_map { |o| expand_opening(o) }
          lv['rooms'].each do |r|
            %w[x y w d].each { |k| r[k] = num!(r[k], "#{lv['name']}.rooms.#{r['name']}.#{k}") }
            if r['x'] < -0.5 || r['y'] < -0.5 || r['x'] + r['w'] > b['w'] + 0.5 || r['y'] + r['d'] > b['d'] + 0.5
              raise SpecError, "#{lv['name']}: 실 '#{r['name']}' 이 건물 외곽을 벗어남"
            end
          end
          by_name[lv['name']] = lv
          lv
        end
        spec
      end

      def expand_opening(o)
        o = o.dup
        o['side'] = o['side'].to_s.upcase
        raise SpecError, "개구부 side 는 S/N/E/W 중 하나: #{o['side']}" unless %w[S N E W].include?(o['side'])

        %w[offset width height].each { |k| o[k] = num!(o[k], "opening.#{k}") }
        o['sill'] = (o['sill'] || 0).to_f
        o['type'] ||= 'window'
        rep = o.delete('repeat')
        return [o] unless rep

        Array.new(rep['n'].to_i) { |i| o.merge('offset' => o['offset'] + i * rep['step'].to_f) }
      end

      def expand_repeat(f)
        rep = f['repeat']
        return [[f['x'], f['y']]] unless rep

        pts = []
        rep.fetch('ny', 1).times do |j|
          rep.fetch('nx', 1).times do |i|
            pts << [f['x'] + i * rep.fetch('dx', 0), f['y'] + j * rep.fetch('dy', 0)]
          end
        end
        pts
      end

      def check_openings!(ops, seg, wall_h, where, warnings)
        sorted = ops.sort_by { |o| o[:from] }
        sorted.each_with_index do |o, i|
          raise SpecError, "#{where}: 개구부 폭이 0 이하" if o[:to] <= o[:from]
          if o[:from] < seg[:from] - 0.5 || o[:to] > seg[:to] + 0.5
            raise SpecError, "#{where}: 개구부(#{o[:from]}~#{o[:to]})가 벽 범위(#{seg[:from]}~#{seg[:to]})를 벗어남"
          end
          raise SpecError, "#{where}: 개구부 높이가 층 벽 높이(#{wall_h})를 넘음" if o[:head] > wall_h + 0.5
          if i.positive? && o[:from] < sorted[i - 1][:to] - 0.5
            raise SpecError, "#{where}: 개구부가 서로 겹침 (#{sorted[i - 1][:from]}~#{sorted[i - 1][:to]} / #{o[:from]}~#{o[:to]})"
          end
          warnings << "#{where}: 개구부 위 인방이 50mm 미만" if wall_h - o[:head] > 0.5 && wall_h - o[:head] < 50
        end
      end

      # ------------------------------------------------------------------
      # 벽 세그먼트
      # ------------------------------------------------------------------
      # 외벽 4면. 모서리는 S·N 벽이 끝까지 가고, E·W 벽은 그 사이에 끼운다(겹침 없음).
      # axis :x  → 벽이 X 방향으로 뻗음. coord = 벽 안쪽/바깥 기준선의 Y (벽 최소 Y).
      def ext_segments(b, t)
        w = b['w']
        d = b['d']
        [
          { side: 'S', axis: :x, coord: 0, from: 0, to: w, min_edge: true },
          { side: 'N', axis: :x, coord: d - t, from: 0, to: w, min_edge: true },
          { side: 'W', axis: :y, coord: 0, from: t, to: d - t, min_edge: true },
          { side: 'E', axis: :y, coord: w - t, from: t, to: d - t, min_edge: true }
        ]
      end

      # 실 사각형 경계선 → 내벽 중심선. 외벽선 위의 선은 버리고, 같은 선 위 구간은 합친다.
      # 교차부는 X 방향 벽을 연속으로 두고 Y 방향 벽을 끊어 겹침을 없앤다.
      def int_lines(rooms, b, t_ext, t_int)
        xs = Hash.new { |h, k| h[k] = [] } # y좌표 → [[x0,x1]...]
        ys = Hash.new { |h, k| h[k] = [] } # x좌표 → [[y0,y1]...]
        rooms.each do |r|
          x0 = r['x']
          y0 = r['y']
          x1 = x0 + r['w']
          y1 = y0 + r['d']
          [y0, y1].each { |y| xs[y.round] << [x0, x1] unless y <= 0.5 || y >= b['d'] - 0.5 }
          [x0, x1].each { |x| ys[x.round] << [y0, y1] unless x <= 0.5 || x >= b['w'] - 0.5 }
        end
        half = t_int / 2.0
        horiz = xs.flat_map do |y, ivs|
          merge(ivs).map do |a, z|
            # 끝이 외벽에 닿지 않으면 반 두께만큼 늘려 직교 벽의 끊긴 자리를 메운다 (T자 접합)
            lo = a <= t_ext + 0.5 ? t_ext : a - half
            hi = z >= b['w'] - t_ext - 0.5 ? b['w'] - t_ext : z + half
            { axis: :x, coord: y, from: [lo, t_ext].max, to: [hi, b['w'] - t_ext].min, min_edge: false }
          end
        end
        vert = ys.flat_map do |x, ivs|
          merge(ivs).flat_map do |a, z|
            lo = [a, t_ext].max
            hi = [z, b['d'] - t_ext].min
            cuts = horiz.select { |h| x > h[:from] - 0.5 && x < h[:to] + 0.5 }
                        .map { |h| [h[:coord] - half, h[:coord] + half] }
            subtract([[lo, hi]], cuts).map do |p, q|
              { axis: :y, coord: x, from: p, to: q, min_edge: false }
            end
          end
        end
        (horiz + vert).reject { |s| s[:to] - s[:from] < 1 }
                      .sort_by { |s| [s[:axis] == :x ? 0 : 1, s[:coord], s[:from]] }
      end

      def merge(ivs)
        ivs.map { |a, z| [[a, z].min, [a, z].max] }.sort.each_with_object([]) do |(a, z), out|
          if out.any? && a <= out.last[1] + 0.5
            out.last[1] = [out.last[1], z].max
          else
            out << [a, z]
          end
        end
      end

      def subtract(ivs, cuts)
        cuts.sort.reduce(ivs) do |acc, (c0, c1)|
          acc.flat_map do |a, z|
            next [[a, z]] if c1 <= a || c0 >= z

            [[a, c0], [c1, z]].select { |p, q| q - p > 0.5 }
          end
        end
      end

      # 벽 하나를 개구부로 쪼갠 박스들 + 유리/문 판 (불리언 연산 없이 조각으로 구성)
      def segment_items(seg, ops, ox, oy, z, h, t, name, kind, level)
        out = []
        mat = kind == 'wall_int' ? 'M-내벽' : 'M-외벽'
        base = seg[:min_edge] ? seg[:coord] : seg[:coord] - t / 2.0 # 벽 두께 방향 최소 좌표
        # a = 벽 길이 방향 시작, len = 길이, off/th = 두께 방향 위치/두께
        put = lambda do |nm, kd, mt, a, len, zz, hh, off, th|
          next if len < 0.5 || hh < 0.5

          if seg[:axis] == :x
            out << box(nm, kd, level, mt, ox + a, oy + base + off, zz, len, th, hh)
          else
            out << box(nm, kd, level, mt, ox + base + off, oy + a, zz, th, len, hh)
          end
        end
        cur = seg[:from]
        n = 0
        ops.sort_by { |o| o[:from] }.each do |o|
          n += 1
          len = o[:to] - o[:from]
          put.call("#{name}-#{n}", kind, mat, cur, o[:from] - cur, z, h, 0, t)
          put.call("#{name}-하부#{n}", kind, mat, o[:from], len, z, o[:sill], 0, t)
          put.call("#{name}-인방#{n}", kind, mat, o[:from], len, z + o[:head], h - o[:head], 0, t)
          oh = o[:head] - o[:sill]
          case o[:type]
          when 'window', 'glass' # 벽 두께 중앙 20mm 유리판
            put.call("#{name}-유리#{n}", 'glass', 'M-유리', o[:from], len, z + o[:sill], oh, t / 2.0 - 10, 20)
          when 'door' # 벽 두께 중앙 40mm 문짝
            put.call("#{name}-문#{n}", 'door', 'M-문', o[:from], len, z + o[:sill], oh, t / 2.0 - 20, 40)
          end
          cur = o[:to]
        end
        put.call("#{name}-#{n + 1}", kind, mat, cur, seg[:to] - cur, z, h, 0, t)
        out
      end

      # ------------------------------------------------------------------
      # 계단: 단높이 200 이하가 되도록 단수를 층고로 자동 결정
      #   type "U"(기본): 두 흐름 + 중간 참. 같은 자리에 층마다 쌓을 수 있다.
      #   type "straight": 한 흐름.
      #   dir: 첫 흐름이 올라가는 방향 (+x / -x / +y / -y)
      # ------------------------------------------------------------------
      def stair_items(st, ox, oy, z, floor_h, name, level, warnings)
        dir = (st['dir'] || '+x').to_s
        along_x = dir.end_with?('x')
        neg = dir.start_with?('-')
        run = along_x ? st['w'].to_f : st['d'].to_f    # 진행 방향 길이
        width = along_x ? st['d'].to_f : st['w'].to_f  # 폭 방향 길이
        n = (floor_h / MAX_STAIR_RISE.to_f).ceil
        rise = floor_h / n
        out = []
        # (a: 진행 방향 위치, b: 폭 방향 위치, la, lb, 높이) → 월드 박스
        put = lambda do |nm, a, b, la, lb, hh|
          a = run - a - la if neg
          if along_x
            out << box(nm, 'stair', level, 'M-계단', ox + st['x'] + a, oy + st['y'] + b, z, la, lb, hh)
          else
            out << box(nm, 'stair', level, 'M-계단', ox + st['x'] + b, oy + st['y'] + a, z, lb, la, hh)
          end
        end

        if (st['type'] || 'U').to_s.casecmp('straight').zero?
          tread = run / n
          n.times { |i| put.call("#{name}-#{i + 1}", i * tread, 0, tread, width, rise * (i + 1)) }
        else
          landing = (st['landing'] || width / 2.0).to_f
          flight = run - landing
          raise SpecError, "#{name}: 계단 길이가 참(#{landing.round})보다 짧음" if flight <= 0

          n1 = (n / 2.0).ceil
          n2 = n - n1
          lane = width / 2.0
          tread = flight / n1
          n1.times { |i| put.call("#{name}-#{i + 1}", i * tread, 0, tread, lane, rise * (i + 1)) }
          put.call("#{name}-참", flight, 0, landing, width, rise * n1)
          t2 = flight / [n2, 1].max
          n2.times do |i|
            put.call("#{name}-#{n1 + i + 1}", flight - (i + 1) * t2, lane, t2, lane, rise * (n1 + i + 1))
          end
          tread = [tread, t2].min
        end
        warnings << "#{name}: 단너비 #{tread.round}mm (권장 250 이상) — 계단실을 늘리세요" if tread < 250
        out
      end

      # ------------------------------------------------------------------
      # 장면: 아이소, 층별 평면(절단 높이), 단면
      # ------------------------------------------------------------------
      def scenes(spec, levels)
        ex = spec['export']
        return [] unless ex['scenes']

        out = [{ name: '01 아이소', type: 'iso' }]
        levels.reject { |l| l[:name] == 'RF' }.each_with_index do |l, i|
          above = levels[(i + 1)..].map { |x| x[:tag] }
          out << { name: format('%02d 평면 %s', i + 2, l[:name]), type: 'plan',
                   cut_z: l[:z] + spec['slab'] + ex['plan_cut'], hide_tags: above }
        end
        sy = ex['section_y'] || spec['building']['d'] / 2.0
        out << { name: format('%02d 단면 A', out.size + 1), type: 'section',
                 cut_y: spec['building']['y'] + sy, hide_tags: ['A-대지'] }
        out
      end

      # ------------------------------------------------------------------
      # 공통
      # ------------------------------------------------------------------
      CATEGORY_TAG = {
        'site' => 'A-대지', 'slab' => 'A-슬래브', 'wall_ext' => 'A-외벽', 'parapet' => 'A-외벽',
        'wall_int' => 'A-내벽', 'glass' => 'A-창호', 'door' => 'A-창호', 'stair' => 'A-계단',
        'furniture' => 'A-가구'
      }.freeze

      # tag = 분류 태그(A-…). 층 태그(L-1F…)는 builder 가 층 그룹에 붙인다.
      def box(name, kind, level, material, x, y, z, w, d, h, holes: [], component: nil, **_)
        { name: name, kind: kind, level: level, material: material, tag: CATEGORY_TAG.fetch(kind),
          x: x.to_f, y: y.to_f, z: z.to_f, w: w.to_f, d: d.to_f, h: h.to_f,
          holes: holes, component: component }
      end

      def overlap?(a, b)
        %i[x y z].zip(%i[w d h]).all? { |p, sz| a[p] < b[p] + b[sz] - 0.5 && b[p] < a[p] + a[sz] - 0.5 }
      end

      def rect(x, y, w, d)
        { x: x.to_f, y: y.to_f, w: w.to_f, d: d.to_f }
      end

      def num!(v, where)
        raise SpecError, "#{where} 값이 없음" if v.nil?

        Float(v)
      rescue ArgumentError, TypeError
        raise SpecError, "#{where} 가 숫자가 아님: #{v.inspect}"
      end

      def deep_merge(a, b)
        a.merge(b) { |_, x, y| x.is_a?(Hash) && y.is_a?(Hash) ? deep_merge(x, y) : y }
      end

      def deep_copy(o)
        Marshal.load(Marshal.dump(o))
      end
    end
  end
end
