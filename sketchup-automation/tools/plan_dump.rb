# frozen_string_literal: true
# SketchUp 없이 사양을 검사하고 계획 결과를 JSON 으로 출력한다.
#   ruby tools/plan_dump.rb spec/sample.json            → 요약 + 경고
#   ruby tools/plan_dump.rb spec/sample.json --json     → 전체 계획(JSON)
require 'json'
require_relative '../src/mmgg_automodel/planner'

path = ARGV[0] or abort 'usage: ruby tools/plan_dump.rb <spec.json> [--json]'
begin
  plan = MMGG::AutoModel::Planner.plan(JSON.parse(File.read(path, encoding: 'UTF-8')))
rescue MMGG::AutoModel::SpecError, JSON::ParserError => e
  abort "사양 오류: #{e.message}"
end

if ARGV.include?('--json')
  puts JSON.pretty_generate(plan)
else
  puts "프로젝트: #{plan[:project]}"
  puts "부재 #{plan[:items].size}개 — " + plan[:items].group_by { |i| i[:kind] }.map { |k, v| "#{k} #{v.size}" }.join(', ')
  puts "높이 #{plan[:bounds][:h].round}mm, 장면: #{plan[:scenes].map { |s| s[:name] }.join(' / ')}"
  plan[:rooms].group_by { |r| r[:level] }.each do |lv, rs|
    puts "  #{lv}: " + rs.map { |r| "#{r[:name]} #{r[:area_m2]}㎡" }.join(', ') + " (합계 #{rs.sum { |r| r[:area_m2] }.round(2)}㎡)"
  end
  puts plan[:warnings].empty? ? '경고 없음' : plan[:warnings].map { |w| "경고: #{w}" }
end
