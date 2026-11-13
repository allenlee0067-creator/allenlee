# frozen_string_literal: true
# MMGG 자동 모델링 — 메뉴 / 툴바 / 자동 갱신
require 'json'
require_relative 'planner'
require_relative 'builder'

module MMGG
  module AutoModel
    @last_path = nil
    @watch_timer = nil
    @watch_mtime = nil

    class << self
      attr_reader :last_path

      # 1) JSON 사양 → 모델
      def generate_from_file(path = nil)
        path ||= UI.openpanel('사양 JSON 선택', @last_path ? File.dirname(@last_path) : '', 'JSON|*.json||')
        return unless path

        @last_path = path
        plan = Planner.plan(JSON.parse(File.read(path, encoding: 'UTF-8')))
        Builder.build(Sketchup.active_model, plan, source_path: path)
        Sketchup.status_text = "MMGG: #{File.basename(path)} — 부재 #{plan[:items].size}개 생성"
        report(plan)
        plan
      rescue SpecError, JSON::ParserError => e
        UI.messagebox("사양 오류\n\n#{e.message}")
        nil
      end

      # 2) 같은 파일로 다시 생성 (이전 결과 자동 삭제)
      def regenerate
        return generate_from_file unless @last_path && File.exist?(@last_path)

        generate_from_file(@last_path)
      end

      # 3) JSON 저장 감시 → 저장할 때마다 재생성
      def toggle_watch
        if @watch_timer
          UI.stop_timer(@watch_timer)
          @watch_timer = nil
          Sketchup.status_text = 'MMGG: 자동 갱신 끔'
          return
        end
        generate_from_file unless @last_path
        return unless @last_path

        @watch_mtime = File.mtime(@last_path)
        @watch_timer = UI.start_timer(1.5, true) do
          begin
            m = File.mtime(@last_path)
            if m != @watch_mtime
              @watch_mtime = m
              generate_from_file(@last_path)
            end
          rescue StandardError => e
            Sketchup.status_text = "MMGG 자동 갱신 오류: #{e.message}"
          end
        end
        Sketchup.status_text = "MMGG: #{File.basename(@last_path)} 저장 감시 중"
      end

      def watching?
        !@watch_timer.nil?
      end

      # 4) 장면 PNG + 실면적표 CSV
      def export
        return UI.messagebox('먼저 JSON 사양으로 모델을 생성하세요.') unless @last_path

        plan = Planner.plan(JSON.parse(File.read(@last_path, encoding: 'UTF-8')))
        dir = File.join(File.dirname(@last_path), "#{File.basename(@last_path, '.json')}_export")
        files = Builder.export(Sketchup.active_model, plan, dir, width: plan_width(@last_path))
        UI.messagebox("#{files.size}개 파일을 저장했습니다.\n#{dir}")
      end

      # 5) 빠른 매스: 입력창 4칸
      def quick_mass
        prompts = ['폭 W (mm)', '깊이 D (mm)', '층수', '층고 (mm)']
        res = UI.inputbox(prompts, [12_000, 9_000, 4, 3_600], 'MMGG 빠른 매스') or return
        w, d, n, h = res.map(&:to_f)
        spec = {
          'project' => "매스 #{w.round}x#{d.round} #{n.to_i}층",
          'building' => { 'x' => 0, 'y' => 0, 'w' => w, 'd' => d },
          'levels' => Array.new(n.to_i) do |i|
            { 'name' => "#{i + 1}F", 'height' => h,
              'rooms' => [{ 'name' => "#{i + 1}F", 'x' => 0, 'y' => 0, 'w' => w, 'd' => d }] }
          end,
          'export' => { 'scenes' => false }
        }
        Builder.build(Sketchup.active_model, Planner.plan(spec))
      rescue SpecError => e
        UI.messagebox("입력 오류\n\n#{e.message}")
      end

      # 단면 방향이 반대로 보일 때
      def flip_selected_sections
        sel = Sketchup.active_model.selection.grep(Sketchup::SectionPlane)
        return UI.messagebox('뒤집을 단면을 선택하세요.') if sel.empty?

        sel.each do |sp|
          a, b, c, d = sp.get_plane
          sp.set_plane([-a, -b, -c, -d])
        end
      end

      def report(plan)
        return if plan[:warnings].empty?

        puts "[MMGG] 경고 #{plan[:warnings].size}개"
        plan[:warnings].each { |w| puts "  - #{w}" }
        Sketchup.status_text += " · 경고 #{plan[:warnings].size}개 (루비 콘솔 확인)"
      end

      def plan_width(path)
        JSON.parse(File.read(path, encoding: 'UTF-8')).dig('export', 'png_width') || 2400
      end
    end

    unless file_loaded?(__FILE__)
      menu = UI.menu('Extensions').add_submenu('MMGG 자동 모델링')
      menu.add_item('JSON 사양으로 생성…') { generate_from_file }
      menu.add_item('다시 생성 (수정 반영)') { regenerate }
      item = menu.add_item('JSON 저장 시 자동 갱신') { toggle_watch }
      menu.set_validation_proc(item) { watching? ? MF_CHECKED : MF_UNCHECKED }
      menu.add_separator
      menu.add_item('장면 PNG + 면적표 내보내기') { export }
      menu.add_item('빠른 매스…') { quick_mass }
      menu.add_separator
      menu.add_item('선택한 단면 뒤집기') { flip_selected_sections }

      file_loaded(__FILE__)
    end
  end
end
