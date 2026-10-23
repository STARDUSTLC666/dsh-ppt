import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import * as engine from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { renderDeck } from '../skills/dsh-ppt/scripts/deck-render.mjs'
import { applyVisualActions, normalizeVisual } from '../skills/dsh-ppt/scripts/deck-visual.mjs'
import { PptWorkbench, PPT_DOWNLOAD_ROUTE } from '../lib/workbench.js'
import { nativeVisualModel } from '../lib/visual-model.js'

const root=resolve('.test-output');mkdirSync(root,{recursive:true})
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1cAAAAASUVORK5CYII=','base64')
const hash=b=>createHash('sha256').update(b).digest('hex')
const route={provider:'configured',model:'vision-model',label:'Vision model'}
// Contract fixture only: real native rendering is tested separately in acceptance.
const fakeKit=async()=>({ENGINE_VERSION:'0.1.5',createConverter:async()=>({backend:'native',dispose:async()=>{},renderImages:async request=>{
  mkdirSync(request.outputDir,{recursive:true})
  const xml=strFromU8(unzipSync(readFileSync(request.inputPath))['ppt/presentation.xml']),count=(xml.match(/<p:sldId\b/g)||[]).length
  return {sourceSha256:hash(readFileSync(request.inputPath)),pageCount:count,missingFonts:[],images:Array.from({length:count},(_,i)=>{const path=join(request.outputDir,'page-'+(i+1)+'.png');writeFileSync(path,png);return {page:i+1,path,width:1,height:1}})}
}})})
const problem=(slide,action={type:'split-bullets',value:2})=>({slideId:slide.id,findings:[{kind:'density',region:'body',issue:'四条要点挤在同一页，建议分为两页。',box:[.1,.2,.7,.5],action}]})
async function fixture(t,inspect=async data=>({slides:data.slides.map(s=>data.round===0?problem(s):{slideId:s.id,findings:[]})}),options={}){
  const directory=mkdtempSync(join(root,'visual-'));t.after(()=>{assert.equal(dirname(directory),root);rmSync(directory,{recursive:true,force:true})})
  let calls=0,renders=0,listings=0,seen
  const model={routes:async()=>{listings++;return [route]},inspect:async(_r,system,input,images,signal)=>{calls++;seen={system,input,images};return JSON.stringify(await inspect(JSON.parse(input),signal,images,system))}}
  const created=await engine.buildDeckAsync({title:'完整季度计划',outputDir:directory,fileName:'plan',slides:[{layout:'bullets',title:'季度收入与交付',bullets:['收入 {{revenue}} 万元','完成四个项目','保留客户回访记录','下一季度继续交付'],notes:'原始讲稿不能丢。'}],dataModel:{sources:[{id:'csv',format:'csv',content:'项目,金额\n收入,1200'}],metrics:[{id:'revenue',kind:'source',source:{sourceId:'csv',cell:'B2'}}]}})
  const loadEngine=async()=>({...engine,renderDeck:async args=>{renders++;return renderDeck(args,fakeKit)},...options.engine})
  const wb=new PptWorkbench({catalogPath:join(directory,'projects.jsonl'),loadEngine,visualModel:model});t.after(()=>wb.visual.dispose())
  await wb.remember(created,{})
  const id=(await wb.action({operation:'list'})).projects[0].id
  const act=(operation,body={},signal)=>wb.action({operation:'visual-'+operation,id,expectedRevision:engine.readDeckProject({deckPath:created.jsonPath}).manifest.revision,...body},signal)
  const create=(body={})=>act('create',{confirmed:true,...route,repairs:1,...body})
  const finish=async run=>{let current=run;for(let i=0;current.status==='ready'&&i<60;i++)current=(await act('step',{runId:current.id,confirmed:true})).run;return current}
  return {directory,created,wb,id,act,create,finish,calls:()=>calls,renders:()=>renders,listings:()=>listings,seen:()=>seen}
}

test('ordinary delivery and visual setup perform no vision calls or rendering',async t=>{
  const f=await fixture(t)
  await f.wb.action({operation:'open',id:f.id});assert.equal(f.listings(),0)
  const {run}=await f.create();assert.equal(run.maxCalls,2);assert.equal(run.usedCalls,0);assert.equal(f.calls(),0);assert.equal(f.renders(),0)
})

test('actual render receipts drive bounded inspection, repair, re-render and adoption; originals and data survive',async t=>{
  const f=await fixture(t),originals=Object.values(f.created.files).map(p=>readFileSync(p))
  const {run}=await f.create(),done=await f.finish(run)
  assert.equal(done.status,'complete');assert.equal(done.reason,'no-findings');assert.equal(done.rounds.length,2);assert.equal(done.usedCalls,2);assert.equal(f.renders(),2);assert.equal(done.canAdopt,true)
  assert.equal(done.rounds[1].ids.length,2);assert.equal(done.rounds[1].cursor,2);assert.equal(done.rounds[1].findings.length,0)
  const adopted=await f.act('adopt',{runId:run.id,confirmed:true}),copy=engine.readDeckProject({deckPath:adopted.project.path}).manifest
  assert.equal(adopted.project.render.pageCount,2);assert.equal(adopted.project.undoAvailable,1)
  assert.deepEqual(copy.slides.flatMap(s=>s.bullets),engine.readDeckProject({deckPath:f.created.jsonPath}).manifest.slides[0].bullets)
  assert.deepEqual(copy.dataModel,engine.readDeckProject({deckPath:f.created.jsonPath}).manifest.dataModel)
  assert.equal(copy.slides[0].dataTemplate.bullets[0],'收入 {{revenue}} 万元')
  assert.equal(copy.slides[0].notes,'原始讲稿不能丢。')
  Object.values(f.created.files).forEach((p,i)=>assert.deepEqual(readFileSync(p),originals[i]))
  await f.wb.action({operation:'undo',id:adopted.project.id,expectedRevision:0})
  assert.equal(engine.readDeckProject({deckPath:adopted.project.path}).manifest.slides.length,1)
  Object.values(f.created.files).forEach((p,i)=>assert.deepEqual(readFileSync(p),originals[i]))
})

test('inspection-only mode reports issues without making presentation copies',async t=>{
  const f=await fixture(t),{run}=await f.create({repairs:0}),done=await f.finish(run)
  assert.equal(done.usedCalls,1);assert.equal(done.rounds.length,1);assert.equal(done.reason,'limit');assert.equal(done.canAdopt,false)
  await assert.rejects(f.act('adopt',{runId:run.id,confirmed:true}),/尚未完成/)
  assert.equal(readdirSync(f.directory).filter(n=>n.endsWith('.pptx')).length,1)
})

test('unsupported or text-changing model actions remain manual findings',async t=>{
  const f=await fixture(t,async data=>({slides:data.slides.map(s=>problem(s,{type:'rewrite',text:'伪造增长99%'}))})),{run}=await f.create(),done=await f.finish(run)
  assert.equal(done.reason,'manual');assert.equal(done.rounds[0].findings[0].action,undefined);assert.equal(f.calls(),1)
})

test('no-op formatting recommendations terminate rather than loop',async t=>{
  const f=await fixture(t,async data=>({slides:data.slides.map(s=>problem(s,{type:'body-size',value:20}))})),{run}=await f.create({repairs:2}),done=await f.finish(run)
  assert.equal(done.reason,'manual');assert.equal(done.rounds.length,2);assert.equal(done.usedCalls,2)
})

test('model may keep finding issues, but the configured repair and call caps stop it',async t=>{
  const f=await fixture(t,async data=>({slides:data.slides.map(s=>problem(s,{type:'title-size',value:data.round%2?29:28}))})),{run}=await f.create({repairs:2}),done=await f.finish(run)
  assert.equal(done.rounds.length,3);assert.equal(done.usedCalls,3);assert.equal(done.reason,'limit');assert.equal(done.rounds.at(-1).findings.length,1)
  await assert.rejects(f.act('step',{runId:run.id,confirmed:true}),/已结束/)
})

test('stale source content and changed Office outputs refuse continuation or adoption',async t=>{
  const f=await fixture(t),{run}=await f.create(),done=await f.finish(run)
  writeFileSync(f.created.pptxPath,Buffer.concat([readFileSync(f.created.pptxPath),Buffer.from('office edit')]))
  assert.equal((await f.act('get',{runId:run.id})).run.stale,true)
  await assert.rejects(f.act('adopt',{runId:run.id,confirmed:true}),/已变化/)
  await assert.rejects(f.create(),/Office/)
  assert.equal(done.canAdopt,true)
})

test('source changes during a model call are caught before findings or edits are accepted',async t=>{
  let path
  const f=await fixture(t,async data=>{const m=JSON.parse(readFileSync(path,'utf8'));m.slides[0].title='用户在另一窗口修改';writeFileSync(path,JSON.stringify(m));return {slides:data.slides.map(s=>problem(s))}})
  path=f.created.jsonPath
  const {run}=await f.create();await f.act('step',{runId:run.id,confirmed:true})
  await assert.rejects(f.act('step',{runId:run.id,confirmed:true}),/已变化/)
  const paused=(await f.act('get',{runId:run.id})).run;assert.equal(paused.status,'paused');assert.equal(paused.usedCalls,1);assert.equal(paused.rounds[0].findings.length,0)
})

test('tampered image output cannot be displayed or sent to a model',async t=>{
  const f=await fixture(t),{run}=await f.create();await f.act('step',{runId:run.id,confirmed:true})
  const stored=JSON.parse(readFileSync(join(f.directory,'visual-reviews',run.id+'.json'),'utf8')),receipt=JSON.parse(readFileSync(stored.rounds[0].receipt,'utf8'))
  writeFileSync(join(dirname(stored.rounds[0].receipt),receipt.pngs[0].file),'tampered')
  await assert.rejects(f.act('page',{runId:run.id,round:0,slideId:run.rounds[0].ids[0]}),/渲染输出已变化/)
  await assert.rejects(f.act('step',{runId:run.id,confirmed:true}),/渲染输出已变化/);assert.equal(f.calls(),0)
})

test('an invalid model response is saved once with spent call count and no silent retry',async t=>{
  const f=await fixture(t,async()=>({slides:[]})),{run}=await f.create();await f.act('step',{runId:run.id,confirmed:true})
  await assert.rejects(f.act('step',{runId:run.id,confirmed:true}),/逐页返回/)
  const paused=(await f.act('get',{runId:run.id})).run;assert.equal(paused.status,'paused');assert.equal(paused.usedCalls,1)
  await assert.rejects(f.act('step',{runId:run.id,confirmed:true}),/已结束或中断/);assert.equal(f.calls(),1)
})

test('duplicate requests and stop cannot spend a second model call or commit a repair',async t=>{
  let started
  const waiting=new Promise(r=>{started=r})
  const f=await fixture(t,async(_data,signal)=>{started();return new Promise((_,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true})})})
  const {run}=await f.create();await f.act('step',{runId:run.id,confirmed:true})
  const pending=f.act('step',{runId:run.id,confirmed:true});await waiting
  await assert.rejects(f.act('step',{runId:run.id,confirmed:true}),/正在进行/)
  await f.act('stop',{runId:run.id});await assert.rejects(pending)
  const paused=(await f.act('get',{runId:run.id})).run;assert.equal(paused.status,'paused');assert.equal(paused.usedCalls,1);assert.equal(paused.canAdopt,false)
})

test('restart preserves completed reports, exports explicit scope and deletes only owned review files',async t=>{
  const f=await fixture(t),{run}=await f.create(),done=await f.finish(run)
  const fresh=new PptWorkbench({catalogPath:f.wb.catalogPath,loadEngine:async()=>engine})
  assert.equal((await fresh.action({operation:'visual-get',id:f.id,runId:run.id})).run.usedCalls,done.usedCalls)
  const response=await fresh.fetchDownload(new Request('http://local'+PPT_DOWNLOAD_ROUTE+'?id='+f.id+'&kind=visual&revision=0&run='+run.id))
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/markdown/);assert.match(await response.text(),/不等于人工验收/)
  const adopted=await f.act('adopt',{runId:run.id,confirmed:true})
  await f.act('delete',{runId:run.id});assert.equal(existsSync(adopted.project.path),true);assert.equal(existsSync(f.created.pptxPath),true)
  assert.equal(existsSync(join(f.directory,'visual-reviews',run.id)),false);assert.equal((await f.act('list')).runs.length,0)
})

test('stopping between phases persists a stopped state and preserves an unchecked copy without adopting it',async t=>{
  const f=await fixture(t),{run}=await f.create()
  await f.act('step',{runId:run.id,confirmed:true});await f.act('step',{runId:run.id,confirmed:true});await f.act('step',{runId:run.id,confirmed:true})
  const stopped=(await f.act('stop',{runId:run.id})).run
  assert.equal(stopped.phase,'render');assert.equal(stopped.status,'paused');assert.equal(stopped.rounds.length,2);assert.equal(stopped.usedCalls,1);assert.equal(stopped.canAdopt,false)
  assert.match(stopped.error,/已停止/)
  await assert.rejects(f.act('step',{runId:run.id,confirmed:true}),/已结束或中断/)
  assert.equal(f.calls(),1);assert.equal(readdirSync(f.directory).filter(n=>n.endsWith('.pptx')).length,2)
})

test('invalid limits, wrong routes, foreign records and missing renderer consume no model calls',async t=>{
  const f=await fixture(t,undefined,{engine:{renderDeck:async()=>({ok:false,status:'unavailable'})}})
  for(const body of [{repairs:3},{repairs:-1},{confirmed:false},{model:'text-only'},{slideId:'missing'}])await assert.rejects(f.create(body))
  const {run}=await f.create();await assert.rejects(f.act('step',{runId:run.id,confirmed:true}),/渲染引擎不可用/);assert.equal(f.calls(),0)
  const other=await engine.buildDeckAsync({title:'Other',content:'# A\n- Fact',outputDir:f.directory,fileName:'other'});await f.wb.remember(other,{})
  const id=(await f.wb.action({operation:'list'})).projects[0].id
  for(const operation of ['visual-get','visual-delete','visual-adopt'])await assert.rejects(f.wb.action({operation,id,expectedRevision:0,runId:run.id,confirmed:true}),/不属于/)
})

test('native formatting controls change actual OOXML and HTML and survive data refresh and undo',async t=>{
  const f=await fixture(t),copy=await engine.repairDeckVisual({deckPath:f.created.jsonPath,expectedRevision:0,actions:[{slideId:engine.readDeckProject({deckPath:f.created.jsonPath}).manifest.slides[0].id,type:'title-size',value:28},{slideId:engine.readDeckProject({deckPath:f.created.jsonPath}).manifest.slides[0].id,type:'body-size',value:24}]})
  const xml=strFromU8(unzipSync(readFileSync(copy.pptxPath))['ppt/slides/slide1.xml'])
  assert.match(xml,/name="Title"[\s\S]*?sz="2800"/);assert.match(xml,/name="Body"[\s\S]*?sz="2400"/)
  assert.match(readFileSync(copy.htmlPath,'utf8'),/--ppt-titleSize:28;--ppt-bodySize:24/)
  const preview=engine.previewDeckData({deckPath:copy.jsonPath,expectedRevision:0,sourceUpdates:[{id:'csv',format:'csv',content:'项目,金额\n收入,1400'}]})
  const updated=await engine.updateDeckData({deckPath:copy.jsonPath,expectedRevision:0,sourceUpdates:[{id:'csv',format:'csv',content:'项目,金额\n收入,1400'}],previewToken:preview.token,confirmed:true,saveAs:false})
  assert.deepEqual(engine.readDeckProject({deckPath:updated.jsonPath}).manifest.slides[0].visual,{titleSize:28,bodySize:24})
})

test('formatting vocabulary cannot rewrite text, read files, inject XML, or drop table/metric data',()=>{
  const m={slides:[{id:'table',layout:'table',title:'Budget',rows:[['item','amount'],['A','{{base}}'],['B','200'],['C','300']],dataTemplate:{rows:[['item','amount'],['A','{{base}}'],['B','200'],['C','300']]}}]}
  const split=applyVisualActions(m,[{slideId:'table',type:'split-table',value:1}]);assert.equal(split.length,2)
  assert.deepEqual([split[0].rows[0],...split.flatMap(s=>s.rows.slice(1))],m.slides[0].rows)
  assert.deepEqual(split[0].dataTemplate.rows[1],['A','{{base}}'])
  for(const action of [{type:'rewrite',text:'fake'},{type:'body-size',value:8},{type:'title-size',value:61},{type:'read',value:'C:/secret'},{type:'split-table',value:0}])assert.throws(()=>applyVisualActions(m,[{slideId:'table',...action}]))
  assert.throws(()=>normalizeVisual({font:'file:///secret'}));assert.throws(()=>normalizeVisual({titleSize:NaN}))
})

test('chart direction and label sizes export natively while images and tabular content stay intact',async t=>{
  const f=await fixture(t),created=await engine.buildDeckAsync({title:'Native formatting',outputDir:f.directory,fileName:'media',slides:[
    {layout:'chart',title:'收入',chart:{kind:'column',categories:['华东','华南'],series:[{name:'营收',values:[1200,900]}],unit:'万元'}},
    {layout:'image-right',title:'图片',bullets:['保持原文'],image:{src:'data:image/png;base64,'+png.toString('base64'),fit:'cover',alt:'Fixture'}},
    {layout:'table',title:'表格',rows:[['项目','金额'],['A','1200'],['B','900'],['C','700']]},
  ]})
  const before=engine.readDeckProject({deckPath:created.jsonPath}).manifest
  const copy=await engine.repairDeckVisual({deckPath:created.jsonPath,expectedRevision:0,actions:[{slideId:before.slides[0].id,type:'chart-horizontal'},{slideId:before.slides[0].id,type:'chart-label-size',value:22},{slideId:before.slides[1].id,type:'image-contain'},{slideId:before.slides[2].id,type:'split-table',value:1}]})
  const after=engine.readDeckProject({deckPath:copy.jsonPath}).manifest,zip=unzipSync(readFileSync(copy.pptxPath)),chart=strFromU8(zip[Object.keys(zip).find(n=>/^ppt\/charts\/chart\d+\.xml$/.test(n))])
  assert.match(chart,/<c:barDir val="bar"/);assert.match(chart,/sz="2200"/)
  assert.deepEqual(after.slides[0].chart,{...before.slides[0].chart,kind:'bar'});assert.deepEqual(after.assets,before.assets)
  assert.deepEqual(after.slides[1].image,{...before.slides[1].image,fit:'contain'})
  assert.deepEqual(after.slides.slice(2).flatMap(s=>s.rows.slice(1)),before.slides[2].rows.slice(1))
  assert.deepEqual(after.slides[2].rows[0],after.slides[3].rows[0]);assert.equal(after.history.length,1)
})

test('native vision calls admit images into DSH and bind image capability to the prepared route',async()=>{
  let seen,saved
  const llm={listProviders:()=>[{id:route.provider}],listModels:async()=>[{id:route.model,inputModalities:['text','image']},{id:'text',inputModalities:['text']}],resolveModelInfo:async()=>({reasoning:{efforts:[{id:'off'}]}}),prepareCall:async config=>({config,inputModalities:['text','image'],async *stream(options){seen=options;yield{type:'text-delta',index:0,text:'{}'};yield{type:'finish',reason:{kind:'stop'}}}})}
  const refs=[{attachmentId:'content-addressed',mediaType:'image/png',bytes:png.length,width:1,height:1}]
  const native=nativeVisualModel(llm,{saveImages:async values=>{saved=values;return refs}})
  assert.equal((await native.routes()).length,1)
  assert.equal(await native.inspect(route,'policy','input',[{data:png,name:'slide-1.png'}],new AbortController().signal),'{}')
  assert.deepEqual(saved[0].data,png);assert.deepEqual(seen.messages[0].content[1],{type:'image',attachment:refs[0]});assert.deepEqual(seen.tools,[]);assert.equal(seen.sessionId,undefined);assert.equal(seen.reasoningEffort,'off')
  llm.prepareCall=async config=>({config,inputModalities:['text'],stream(){throw Error('must not dispatch')}})
  await assert.rejects(native.inspect(route,'policy','input',[{data:png,name:'slide.png'}],new AbortController().signal),/图片/)
})

test('native vision cancellation releases a hanging provider without automatic retry',async()=>{
  const controller=new AbortController();let started
  const waiting=new Promise(r=>{started=r})
  const native=nativeVisualModel({listProviders:()=>[{id:route.provider}],resolveModelInfo:async()=>({}),prepareCall:async config=>({config,inputModalities:['text','image'],stream:()=>({[Symbol.asyncIterator]:()=>({next:()=>{started();return new Promise(()=>{})},return:async()=>({done:true})})})})},{saveImages:async()=>[{}]})
  const pending=native.inspect(route,'policy','input',[{data:png,name:'slide.png'}],controller.signal);await waiting;controller.abort();await assert.rejects(pending,/停止/)
})

test('provider secrets and error bodies never enter visual model errors; output truncation is explicit',async()=>{
  const llm={listProviders:()=>[{id:route.provider}],resolveModelInfo:async()=>({}),prepareCall:async config=>({config,inputModalities:['text','image'],async *stream(){throw new Error('provider echoed sk-private-test-key-123456')}})}
  const native=nativeVisualModel(llm,{saveImages:async()=>[{}]})
  await assert.rejects(native.inspect(route,'policy','input',[{data:png,name:'slide.png'}],new AbortController().signal),e=>!e.message.includes('private-test-key')&&/未自动重试/.test(e.message))
  llm.prepareCall=async config=>({config,inputModalities:['text','image'],async *stream(){yield {type:'finish',reason:{kind:'max-tokens'}}}})
  await assert.rejects(native.inspect(route,'policy','input',[{data:png,name:'slide.png'}],new AbortController().signal),/输出上限/)
})
