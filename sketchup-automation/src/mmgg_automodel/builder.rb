# frozen_string_literal: true
#
# MMGG 자동 모델링 — Builder
# Planner 가 만든 plan 을 SketchUp 형상·태그·재질·장면으로 바꾼다. (SketchUp 2017 이상)

module MMGG
  module AutoModel
    module Builder
      module_function

      DICT = 'mmgg_automodel'

      # 재질: 이름 => [R, G, B, 불투명도(0~1)]
      MATERIALS = {
        'M-대지' => [214, 214, 206, 1.0],
        'M-슬래브' => [188, 188, 184, 1.0],
        'M-외벽' => [236, 233, 226, 1.0],
        'M-내벽' => [250, 250, 248, 1.0],
        'M-유리' => [150, 190, 215, 0.35],
        'M-문' => [120, 92, 70, 1.0],
        'M-계단' => [200, 198, 192, 1.0],
        'M-가구' => [176, 140, 104, 1.0]
      }.freeze

      SECTION_TAG = 'Z-단면'

      # @return [Sketchup::Group] 생성된 최상위 그룹
      def build(model, plan, source_path: nil)
        model.start_operation('MMGG 자동 모델링', true)
        remove_previous(model, source_path) if source_path

        root = model.entities.add_group
        root.name = plan[:project].to_s
        root.set_attribute(DICT, 'root', true)
        root.set_attribute(DICT, 'source', source_path.to_s)

        level_groups = {}
        plan[:levels].each do |lv|
          g = root.entities.add_group
          g.name = lv[:name]
          g.layer = tag(model, lv[:tag])
          level_groups[lv[:name]] = g
        end

        defs = {}
        plan[:items].each do |it|
          parent = level_groups[it[:level]] || root
          ent = if it[:component]
                  defn = defs[it[:component]] ||= component_def(model, it)
                  parent.entities.add_instance(defn, origin(it))
                else
                  box_group(parent.entities, it)
                end
          ent.name = it[:name]
          ent.layer = tag(model, it[:tag])
          ent.material = material(model, it[:material])
        end

        plan[:labels].each do |lb|
          parent = level_groups[lb[:level]] || root
          txt = parent.entities.add_text(lb[:text], Geom::Point3d.new(lb[:x].mm, lb[:y].mm, lb[:z].mm))
          txt.layer = tag(model, lb[:tag])
        end

        page_names = plan[:scenes].empty? ? [] : make_scenes(model, plan, source_path.to_s)
        root.set_attribute(DICT, 'pages', page_names)

        model.commit_operation
        root
      rescue StandardError
        model.abort_operation
        raise
      end

      # 같은 사양 파일로 만든 이전 결과(그룹·장면·단면)를 지운다 → 재생성 루프
      def remove_previous(model, source_path)
        olds = model.entities.grep(Sketchup::Group).select do |g|
          g.get_attribute(DICT, 'root') && g.get_attribute(DICT, 'source') == source_path.to_s
        end
        olds.each do |g|
          Array(g.get_attribute(DICT, 'pages')).each do |pn|
            pg = model.pages[pn]
            model.pages.erase(pg) if pg
          end
        end
        planes = model.entities.grep(Sketchup::SectionPlane).select do |sp|
          sp.get_attribute(DICT, 'source') == source_path.to_s
        end
        model.entities.erase_entities(olds + planes) unless (olds + planes).empty?
      end

      # ------------------------------------------------------------------
      def box_group(entities, it)
        g = entities.add_group
        draw_box(g.entities, it[:w], it[:d], it[:h],
                 it[:holes].map { |r| { x: r[:x] - it[:x], y: r[:y] - it[:y], w: r[:w], d: r[:d] } })
        g.transformation = origin(it)
        g
      end

      def component_def(model, it)
        name = it[:component]
        defn = model.definitions[name]
        return defn if defn && defn.entities.size.positive?

        defn ||= model.definitions.add(name)
        draw_box(defn.entities, it[:w], it[:d], it[:h], [])
        defn
      end

      # 원점(0,0,0)에서 w×d 바닥면을 그리고(구멍은 내부 루프) h 만큼 밀어 올린다
      def draw_box(ents, w, d, h, holes)
        face = ents.add_face(rect_pts(0, 0, w, d))
        holes.each do |r|
          inner = ents.add_face(rect_pts(r[:x], r[:y], r[:w], r[:d]))
          inner.erase! if inner&.valid?
        end
        face = ents.grep(Sketchup::Face).max_by(&:area) unless face&.valid?
        face.reverse! if face.normal.z.negative?
        face.pushpull(h.mm)
      end

      def rect_pts(x, y, w, d)
        [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].map { |px, py| Geom::Point3d.new(px.mm, py.mm, 0) }
      end

      def origin(it)
        Geom::Transformation.translation(Geom::Vector3d.new(it[:x].mm, it[:y].mm, it[:z].mm))
      end

      def tag(model, name)
        model.layers[name] || model.layers.add(name)
      end

      def material(model, name)
        m = model.materials[name]
        return m if m

        r, g, b, a = MATERIALS.fetch(name, [200, 200, 200, 1.0])
        m = model.materials.add(name)
        m.color = Sketchup::Color.new(r, g, b)
        m.alpha = a
        m
      end

      # ------------------------------------------------------------------
      # 장면
      # ------------------------------------------------------------------
      # 단면 방향: SketchUp 은 단면 법선(화살표)의 "반대쪽"을 남긴다.
      # 버전에 따라 반대로 보이면 메뉴의 "선택한 단면 뒤집기"를 쓰거나 아래 부호를 바꾼다.
      PLAN_NORMAL = [0, 0, 1].freeze     # 절단 높이 위쪽 제거
      SECTION_NORMAL = [0, -1, 0].freeze # 절단선 남쪽 제거, 남쪽에서 북쪽을 본다

      def make_scenes(model, plan, src_path)
        view = model.active_view
        opts = model.options['PageOptions']
        opts['ShowTransition'] = false if opts
        model.rendering_options['DisplaySectionPlanes'] = false
        sec_tag = tag(model, SECTION_TAG)
        b = plan[:bounds]
        cx = b[:w] / 2.0
        cy = b[:d] / 2.0
        names = []

        plan[:scenes].each do |sc|
          model.layers.each { |l| l.visible = true }
          Array(sc[:hide_tags]).each { |t| (l = model.layers[t]) && (l.visible = false) }
          deactivate_sections(model)

          case sc[:type]
          when 'iso'
            diag = Math.sqrt(b[:w]**2 + b[:d]**2)
            set_camera(view, [cx - diag, cy - diag * 1.1, b[:h] + diag * 0.9], [cx, cy, b[:h] * 0.35], [0, 0, 1], true)
          when 'plan'
            sp = section(model, [0, 0, sc[:cut_z]], PLAN_NORMAL, sc[:name], sec_tag, src_path)
            sp.activate
            set_camera(view, [cx, cy, sc[:cut_z] + 50_000], [cx, cy, 0], [0, 1, 0], false)
          when 'section'
            sp = section(model, [0, sc[:cut_y], 0], SECTION_NORMAL, sc[:name], sec_tag, src_path)
            sp.activate
            set_camera(view, [cx, sc[:cut_y] - 60_000, b[:h] / 2.0], [cx, sc[:cut_y], b[:h] / 2.0], [0, 0, 1], false)
          end
          view.zoom_extents
          page = model.pages.add(sc[:name])
          page.use_section_planes = true if page.respond_to?(:use_section_planes=)
          page.use_hidden_layers = true if page.respond_to?(:use_hidden_layers=)
          names << sc[:name]
        end

        model.layers.each { |l| l.visible = true }
        model.pages.selected_page = model.pages[names.first] if names.any?
        names
      end

      def section(model, pt, normal, name, sec_tag, src_path)
        sp = model.entities.add_section_plane(Geom::Point3d.new(*pt.map(&:mm)), Geom::Vector3d.new(*normal))
        sp.name = name if sp.respond_to?(:name=)
        sp.layer = sec_tag
        sp.set_attribute(DICT, 'source', src_path.to_s)
        sp
      end

      def deactivate_sections(model)
        if model.entities.respond_to?(:active_section_plane=)
          model.entities.active_section_plane = nil
        end
      end

      def set_camera(view, eye, target, up, perspective)
        cam = Sketchup::Camera.new(Geom::Point3d.new(*eye.map(&:mm)), Geom::Point3d.new(*target.map(&:mm)),
                                   Geom::Vector3d.new(*up))
        cam.perspective = perspective
        view.camera = cam
      end

      # ------------------------------------------------------------------
      # 내보내기: 장면별 PNG + 실 면적표 CSV
      # ------------------------------------------------------------------
      def export(model, plan, dir, width: 2400)
        Dir.mkdir(dir) unless File.directory?(dir)
        view = model.active_view
        files = []
        Array(plan[:scenes]).each do |sc|
          page = model.pages[sc[:name]] or next
          model.pages.selected_page = page
          view.refresh
          path = File.join(dir, "#{sc[:name]}.png")
          view.write_image(filename: path, width: width, height: (width * 0.625).round, antialias: true,
                           transparent: false)
          files << path
        end
        csv = File.join(dir, '실면적표.csv')
        File.open(csv, 'w:UTF-8') do |f|
          f.write("﻿") # 엑셀 한글 깨짐 방지
          f.puts '층,실명,가로(mm),세로(mm),면적(㎡)'
          plan[:rooms].each { |r| f.puts [r[:level], r[:name], r[:w].round, r[:d].round, r[:area_m2]].join(',') }
          plan[:rooms].group_by { |r| r[:level] }.each do |lv, rs|
            f.puts [lv, '소계', '', '', rs.sum { |r| r[:area_m2] }.round(2)].join(',')
          end
        end
        files << csv
      end
    end
  end
end
