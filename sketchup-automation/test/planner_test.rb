# frozen_string_literal: true
# ruby test/planner_test.rb  (SketchUp 불필요)
require 'minitest/autorun'
require 'json'
require_relative '../src/mmgg_automodel/planner'

class PlannerTest < Minitest::Test
  P = MMGG::AutoModel::Planner
  SAMPLE = JSON.parse(File.read(File.join(__dir__, '..', 'spec', 'sample.json'), encoding: 'UTF-8'))

  def plan(spec = SAMPLE) = P.plan(Marshal.load(Marshal.dump(spec)))

  def overlap?(a, b)
    %i[x y z].zip(%i[w d h]).all? { |p, s| a[p] < b[p] + b[s] - 0.5 && b[p] < a[p] + a[s] - 0.5 }
  end

  def test_solid_parts_never_overlap
    solid = plan[:items].select { |i| %w[slab wall_ext wall_int parapet].include?(i[:kind]) }
    bad = solid.combination(2).select { |a, b| overlap?(a, b) }.map { |a, b| [a[:name], b[:name]] }
    assert_empty bad
  end

  def test_walls_enclose_footprint_without_gaps
    # 1F 벽 높이 중간에서 외벽 둘레를 100mm 간격으로 찍어 모두 벽(또는 유리/문)에 걸리는지
    p = plan
    b = SAMPLE['building']
    z = 250 + 3500 # 1F 슬래브 위, 개구부 위 인방 높이
    probes = (0..b['w']).step(100).flat_map { |x| [[b['x'] + x, b['y'] + 150], [b['x'] + x, b['y'] + b['d'] - 150]] }
    hits = probes.reject do |px, py|
      p[:items].any? { |i| i[:level] == '1F' && px.between?(i[:x], i[:x] + i[:w]) && py.between?(i[:y], i[:y] + i[:d]) && z.between?(i[:z], i[:z] + i[:h]) }
    end
    assert_empty hits
  end

  def test_t_junction_is_filled
    # 1F x=8000 내벽과 y=3000 내벽의 교차점 바로 옆(7950,3000)이 비어 있지 않아야 한다
    p = plan
    b = SAMPLE['building']
    pt = [b["x"] + 7950, b['y'] + 3000, 1000]
    hit = p[:items].any? do |i|
      i[:kind] == 'wall_int' && i[:level] == '1F' &&
        pt[0].between?(i[:x], i[:x] + i[:w]) && pt[1].between?(i[:y], i[:y] + i[:d]) && pt[2].between?(i[:z], i[:z] + i[:h])
    end
    assert hit
  end

  def test_copy_from_and_stair_hole
    p = plan
    assert_equal 3, p[:rooms].count { |r| r[:level] == '3F' }
    slab3 = p[:items].find { |i| i[:name] == '3F 슬래브' }
    assert_equal 1, slab3[:holes].size, '2F 계단 위 3F 슬래브에 구멍'
    roof = p[:items].find { |i| i[:name] == '지붕 슬래브' }
    assert_empty roof[:holes]
  end

  def test_repeat_expands
    p = plan
    assert_equal 9, p[:items].count { |i| i[:name].start_with?('카페테이블') }
    assert_equal 5, p[:items].count { |i| i[:kind] == 'glass' && i[:level] == '2F' }
  end

  def test_bad_opening_is_rejected
    s = Marshal.load(Marshal.dump(SAMPLE))
    s['levels'][0]['openings'] << { 'side' => 'S', 'offset' => 13500, 'width' => 2000, 'height' => 2000 }
    e = assert_raises(MMGG::AutoModel::SpecError) { P.plan(s) }
    assert_match(/벗어남/, e.message)
  end

  def test_overlapping_openings_rejected
    s = Marshal.load(Marshal.dump(SAMPLE))
    s['levels'][0]['openings'] << { 'side' => 'S', 'offset' => 1000, 'width' => 500, 'height' => 2000 }
    assert_raises(MMGG::AutoModel::SpecError) { P.plan(s) }
  end

  def test_scenes
    names = plan[:scenes].map { |x| x[:name] }
    assert_equal ['01 아이소', '02 평면 1F', '03 평면 2F', '04 평면 3F', '05 단면 A'], names
    assert_equal %w[L-2F L-3F L-RF], plan[:scenes][1][:hide_tags]
  end
end

class FurnitureCollisionTest < Minitest::Test
  def test_collision_is_warned
    s = Marshal.load(Marshal.dump(PlannerTest::SAMPLE))
    s['levels'][0]['furniture'] << { 'name' => '겹침', 'x' => 1200, 'y' => 1500, 'w' => 500, 'd' => 500, 'h' => 700 }
    w = MMGG::AutoModel::Planner.plan(s)[:warnings]
    assert(w.any? { |x| x.include?('겹침') })
  end

  def test_sample_has_no_warnings
    assert_empty MMGG::AutoModel::Planner.plan(Marshal.load(Marshal.dump(PlannerTest::SAMPLE)))[:warnings]
  end
end
