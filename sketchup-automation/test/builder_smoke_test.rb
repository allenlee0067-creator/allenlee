# frozen_string_literal: true
# SketchUp API 를 흉내 낸 가짜 객체로 builder.rb 를 끝까지 실행해 본다 (오타·호출 오류 검출용).
# 실제 형상 검증은 SketchUp 에서 한다.  ruby test/builder_smoke_test.rb
require 'minitest/autorun'
require 'json'
require 'tmpdir'

class Numeric
  def mm = self / 25.4
end

module Geom
  Point3d = Struct.new(:x, :y, :z)
  Vector3d = Struct.new(:x, :y, :z)
  class Transformation
    def self.translation(v) = new
  end
end

module Sketchup
  class Color; def initialize(*); end; end
  class Entity
    attr_accessor :name, :layer, :material, :transformation
    def initialize = @attrs = {}
    def set_attribute(_d, k, v) = @attrs[k] = v
    def get_attribute(_d, k) = @attrs[k]
    def valid? = !@erased
    def erase! = @erased = true
  end
  class Face < Entity
    Normal = Struct.new(:z)
    def initialize(area) = (super(); @area = area)
    def area = @area
    def normal = Normal.new(-1)
    def reverse! = self
    def pushpull(h) = (raise 'height' unless h.positive?)
  end
  class Text < Entity; end
  class SectionPlane < Entity
    def activate = true
  end
  class Entities < Array
    def add_group = Group.new.tap { |g| self << g }
    def add_face(pts) = Face.new(pts.size).tap { |f| self << f }
    def add_instance(_d, _t) = ComponentInstance.new.tap { |i| self << i }
    def add_text(*) = Text.new.tap { |t| self << t }
    def add_section_plane(*) = SectionPlane.new.tap { |s| self << s }
    def erase_entities(list) = list.each { |e| delete(e) }
    attr_writer :active_section_plane
  end
  class Group < Entity
    def entities = (@ents ||= Entities.new)
  end
  class ComponentInstance < Entity; end
  class Definition
    def entities = (@ents ||= Entities.new)
  end
  class Named < Hash
    def initialize(&mk) = (super(&nil); @mk = mk)
    def add(n) = (self[n] = @mk.call(n))
    def each(&) = values.each(&)
  end
  class Layer; attr_accessor :visible; end
  class Mat; attr_accessor :color, :alpha; end
  class Page; attr_accessor :use_section_planes, :use_hidden_layers; end
  class Pages < Named
    attr_accessor :selected_page
    def erase(p) = delete(key(p))
  end
  class View
    attr_accessor :camera
    def zoom_extents = nil
    def refresh = nil
    def write_image(opts) = File.write(opts[:filename], 'png')
  end
  class Camera
    attr_accessor :perspective
    def initialize(*); end
  end
  class Model
    attr_reader :entities, :layers, :materials, :definitions, :pages, :active_view, :ops
    def initialize
      @entities = Entities.new
      @layers = Named.new { Layer.new }
      @materials = Named.new { Mat.new }
      @definitions = Named.new { Definition.new }
      @pages = Pages.new { Page.new }
      @active_view = View.new
      @ops = []
    end
    def options = { 'PageOptions' => {} }
    def rendering_options = (@ro ||= {})
    def start_operation(*) = @ops << :start
    def commit_operation = @ops << :commit
    def abort_operation = @ops << :abort
  end
end

require_relative '../src/mmgg_automodel/planner'
require_relative '../src/mmgg_automodel/builder'

class BuilderSmokeTest < Minitest::Test
  SPEC = File.join(__dir__, '..', 'spec', 'sample.json')

  def test_build_rebuild_export
    plan = MMGG::AutoModel::Planner.plan(JSON.parse(File.read(SPEC, encoding: 'UTF-8')))
    m = Sketchup::Model.new
    root = MMGG::AutoModel::Builder.build(m, plan, source_path: SPEC)
    assert_equal %i[start commit], m.ops
    assert_equal %w[1F 2F 3F RF], root.entities.grep(Sketchup::Group).map(&:name) & %w[1F 2F 3F RF]
    assert_equal 5, m.pages.size
    assert_equal 4, m.entities.grep(Sketchup::SectionPlane).size

    # 같은 파일로 재생성 → 이전 결과가 지워지고 1벌만 남아야 한다
    MMGG::AutoModel::Builder.build(m, plan, source_path: SPEC)
    assert_equal 1, m.entities.grep(Sketchup::Group).size
    assert_equal 5, m.pages.size
    assert_equal 4, m.entities.grep(Sketchup::SectionPlane).size
    assert_equal 4, m.definitions.size # 카페테이블·바카운터·업무책상·회의테이블 (반복은 인스턴스)
    Dir.mktmpdir do |d|
      files = MMGG::AutoModel::Builder.export(m, plan, d)
      assert_equal 6, files.size
      assert_match(/카페,8000,10000,80.0/, File.read(File.join(d, '실면적표.csv'), encoding: 'UTF-8'))
    end
  end
end
