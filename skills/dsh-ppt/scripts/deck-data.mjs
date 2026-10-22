/** Data provenance and explicit what-if assumptions. File imports occur only in tool calls. */
import { createRequire } from 'node:module'
import { readFileSync, lstatSync } from 'node:fs'
import { basename, resolve, extname } from 'node:path'
import { createHash } from 'node:crypto'
import { createDataMath } from './deck-data-math.mjs'

const math = createDataMath(), MAX_BYTES = 1024 * 1024
const require = createRequire(import.meta.url)
function parser(name) { try { return require(name) } catch(error) { if(error.code==='MODULE_NOT_FOUND')fail('数据绑定需安装技能目录的依赖：npm install --ignore-scripts','Data binding requires skill dependencies: npm install --ignore-scripts');throw error } }
const identifier = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9]{0,47}$/.test(value) && !['constructor','prototype','eval','Function','Math','process','window','globalThis'].includes(value)
const clone = value => structuredClone(value)
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const fail = (zh, en) => { throw new Error('dsh-ppt：' + zh + ' / ' + en) }
const token = /\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g
const fields = ['title','subtitle','kicker','text','bullets','rows','notes','chart']
const numericPattern = /[-+]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?[%％]?/g
export const dataFingerprint = model => digest({ sources: model.sources, metrics: model.metrics.map(({ ast, dependencies, evidence, ...m }) => m) })

function boundedString(value, cap, label) {
  if (typeof value !== 'string' || value.length > cap) fail(label + '过长或无效', 'Invalid or oversized ' + label)
  return value
}
function sourceInput(input, cwd, allowFiles) {
  if (!input || !identifier(input.id)) fail('数据源 ID 请使用字母开头的字母和数字', 'Source IDs must use letters and digits')
  let format = input.format, content = input.content, name = input.name || input.id
  if(format!==undefined&&!['csv','tsv','text'].includes(format)||input.kind!==undefined&&!['table','text'].includes(input.kind))fail('来源格式需为 CSV、TSV 或文本','Source format must be CSV, TSV or text')
  if (input.path !== undefined) {
    if (!allowFiles || typeof input.path !== 'string') fail('网页请求不能读取任意文件', 'Browser requests cannot read arbitrary files')
    const path = resolve(cwd, input.path), stat = lstatSync(path)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_BYTES) fail('源文件需为 1 MiB 内的普通文件', 'Source must be a regular file up to 1 MiB')
    const suffix = extname(path).toLowerCase(); format ||= suffix === '.csv' ? 'csv' : suffix === '.tsv' ? 'tsv' : ['.md','.txt'].includes(suffix) ? 'text' : ''
    if (!['csv','tsv','text'].includes(format)) fail('源文件支持 CSV、TSV、TXT 和 Markdown', 'Supported source files: CSV, TSV, TXT and Markdown')
    content = readFileSync(path, 'utf8'); name = input.name || basename(path)
  }
  boundedString(String(name), 120, '数据源名称')
  let source
  if (format === 'csv' || format === 'tsv') {
    boundedString(content, MAX_BYTES, '源数据')
    const rows = parser('csv-parse/sync').parse(content, { bom: true, delimiter: format === 'tsv' ? '\t' : ',', skip_empty_lines: false, max_record_size: 100000 })
    source = { id: input.id, name: String(name), kind: 'table', rows }
  } else if (input.kind === 'table' || input.rows !== undefined) source = { id: input.id, name: String(name), kind: 'table', rows: clone(input.rows) }
  else source = { id: input.id, name: String(name), kind: 'text', text: boundedString(content ?? input.text, MAX_BYTES, '材料') }
  if (source.kind === 'table') {
    const rows = source.rows
    if (!Array.isArray(rows) || !rows.length || rows.length > 500 || !Array.isArray(rows[0]) || !rows[0].length || rows[0].length > 26 || rows.some(r => !Array.isArray(r) || r.length !== rows[0].length || r.some(v => !['string','number'].includes(typeof v) || typeof v === 'number' && !Number.isFinite(v) || String(v).length > 2000))) fail('表格需 1–500 行、1–26 列，行宽一致，单元格最多 2000 字符', 'Table limits: 500 rows, 26 columns, equal row widths, 2000 characters per cell')
  }
  source.sha256 = digest(source.kind === 'text' ? source.text : source.rows)
  return source
}
function numeric(value) {
  if (typeof value === 'number') return math.finite(value)
  const text = String(value).trim()
  if (!/^[-+]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?[%％]?$/.test(text)) fail('引用位置不是单个数值', 'The referenced location is not a single number')
  return math.finite(Number(text.replaceAll(',', '').replace(/[%％]$/, '')) / (/[%％]$/.test(text) ? 100 : 1))
}
function evidenceOf(ref, sources) {
  if (!ref || typeof ref !== 'object') fail('指标缺少来源', 'Metric source is missing')
  const source = sources.find(s => s.id === ref.sourceId)
  if (!source) fail('找不到数据源：' + ref.sourceId, 'Unknown source: ' + ref.sourceId)
  let value, locator, excerpt, reference
  if (source.kind === 'table') {
    const cell = /^([A-Z])([1-9]\d{0,2})$/.exec(String(ref.cell || '').toUpperCase())
    if (!cell) fail('单元格需使用 A1–Z500 地址', 'Use a cell address from A1 to Z500')
    const row = Number(cell[2]) - 1, col = cell[1].charCodeAt(0) - 65
    if (!source.rows[row] || col >= source.rows[row].length) fail('引用单元格超出数据源', 'Cell is outside the source table')
    value = numeric(source.rows[row][col]); locator = cell[1] + cell[2]
    excerpt = source.rows[row].map((c, i) => String.fromCharCode(65 + i) + ': ' + String(c)).join(' | ').slice(0,1000)
    reference = { sourceId: source.id, cell: locator }
  } else {
    if (!Number.isInteger(ref.line) || ref.line < 1 || ref.line > 10000 || !Number.isInteger(ref.numberIndex ?? 0) || (ref.numberIndex ?? 0) < 0 || (ref.numberIndex ?? 0) > 100) fail('请指定材料行号与该行数值序号（从 0 开始）', 'Specify a line and zero-based numberIndex')
    const line = source.text.split(/\r?\n/)[ref.line - 1]
    if (line === undefined || line.length > 8000) fail('材料行不存在或超过 8000 字符', 'Source line missing or longer than 8000 characters')
    const numbers = [...line.matchAll(numericPattern)], match = numbers[ref.numberIndex ?? 0]
    if (!match) fail('该材料行没有指定的数值', 'Requested number not found on the source line')
    value = numeric(match[0]); locator = 'L' + ref.line + ' #' + (Number(ref.numberIndex ?? 0) + 1); excerpt = line
    reference = { sourceId: source.id, line: ref.line, numberIndex: ref.numberIndex ?? 0 }
  }
  return { value, reference, evidence: { sourceId: source.id, name: source.name, locator, excerpt, sha256: source.sha256 } }
}
export function normalizeDataModel(input, { cwd = '.', allowFiles = false } = {}) {
  if (!input || input.schemaVersion !== undefined && input.schemaVersion !== 1 || !Array.isArray(input.sources) || input.sources.length > 8 || !Array.isArray(input.metrics) || !input.metrics.length || input.metrics.length > 80) fail('数据模型需包含最多 8 个来源和 1–80 个指标', 'Data model needs up to 8 sources and 1–80 metrics')
  const sources = input.sources.map(s => sourceInput(s, cwd, allowFiles)), seen = new Set()
  if (new Set(sources.map(s => s.id)).size !== sources.length || Buffer.byteLength(JSON.stringify(sources)) > MAX_BYTES) fail('数据源重复或总量超过 1 MiB', 'Duplicate sources or combined data exceeds 1 MiB')
  const metrics = input.metrics.map(raw => {
    if (!raw || !identifier(raw.id) || seen.has(raw.id) || !['source','input','formula'].includes(raw.kind)) fail('指标 ID 重复、无效或类型不受支持', 'Invalid, duplicate metric ID or unsupported kind')
    seen.add(raw.id)
    const format = raw.format || {}, style = format.style || 'number', digits = format.digits ?? 2
    if (!['number','percent'].includes(style) || !Number.isInteger(digits) || digits < 0 || digits > 6) fail('显示格式只支持 number / percent 和 0–6 位小数', 'Use number/percent and 0–6 decimal places')
    const metric = { id: raw.id, label: boundedString(raw.label || raw.id,120,'指标名称'), kind: raw.kind, format: { style, digits, ...(format.unit ? { unit: boundedString(format.unit,24,'单位') } : {}) }, ...(raw.note ? { note: boundedString(raw.note,1000,'假设说明') } : {}) }
    if (raw.kind === 'source') { const result = evidenceOf(raw.source,sources); Object.assign(metric,{source:result.reference,value:result.value,evidence:result.evidence}) }
    if (raw.kind === 'input') {
      if ([raw.value,raw.min,raw.max,raw.step].some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e15)||raw.min>=raw.max||raw.step<=0||(raw.max-raw.min)/raw.step>100000) fail('假设需提供数值、最小值、最大值和正步长（最多 100000 步）', 'Assumptions need finite value/min/max/positive step, at most 100000 steps')
      Object.assign(metric,{value:raw.value,min:raw.min,max:raw.max,step:raw.step}); math.inputValue(metric,raw.value)
    }
    if (raw.kind === 'formula') { metric.formula = boundedString(raw.formula,512,'公式'); const jsep=parser('jsep');try { metric.ast = jsep(metric.formula) } catch { fail('公式无法解析：'+raw.id,'Formula cannot be parsed: '+raw.id) } }
    return metric
  })
  if (metrics.filter(m=>m.kind==='input').length>12) fail('每个工程最多 12 个可调假设','At most 12 adjustable assumptions')
  for (const metric of metrics) if (metric.ast) metric.dependencies = math.inspect(metric.ast, seen)
  const values = math.solve(metrics)
  return { schemaVersion:1,sources,metrics,values,fingerprint:dataFingerprint({sources,metrics}) }
}
export function substituteData(value, model, numericValue = false) {
  if (typeof value !== 'string') return value
  if (/\{\{|\}\}/.test(value.replace(token,''))) fail('数据占位符需使用 {{指标ID}}','Use {{metricId}} for data placeholders')
  const match = /^\{\{([A-Za-z][A-Za-z0-9]*)\}\}$/.exec(value)
  if (numericValue && match) {
    if (!Object.hasOwn(model.values,match[1])) fail('未知指标：'+match[1],'Unknown metric: '+match[1])
    return model.values[match[1]]
  }
  if (numericValue && value.includes('{{')) fail('图表数值需为完整的 {{指标ID}}','Chart values require an exact {{metricId}}')
  return value.replace(token,(_,id)=>{
    const metric=model.metrics.find(m=>m.id===id);if(!metric)fail('未知指标：'+id,'Unknown metric: '+id)
    return math.format(model.values[id],metric)
  })
}
function chartTemplate(chart) {
  if (!chart || !chart.rows) return clone(chart)
  return { ...chart, rows:undefined,categories:chart.rows.slice(1).map(r=>r[0]),series:chart.rows[0].slice(1).map((name,c)=>({name,values:chart.rows.slice(1).map(r=>r[c+1])})) }
}
export function resolveTemplate(template, model) {
  const next=clone(template)
  for (const key of ['title','subtitle','kicker','text','notes']) if(typeof next[key]==='string')next[key]=substituteData(next[key],model)
  if(Array.isArray(next.bullets))next.bullets=next.bullets.map(v=>substituteData(v,model))
  if(Array.isArray(next.rows))next.rows=next.rows.map(row=>row.map(v=>substituteData(v,model)))
  if(next.chart){next.chart=chartTemplate(next.chart);next.chart.categories=next.chart.categories?.map(v=>substituteData(v,model));next.chart.series=next.chart.series?.map(s=>({...s,name:substituteData(s.name,model),values:s.values.map(v=>substituteData(v,model,true))}));for(const k of ['unit','caption'])if(next.chart[k])next.chart[k]=substituteData(next.chart[k],model)}
  return next
}
function hasBinding(value){return typeof value==='string'?/\{\{[A-Za-z][A-Za-z0-9]*\}\}/.test(value):Array.isArray(value)?value.some(hasBinding):value&&typeof value==='object'?Object.values(value).some(hasBinding):false}
export function prepareDataSlides(rawSlides, model, normalize, language='zh') {
  return rawSlides.flatMap(raw=>{
    if(raw.dataTemplate && (typeof raw.dataTemplate!=='object'||Array.isArray(raw.dataTemplate)||Object.keys(raw.dataTemplate).some(key=>!fields.includes(key))))fail('数据模板只允许文本、表格和图表字段','Data templates only support text, table and chart fields')
    const original={...raw,...raw.dataTemplate};delete original.dataTemplate
    if(original.chart)original.chart=chartTemplate(original.chart)
    const resolved=resolveTemplate(original,model), actual=normalize([resolved],120,language)
    // Normalize text/table templates using the same pagination as real output.
    // Charts are normalized with real values, then their canonical bindings restored.
    const textTemplate={...original,...(original.chart?{chart:resolved.chart}:{})},templates=normalize([textTemplate],120,language)
    if(templates.length!==actual.length)fail('数据绑定改变了页数，请先将表格分页','Binding changes pagination; split the table first')
    return actual.map((slide,i)=>{
      const candidate={...templates[i],...(original.chart?{chart:original.chart}:{})},dataTemplate={}
      for(const key of fields)if(hasBinding(candidate[key]))dataTemplate[key]=candidate[key]
      return {...slide,...(Object.keys(dataTemplate).length?{dataTemplate}:{})}
    })
  })
}
export function refreshDataSlides(slides, model, normalize, language) {
  return slides.map(slide=>{const refreshed=prepareDataSlides([slide],model,normalize,language);if(refreshed.length!==1)fail('更新后页数发生变化，请分拆该页','Data refresh must preserve slide count');return{...refreshed[0],id:slide.id}})
}
/** Reject stale materialized values and unsafe persisted file references. */
export function validateDataSnapshot(manifest, normalize) {
  if(!manifest.dataModel){if(manifest.slides.some(s=>s.dataTemplate))fail('数据模板缺少模型','Data templates require a data model');return}
  const model=normalizeDataModel(manifest.dataModel)
  if(JSON.stringify(model)!==JSON.stringify(manifest.dataModel))fail('数据模型快照不一致，请从原始材料重新生成','Data snapshot is inconsistent; rebuild from source material')
  const refreshed=refreshDataSlides(manifest.slides,model,normalize,manifest.language)
  for(let i=0;i<refreshed.length;i++)for(const key of [...fields,'dataTemplate'])if(JSON.stringify(refreshed[i][key])!==JSON.stringify(manifest.slides[i][key]))fail('第 '+(i+1)+' 页与数据绑定不一致','Slide '+(i+1)+' differs from its data bindings')
}
export function dataReferences(slide) {return [...new Set([...JSON.stringify(slide.dataTemplate||{}).matchAll(token)].map(match=>match[1]))]}
export function dataDependencies(model, ids) {
  const found=new Set(),byId=new Map(model.metrics.map(m=>[m.id,m]))
  function visit(id){if(found.has(id))return;const metric=byId.get(id);if(!metric)fail('未知指标：'+id,'Unknown metric: '+id);found.add(id);metric.dependencies?.forEach(visit)}
  ids.forEach(visit);return model.metrics.filter(m=>found.has(m.id))
}
export function dataNotes(manifest, slide) {
  if(!manifest.dataModel||!slide.dataTemplate)return slide.notes||''
  const model=manifest.dataModel,en=manifest.language==='en',metrics=dataDependencies(model,dataReferences(slide))
  const lines=[slide.notes||'',en?'--- Data and assumptions (confirmed static snapshot) ---':'--- 数据、公式与假设（已确认的静态快照） ---',...metrics.map(m=>m.label+' ['+m.id+'] = '+math.format(model.values[m.id],m,manifest.language)+'\n'+(m.kind==='formula'?'= '+m.formula:m.kind==='input'?(en?'User assumption':'用户假设')+(m.note?': '+m.note:''):m.evidence.name+' · '+m.evidence.locator+'\n'+m.evidence.excerpt+'\nSHA-256: '+m.evidence.sha256))]
  return lines.join('\n\n')
}
export function dataReport(manifest) {
  const en=manifest.language==='en',heading=String(manifest.title).replace(/[\r\n]/g,' '),lines=['# '+heading,en?'Data lineage and assumptions; source links are not factual verification.':'数据溯源与假设；关联到原文不代表事实已被核验。']
  manifest.slides.forEach((slide,i)=>{if(slide.dataTemplate)lines.push('## '+(i+1)+'. '+slide.title,dataNotes(manifest,slide))})
  return lines.join('\n\n')+'\n'
}
export function previewDataChange(manifest, options, normalize) {
  if(!manifest.dataModel)fail('工程尚未配置数据模型','This project has no data model')
  const raw=clone(manifest.dataModel),updates=options.sourceUpdates??[],parameters=options.parameters??{}
  if(!Array.isArray(updates)||updates.length>8||!parameters||typeof parameters!=='object'||Array.isArray(parameters))fail('数据更新格式无效','Invalid data update')
  const updated=new Set()
  for(const update of updates){const index=raw.sources.findIndex(s=>s.id===update?.id);if(index<0||updated.has(update.id))fail('来源不存在或重复','Unknown or duplicate source');updated.add(update.id);const source=raw.sources[index];const next=sourceInput({...update,name:source.name},options.cwd||'.',options.allowFiles===true);if(next.kind!==source.kind)fail('替换材料需保持表格或文本类型','Keep the same source type');raw.sources[index]=next}
  for(const [id,value]of Object.entries(parameters)){const metric=raw.metrics.find(m=>m.id===id);if(metric?.kind!=='input')fail('仅可更改明确声明的假设','Only declared assumptions can change');math.inputValue(metric,value);metric.value=value}
  const model=normalizeDataModel(raw),slides=refreshDataSlides(manifest.slides,model,normalize,manifest.language)
  const changes=model.metrics.filter(m=>model.values[m.id]!==manifest.dataModel.values[m.id]||JSON.stringify(m.evidence)!==JSON.stringify(manifest.dataModel.metrics.find(old=>old.id===m.id)?.evidence)).map(m=>({id:m.id,label:m.label,before:manifest.dataModel.values[m.id],after:model.values[m.id],beforeText:math.format(manifest.dataModel.values[m.id],m,manifest.language),afterText:math.format(model.values[m.id],m,manifest.language),kind:m.kind}))
  const changedIds=new Set(changes.map(m=>m.id))
  const affectedSlides=slides.flatMap((slide,i)=>JSON.stringify(slide)!==JSON.stringify(manifest.slides[i])||dataDependencies(model,dataReferences(slide)).some(m=>changedIds.has(m.id))?[{id:slide.id,page:i+1,title:slide.title,fields:fields.filter(key=>JSON.stringify(slide[key])!==JSON.stringify(manifest.slides[i][key])).map(key=>({field:key,before:manifest.slides[i][key]??'',after:slide[key]??''})),evidenceChanged:dataDependencies(model,dataReferences(slide)).some(m=>m.kind==='source'&&changedIds.has(m.id))}]:[])
  // Include the full saved state, so hand edits that omit revision updates also invalidate confirmation.
  const token=digest({state:digest(manifest),after:model.fingerprint,slides:slides.map(s=>({id:s.id,dataTemplate:s.dataTemplate}))})
  return {model,slides,preview:{token,changes,affectedSlides,sourceChanges:[...updated],changed:model.fingerprint!==manifest.dataModel.fingerprint}}
}
