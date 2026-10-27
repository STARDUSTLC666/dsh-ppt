import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,readdirSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {unzipSync,strFromU8} from 'fflate'
import {normalizeDataModel,prepareDataSlides,previewDataChange,dataReport} from '../skills/dsh-ppt/scripts/deck-data.mjs'
import {normalizeSlides} from '../skills/dsh-ppt/scripts/deck-core.mjs'
import {buildDeckAsync,readDeckProject,previewDeckData,updateDeckData,undoDeck,editDeck} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import {PptWorkbench} from '../lib/workbench.js'

const root=resolve('.test-output');mkdirSync(root,{recursive:true})
const model=()=>({sources:[{id:'sales',name:'sales.csv',format:'csv',content:'Item,Amount\nBaseline,1000\nCost,600\nUnused,private-material-not-for-export'}],metrics:[
  {id:'base',label:'基期收入',kind:'source',source:{sourceId:'sales',cell:'B2'},format:{digits:0,unit:'万元'}},
  {id:'cost',label:'成本',kind:'source',source:{sourceId:'sales',cell:'B3'},format:{digits:0,unit:'万元'}},
  {id:'growth',label:'增长率',kind:'input',value:0.3,min:0,max:1,step:0.1,note:'情景假设',format:{style:'percent',digits:0}},
  {id:'revenue',label:'推演收入',kind:'formula',formula:'base*(1+growth)',format:{digits:0,unit:'万元'}},
  {id:'profit',label:'推演利润',kind:'formula',formula:'revenue-cost',format:{digits:0,unit:'万元'}},
]})
const slides=()=>[{layout:'cover',title:'业务情景',subtitle:'基期 {{base}}'},
  {layout:'bullets',title:'增长 {{growth}}',bullets:['推演收入 {{revenue}}','推演利润 {{profit}}','未关联数据 42'],notes:'请核对基期 {{base}}'},
  {layout:'chart',title:'收入与利润',chart:{kind:'column',categories:['收入','利润'],series:[{name:'推演 {{growth}}',values:['{{revenue}}','{{profit}}']}],caption:'预算情景'}},
  {layout:'table',title:'明细',rows:[['指标','金额'],['成本','{{cost}}'],['利润','{{profit}}']]}]
async function inDir(run){const dir=mkdtempSync(join(root,'data-'));try{return await run(dir)}finally{assert.ok(resolve(dir).startsWith(root+(/[\\]/.test(root)?'\\':'/')));rmSync(dir,{recursive:true,force:true})}}
const load=path=>JSON.parse(readFileSync(path,'utf8'))
const build=dir=>buildDeckAsync({title:'业务情景',outputDir:dir,slides:slides(),dataModel:model()})

test('ordinary standalone text generation remains usable when optional data parsers are absent',()=>inDir(async dir=>{
  const engine=pathToFileURL(resolve('skills/dsh-ppt/scripts/deck-advanced.mjs')).href
  const script=`import {registerHooks} from 'node:module';registerHooks({resolve(name,ctx,next){if(name==='jsep'||name==='csv-parse/sync'){const e=new Error('Absent optional parser');e.code='MODULE_NOT_FOUND';throw e}return next(name,ctx)}});const{buildDeckAsync}=await import(${JSON.stringify(engine)});const result=await buildDeckAsync({title:'Text only',content:'Actual content. No optional mode.',outputDir:${JSON.stringify(dir)}});if(!result.ok)throw Error('Plain generation failed');try{await buildDeckAsync({title:'Data',slides:[{title:'{{x}}'}],outputDir:${JSON.stringify(dir)},dataModel:{sources:[],metrics:[{id:'x',kind:'formula',formula:'1+2'}]}});throw Error('Expected missing dependency')}catch(e){if(!e.message.includes('npm install --ignore-scripts'))throw e}`
  const child=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(child.status,0,child.stderr);assert.equal(readdirSync(dir).length,3)
}))

test('source cells, percentages and derived formula values round-trip deterministically',()=>{
  const data=normalizeDataModel(model());assert.equal(data.values.profit,700);assert.equal(data.metrics[0].evidence.locator,'B2');assert.match(data.metrics[0].evidence.excerpt,/Baseline/)
  assert.deepEqual(normalizeDataModel(data),data)
  const text=normalizeDataModel({sources:[{id:'brief',content:'增长30%，成本600万元。'}],metrics:[{id:'rate',kind:'source',source:{sourceId:'brief',line:1}},{id:'cost',kind:'source',source:{sourceId:'brief',line:1,numberIndex:1}}]})
  assert.equal(text.values.rate,.3);assert.equal(text.values.cost,600)
})
test('CSV/TSV parser handles BOM, quotes, embedded newline and rejects unequal rows',()=>{
  const input=model();input.sources[0].content='\uFEFFItem,Amount\n"Baseline, total",1000\n"Cost\nthis year",600';const data=normalizeDataModel(input);assert.equal(data.sources[0].rows[2][0],'Cost\nthis year')
  input.sources[0]={id:'sales',format:'tsv',content:'Item\tAmount\nBase\t1000\nCost\t600'};assert.equal(normalizeDataModel(input).values.cost,600)
  input.sources[0].content='Item\tAmount\nOnlyOne';assert.throws(()=>normalizeDataModel(input))
  input.sources[0].format='xlsx';assert.throws(()=>normalizeDataModel(input),/Source format/)
})
for(const formula of ['base.constructor','base[0]','process.exit()','base=5','[base]','true','base>1','base?1:0','Math.max(base,1)','base||1','1/0','1e309','2**99','min()','round(base,8)'])test('formula rejects unsafe or invalid expression: '+formula,()=>{const input=model();input.metrics.at(-1).formula=formula;assert.throws(()=>normalizeDataModel(input))})
test('formula DAG rejects cycles, excessive nesting and unknown metrics',()=>{
  for(const formula of ['profit+1','notKnown+1','-'.repeat(40)+'base']){const input=model();input.metrics.at(-1).formula=formula;assert.throws(()=>normalizeDataModel(input))}
  const input=model();input.metrics.at(-1).formula='round(max(abs(-base), sum(cost,10)) / 3, 2)';assert.equal(normalizeDataModel(input).values.profit,333.33)
})
test('only declared assumptions accept finite numeric values on their range/step grid',()=>{
  const manifest={dataModel:normalizeDataModel(model()),slides:[],language:'zh'}
  for(const parameters of [{base:3},{growth:1.1},{growth:.35},{growth:'0.4'},{growth:null},{growth:NaN},{constructor:1}])assert.throws(()=>previewDataChange(manifest,{parameters},normalizeSlides))
})
test('unknown or malformed bindings are rejected instead of leaking placeholders',()=>{
  const data=normalizeDataModel(model());for(const title of ['{{unknown}}','{{bad_id}}','{{profit'])assert.throws(()=>prepareDataSlides([{title}],data,normalizeSlides))
})
test('paginated table preserves per-page bindings and updates all relevant pages',()=>{
  const data=normalizeDataModel(model()),rows=[['Item','Value'],...Array.from({length:17},(_,i)=>['Item '+i,'{{profit}}'])]
  const pages=prepareDataSlides([{layout:'table',title:'Results',rows}],data,normalizeSlides,'en');assert.equal(pages.length,3);assert.equal(pages[2].rows[1][1],'700万元');assert.equal(pages[2].dataTemplate.rows[1][1],'{{profit}}')
})
test('preview lists transitive slide impact, before/after values and unchanged-value source changes',()=>inDir(async dir=>{
  const output=await build(dir),before=load(output.jsonPath),bytes=readFileSync(output.jsonPath)
  const preview=previewDeckData({deckPath:output.jsonPath,parameters:{growth:.5},expectedRevision:0});assert.equal(preview.changes.find(m=>m.id==='profit').after,900);assert.deepEqual(preview.affectedSlides.map(s=>s.page),[2,3,4]);assert.match(preview.token,/^[a-f0-9]{64}$/);assert.deepEqual(readFileSync(output.jsonPath),bytes)
  const sources=previewDeckData({deckPath:output.jsonPath,sourceUpdates:[{id:'sales',format:'csv',content:'Item,Amount\nNew description,1000\nCost,600'}]});assert.equal(sources.changes[0].before,sources.changes[0].after);assert.deepEqual(sources.affectedSlides.map(s=>s.page),[1,2,3,4]);assert.ok(sources.affectedSlides.every(s=>s.evidenceChanged));assert.deepEqual(load(output.jsonPath),before)
}))
test('confirmation is bound to revision, preview token, exact source content and parameter set',()=>inDir(async dir=>{
  const output=await build(dir),preview=previewDeckData({deckPath:output.jsonPath,parameters:{growth:.5}})
  for(const options of [{},{confirmed:true},{confirmed:true,expectedRevision:0,previewToken:'x'},{confirmed:true,expectedRevision:0,previewToken:preview.token,parameters:{growth:.6}},{confirmed:true,expectedRevision:1,previewToken:preview.token}])await assert.rejects(updateDeckData({deckPath:output.jsonPath,parameters:{growth:.5},...options}))
  assert.equal(readdirSync(dir).length,3)
  const handEdited=load(output.jsonPath);handEdited.title='Edited outside DSH without a revision';writeFileSync(output.jsonPath,JSON.stringify(handEdited))
  await assert.rejects(updateDeckData({deckPath:output.jsonPath,parameters:{growth:.5},expectedRevision:0,confirmed:true,previewToken:preview.token}),/Preview changes/)
}))
test('confirmed copy synchronizes editable chart/text/notes; original bytes preserved; undo restores all data',()=>inDir(async dir=>{
  const output=await build(dir),original=Object.values(output.files).map(path=>readFileSync(path)),parameters={growth:.5},preview=previewDeckData({deckPath:output.jsonPath,parameters})
  const changed=await updateDeckData({deckPath:output.jsonPath,parameters,expectedRevision:0,previewToken:preview.token,confirmed:true})
  Object.values(output.files).forEach((path,i)=>assert.deepEqual(readFileSync(path),original[i]));assert.notEqual(changed.deckId,output.deckId);assert.equal(changed.undoAvailable,1)
  const manifest=readDeckProject({deckPath:changed.jsonPath}).manifest;assert.equal(manifest.dataModel.values.profit,900);assert.equal(manifest.slides[1].title,'增长 50%');assert.equal(manifest.slides[2].chart.series[0].values[1],900)
  const zip=unzipSync(readFileSync(changed.pptxPath)),notes=Object.entries(zip).filter(([p])=>/notesSlides\/notesSlide\d+\.xml$/.test(p)).map(([,b])=>strFromU8(b)).join('');assert.match(notes,/revenue-cost/);assert.match(notes,/用户假设/);assert.match(notes,/SHA-256/);assert.match(notes,/B2/);assert.ok(Object.keys(zip).some(p=>/ppt\/charts\/chart\d+\.xml/.test(p)));assert.match(dataReport(manifest),/900万元/)
  const html=readFileSync(changed.htmlPath,'utf8');assert.match(html,/data-panel/);assert.doesNotMatch(html,/private-material-not-for-export/);assert.doesNotMatch(html,/"sources":/)
  const workbench=new PptWorkbench({catalogPath:join(dir,'catalog.jsonl')});await workbench.remember(changed,{})
  const id=(await workbench.action({operation:'list'})).projects[0].id
  const share=await workbench.fetchDownload(new Request('http://localhost/api/dsh-ppt/download?id='+id+'&kind=share&revision=0'));assert.equal(share.status,200)
  const shared=unzipSync(new Uint8Array(await share.arrayBuffer()))
  assert.ok(Object.keys(shared).every(name=>!name.endsWith('.json')))
  for(const[name,bytes]of Object.entries(shared))if(!name.endsWith('.pptx'))assert.doesNotMatch(strFromU8(bytes),/private-material-not-for-export/)
  assert.match(strFromU8(shared[Object.keys(shared).find(name=>name.endsWith('.md'))]),/revenue-cost/)
  assert.match(readFileSync(changed.jsonPath,'utf8'),/private-material-not-for-export/)
  await undoDeck({deckPath:changed.jsonPath,expectedRevision:0});const undone=readDeckProject({deckPath:changed.jsonPath}).manifest;assert.equal(undone.dataModel.values.profit,700);assert.equal(undone.slides[1].title,'增长 30%')
}))
test('ordinary page edits preserve other bindings; replacing a bound field intentionally unlinks it',()=>inDir(async dir=>{
  const output=await build(dir)
  await editDeck({deckPath:output.jsonPath,expectedRevision:0,edits:[{slide:2,patch:{notes:'Edited speaker note'}}]});let manifest=readDeckProject({deckPath:output.jsonPath}).manifest;assert.equal(manifest.slides[1].dataTemplate.title,'增长 {{growth}}');assert.equal(manifest.slides[1].dataTemplate.notes,undefined)
  await editDeck({deckPath:output.jsonPath,expectedRevision:1,edits:[{slide:2,patch:{title:'Custom title'}}]});manifest=readDeckProject({deckPath:output.jsonPath}).manifest;assert.equal(manifest.slides[1].dataTemplate.title,undefined);assert.equal(manifest.slides[1].dataTemplate.bullets[0],'推演收入 {{revenue}}')
}))
test('persisted snapshots cannot smuggle paths, unsafe template fields or altered materialized values',()=>inDir(async dir=>{
  const output=await build(dir),baseline=load(output.jsonPath)
  for(const mutate of [m=>m.dataModel.sources[0].path='private.csv',m=>m.slides[1].title='Fake 90%',m=>m.slides[1].dataTemplate.image={src:'private.png'},m=>m.dataModel.metrics.at(-1).ast={type:'Literal',value:99}]){const copy=structuredClone(baseline);mutate(copy);writeFileSync(output.jsonPath,JSON.stringify(copy));assert.throws(()=>readDeckProject({deckPath:output.jsonPath}))}
}))
test('explicit file imports embed sources once; browser updates cannot read local paths',()=>inDir(async dir=>{
  writeFileSync(join(dir,'facts.csv'),'Item,Amount\nBaseline,1000\nCost,600');const input=model();input.sources=[{id:'sales',path:'facts.csv'}];const output=await buildDeckAsync({title:'Import',cwd:dir,outputDir:dir,slides:slides(),dataModel:input});rmSync(join(dir,'facts.csv'));assert.equal(readDeckProject({deckPath:output.jsonPath}).manifest.dataModel.values.base,1000)
  assert.throws(()=>previewDeckData({deckPath:output.jsonPath,sourceUpdates:[{id:'sales',path:output.jsonPath}]}),/Browser requests/)
  const workbench=new PptWorkbench({catalogPath:join(dir,'projects.jsonl')});await workbench.remember(output,{});const list=await workbench.action({operation:'list'}),id=list.projects[0].id
  await assert.rejects(workbench.action({operation:'data-preview',id,expectedRevision:0,sourceUpdates:[{id:'sales',path:output.jsonPath}]}),/Browser requests/)
  const view=await workbench.action({operation:'open',id});assert.equal(view.project.dataModel.values.profit,700)
  const preview=await workbench.action({operation:'data-preview',id,expectedRevision:0,parameters:{growth:.5}});const applied=await workbench.action({operation:'data-apply',id,expectedRevision:0,parameters:{growth:.5},confirmed:true,previewToken:preview.token});assert.notEqual(applied.project.id,id)
  const download=await workbench.fetchDownload(new Request('http://localhost/api/dsh-ppt/download?id='+applied.project.id+'&kind=data&revision=0'));assert.equal(download.status,200);assert.match(await download.text(),/900万元/)
}))
test('foreign or stale offline scenario packets and external Office modifications cannot overwrite current output',()=>inDir(async dir=>{
  const output=await build(dir),manifest=load(output.jsonPath),scenario={schemaVersion:1,deckId:manifest.deckId,revision:0,fingerprint:manifest.dataModel.fingerprint,parameters:{growth:.5}}
  assert.throws(()=>previewDeckData({deckPath:output.jsonPath,scenario:{...scenario,revision:1}}),/Scenario/);const preview=previewDeckData({deckPath:output.jsonPath,scenario})
  writeFileSync(output.pptxPath,'Externally edited');await assert.rejects(updateDeckData({deckPath:output.jsonPath,scenario,expectedRevision:0,previewToken:preview.token,confirmed:true,saveAs:false}),/外部修改/)
  const copy=await updateDeckData({deckPath:output.jsonPath,scenario,expectedRevision:0,previewToken:preview.token,confirmed:true});assert.equal(load(copy.jsonPath).dataModel.values.profit,900);assert.equal(readFileSync(output.pptxPath,'utf8'),'Externally edited')
}))
