# frozen_string_literal: true
# MMGG 자동 모델링 — SketchUp 확장 프로그램 등록 파일
require 'sketchup.rb'
require 'extensions.rb'

module MMGG
  module AutoModel
    unless file_loaded?(__FILE__)
      ext = SketchupExtension.new('MMGG 자동 모델링', 'mmgg_automodel/main')
      ext.description = '치수 사양(JSON)으로 슬래브·벽·창호·계단·가구·장면을 자동 생성합니다.'
      ext.version = '0.1.0'
      ext.creator = 'MMGG Design Lab'
      Sketchup.register_extension(ext, true)
      file_loaded(__FILE__)
    end
  end
end
