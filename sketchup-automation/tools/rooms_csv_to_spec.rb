# frozen_string_literal: true
# 엑셀 실 리스트(CSV) → 사양 JSON 의 rooms 를 채운다.
#   ruby tools/rooms_csv_to_spec.rb 실리스트.csv base.json > spec.json
# CSV 열: 층,실명,x,y,w,d   (mm, 건물 외곽 좌하단 기준, 첫 줄은 머리글)
# base.json 의 levels 에 없는 층은 height 3600 으로 새로 만든다.
require 'csv'
require 'json'

csv_path, base_path = ARGV
abort 'usage: ruby tools/rooms_csv_to_spec.rb rooms.csv base.json > spec.json' unless csv_path && base_path

spec = JSON.parse(File.read(base_path, encoding: 'UTF-8'))
spec['levels'] ||= []
rows = CSV.read(csv_path, headers: true, encoding: 'bom|utf-8')
need = %w[층 실명 x y w d]
missing = need - rows.headers.compact.map(&:strip)
abort "CSV 머리글에 #{missing.join(', ')} 가 없음 (필요: #{need.join(',')})" unless missing.empty?

rows.group_by { |r| r['층'].strip }.each do |lv_name, rs|
  lv = spec['levels'].find { |l| l['name'] == lv_name }
  unless lv
    lv = { 'name' => lv_name, 'height' => 3600 }
    spec['levels'] << lv
  end
  lv.delete('copy_from') # CSV 로 실을 준 층은 복사하지 않는다
  lv['rooms'] = rs.map do |r|
    { 'name' => r['실명'].strip }.merge(%w[x y w d].to_h { |k| [k, Float(r[k])] })
  end
end
spec['levels'].sort_by! { |l| l['name'].to_s[/\d+/].to_i }
puts JSON.pretty_generate(spec)
