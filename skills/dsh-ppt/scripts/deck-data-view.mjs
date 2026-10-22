import { createDataMath } from './deck-data-math.mjs'
import { chartColors, renderChartSvg } from './deck-media.mjs'

/** Only referenced excerpts and arithmetic enter the offline HTML, not full sources. */
export function renderDataView(manifest, theme) {
  if (!manifest.dataModel) return { css: '', body: '', script: '' }
  const model = manifest.dataModel
  const payload = { metrics:model.metrics.map(({source,...m})=>m),values:model.values,fingerprint:model.fingerprint,
    deckId:manifest.deckId,revision:manifest.revision,language:manifest.language,theme,
    slides:manifest.slides.map((s,i)=>({id:s.id,page:i+1,template:s.dataTemplate||{},chart:s.chart})) }
  const json=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
  return { css: DATA_CSS,body:'<dialog id="data-panel" aria-labelledby="data-title"></dialog>',
    script:`<script>(()=>{const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');const chartColors=${chartColors.toString()};const chart=${renderChartSvg.toString()};(${initDataView.toString()})(${json},(${createDataMath.toString()})(),chart);})();</script>` }
}

/** Embedded verbatim. All material text is written with DOM text APIs. */
function initDataView(data, math, chartRenderer) {
  const en=data.language==='en',L=(zh,english)=>en?english:zh,byId=new Map(data.metrics.map(m=>[m.id,m]));
  const panel=document.getElementById('data-panel'),controls=[],baseline=Object.fromEntries(data.metrics.filter(m=>m.kind==='input').map(m=>[m.id,m.value]));
  let parameters={...baseline},values=math.solve(data.metrics),valid=true,dirty=false,selection=data.metrics[0]?.id;
  for(const metric of data.metrics)if(metric.ast)math.inspect(metric.ast,new Set(byId.keys()));
  function el(tag,text,parent,attributes={}){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;for(const[key,value]of Object.entries(attributes))node.setAttribute(key,String(value));if(parent)parent.append(node);return node;}
  function button(text,parent,click){const node=el('button',text,parent,{type:'button'});node.addEventListener('click',event=>{event.stopPropagation();click(event);});return node;}
  const header=el('div',undefined,panel,{class:'data-head'});el('h2',L('数字溯源与现场推演','Data lineage and what-if'),header,{id:'data-title'});button(L('关闭','Close'),header,()=>panel.close());
  el('p',L('来源表示数字如何得到，不代表事实已核验。推演参数均为用户假设。','Lineage explains how numbers were obtained, not whether they are true. Adjustable parameters are assumptions.'),panel,{class:'data-muted'});
  const notice=el('div','',panel,{role:'status',class:'data-notice'}),error=el('div','',panel,{role:'alert',class:'data-error'});error.hidden=true;
  const scenario=el('section',undefined,panel);el('h3',L('现场推演','What-if assumptions'),scenario);
  for(const metric of data.metrics.filter(m=>m.kind==='input')){
    const row=el('div',undefined,scenario,{class:'data-control'}),label=el('label',metric.label,row,{for:'data-input-'+metric.id}),formatted=el('output','',label);
    const range=el('input',undefined,row,{type:'range',min:metric.min,max:metric.max,step:metric.step,value:metric.value,'aria-label':metric.label+' '+L('滑杆','slider')}),number=el('input',undefined,row,{type:'number',id:'data-input-'+metric.id,min:metric.min,max:metric.max,step:metric.step,value:metric.value});
    controls.push({metric,range,number,formatted});
    function change(event){const raw=event.target.value;const next={...parameters,[metric.id]:raw===''?NaN:Number(raw)};update(next);}
    range.addEventListener('input',change);number.addEventListener('input',change);
    if(metric.note)el('p',metric.note,row,{class:'data-muted'});
  }
  if(!controls.length)el('p',L('本工程没有可调假设，原始事实不会被滑杆修改。','No adjustable assumptions. Source facts cannot be changed with sliders.'),scenario);
  const actions=el('div',undefined,scenario,{class:'data-actions'});button(L('恢复已保存参数','Reset to saved values'),actions,()=>update({...baseline}));
  const save=button(L('保存推演参数','Save scenario parameters'),actions,()=>download('scenario.json',JSON.stringify({schemaVersion:1,deckId:data.deckId,revision:data.revision,fingerprint:data.fingerprint,parameters},null,2),'application/json'));
  if(window.parent!==window){save.disabled=true;save.title=L('在 DSH 工作台中确认并保存静态 PPTX','Confirm and save the static PPTX in the DSH workbench');}
  el('p',L('HTML 可离线推演。要生成对应的可编辑 PPTX，请在 DSH 工作台导入参数并确认保存。未保存推演时，旧 PPTX 的下载会暂缓。','HTML supports offline what-if. Import saved parameters into the DSH workbench and confirm to create the matching editable PPTX. Older PPTX downloads are blocked while values are unsaved.'),scenario,{class:'data-muted'});
  el('h3',L('追问数字出处','Inspect a number'),panel);
  const chooser=el('select',undefined,panel,{'aria-label':L('溯源指标','Trace metric')});data.metrics.forEach(m=>el('option',m.label,chooser,{value:m.id}));chooser.addEventListener('change',()=>{selection=chooser.value;showEvidence();});
  const evidence=el('section',undefined,panel,{class:'data-evidence'});
  const toggle=button(L('数字来源 / 推演','Sources / what-if'),document.getElementById('delivery-bar'),()=>open());toggle.id='data-toggle';
  function open(id,missing){if(id&&byId.has(id)){selection=id;chooser.value=id;}showEvidence(missing);if(!panel.open)panel.showModal();if(id||missing)evidence.scrollIntoView({block:'nearest'});}
  function showEvidence(missing){
    evidence.replaceChildren();
    if(missing){el('h3',L('此数字未关联原始材料','This number has no linked source'),evidence);el('p',L('请在 DSH 中提供来源，并用指标绑定替换固定数字。不能将相同数值自动当作同一来源。','Provide the source in DSH and bind a metric. Matching numeric values alone do not establish a common source.'),evidence);return;}
    const metric=byId.get(selection);if(!metric)return;
    el('h3',metric.label+' = '+math.format(values[metric.id],metric,data.language),evidence);
    if(metric.kind==='source'){
      el('strong',metric.evidence.name+' · '+metric.evidence.locator,evidence);el('pre',metric.evidence.excerpt,evidence);
      const more=el('details',undefined,evidence);el('summary',L('来源快照校验值','Source snapshot checksum'),more);el('code','SHA-256: '+metric.evidence.sha256,more);
    }else if(metric.kind==='input')el('p',L('用户假设；不是从源材料证明的事实。','User assumption, not a fact established by source material.')+(metric.note?' '+metric.note:''),evidence);
    else{
      el('pre','= '+metric.formula,evidence);el('p',L('计算输入（点击继续追问）：','Inputs (click to trace further):'),evidence);
      for(const id of metric.dependencies){const dependency=byId.get(id);button(dependency.label+' = '+math.format(values[id],dependency,data.language),evidence,()=>open(id));}
    }
  }
  function fragment(template){
    const result=document.createDocumentFragment(),pattern=/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g;let end=0;
    for(const match of template.matchAll(pattern)){result.append(document.createTextNode(template.slice(end,match.index)));const metric=byId.get(match[1]);const number=el('button',math.format(values[metric.id],metric,data.language),result,{type:'button',class:'data-number','data-metric':metric.id,title:L('查看数字出处','Inspect source')});end=match.index+match[0].length;}
    result.append(document.createTextNode(template.slice(end)));return result;
  }
  function fill(node,template){if(node&&typeof template==='string')node.replaceChildren(fragment(template));}
  function graphFor(template,solved){const graph=structuredClone(template),text=value=>typeof value==='string'?value.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g,(_,id)=>math.format(solved[id],byId.get(id),data.language)):value;graph.categories=graph.categories.map(text);graph.series=graph.series.map(s=>({...s,name:text(s.name),values:s.values.map(v=>typeof v==='string'&&/^\{\{[A-Za-z][A-Za-z0-9]*\}\}$/.test(v)?solved[v.slice(2,-2)]:Number(v))}));graph.unit=text(graph.unit);graph.caption=text(graph.caption);if(graph.kind==='pie'&&(graph.series[0].values.some(v=>v<0)||graph.series[0].values.reduce((a,b)=>a+b,0)<=0))throw new Error(L('饼图数值需非负且总和大于零','Pie values must be non-negative with a positive total'));return graph;}
  function missingNumbers(root){
    const targets=root.querySelectorAll('h1,h2,.statement-title,.quote-text,.subtitle,.quote-attr,.deck-table th,.deck-table td,li,.media-body p,.media-caption');
    const texts=[];for(const target of targets){const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(node.parentElement?.closest('.data-number,svg,.chart-data'))continue;texts.push(node);}}
    for(const node of new Set(texts)){const pattern=/[-+]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?[%％]?/g,content=node.textContent,matches=[...content.matchAll(pattern)];if(!matches.length)continue;const output=document.createDocumentFragment();let end=0;for(const match of matches){output.append(document.createTextNode(content.slice(end,match.index)));el('button',match[0],output,{type:'button',class:'data-number data-unlinked','data-unlinked':'1',title:L('未关联来源','Source not linked')});end=match.index+match[0].length;}output.append(document.createTextNode(content.slice(end)));node.replaceWith(output);}
  }
  function redraw(){
    for(const slide of data.slides){const root=document.querySelectorAll('.slide')[slide.page-1];if(!root)continue;const template=slide.template;
      fill(root.querySelector('.media-title,h1,h2,.statement-title,.quote-text'),template.title);
      fill(root.querySelector('.subtitle,.quote-attr,.media-body > p'),template.subtitle);fill(root.querySelector('.kicker'),template.kicker);
      if(template.bullets)root.querySelectorAll('li').forEach((li,i)=>fill(li,template.bullets[i]));
      if(template.rows)root.querySelectorAll('.deck-table tr').forEach((row,r)=>Array.from(row.children).forEach((cell,c)=>fill(cell,template.rows[r]?.[c])));
      if(template.notes)root.dataset.notes=template.notes.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g,(_,id)=>math.format(values[id],byId.get(id),data.language));
      if(template.chart){const graph=graphFor(template.chart,values),area=root.querySelector('.media-chart');if(area)area.innerHTML=chartRenderer(graph,data.theme);fill(root.querySelector('.media-caption'),template.chart.caption);}
      if(slide.chart&&!root.querySelector('.data-chart-trace')){const link=button(L('图表数字来源','Chart sources'),root.querySelector('.media-canvas'),()=>{const id=Object.keys(template.chart||{}).length?[...JSON.stringify(template.chart).matchAll(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g)][0]?.[1]:null;open(id,!id);});link.className='data-chart-trace';}
      missingNumbers(root);
    }
    for(const {metric,range,number,formatted}of controls){range.value=String(parameters[metric.id]);number.value=String(parameters[metric.id]);formatted.textContent=' '+math.format(values[metric.id],metric,data.language);}
    notice.textContent=dirty?L('当前为未保存推演，PPTX 尚未更新。','Unsaved what-if values. The PPTX has not been updated.'):L('当前显示已保存的静态基线；公式和假设随 PPTX 附上。','Showing saved values; formulas and assumptions accompany the PPTX.');
    downloadState();
    showEvidence();window.dispatchEvent(new Event('dsh-data-change'));
  }
  function downloadState(){save.disabled=window.parent!==window||!valid;document.querySelectorAll('a[download]').forEach(link=>{if(/\.(?:pptx|json)(?:[?#]|$)/i.test(link.href)){if(dirty||!valid)link.setAttribute('aria-disabled','true');else link.removeAttribute('aria-disabled');}});}
  function notifyState(){window.__dshData.onChange?.({...parameters},dirty,valid);}
  function update(next,notify=true){
    try{const complete={...baseline,...next},solved=math.solve(data.metrics,complete);for(const slide of data.slides)if(slide.template.chart)graphFor(slide.template.chart,solved);parameters=complete;values=solved;valid=true;dirty=Object.keys(baseline).some(id=>parameters[id]!==baseline[id]);error.hidden=true;redraw();if(notify)notifyState();return true;}
    catch(reason){valid=false;error.hidden=false;error.textContent=L('无法计算，请检查数值或恢复已保存参数：','Cannot calculate. Check values or reset: ')+reason.message;downloadState();if(notify)notifyState();return false;}
  }
  function download(name,text,type){if(!valid)return;const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  document.getElementById('stage').addEventListener('click',event=>{const target=event.target.closest('[data-metric],[data-unlinked]');if(target){event.preventDefault();event.stopImmediatePropagation();open(target.dataset.metric,!!target.dataset.unlinked);}},true);
  document.addEventListener('click',event=>{const link=event.target.closest('a[download]');if(link&&/\.(?:pptx|json)(?:[?#]|$)/i.test(link.href)&&(dirty||!valid)){event.preventDefault();event.stopImmediatePropagation();open();}},true);
  panel.addEventListener('keydown',event=>event.stopPropagation());
  for(const name of ['wheel','touchstart','touchend'])panel.addEventListener(name,event=>event.stopPropagation(),{passive:true});
  document.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='d'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest('input,textarea,select')){event.preventDefault();open();}});
  window.__dshData={getState:()=>({schemaVersion:1,deckId:data.deckId,revision:data.revision,fingerprint:data.fingerprint,parameters:{...parameters},dirty,valid}),setParameters:next=>update(next,false),onChange:null};redraw();
}

const DATA_CSS=`
.data-number{font:inherit!important;line-height:inherit!important;color:inherit!important;background:transparent!important;border:0!important;border-bottom:2px dotted var(--accent)!important;border-radius:0!important;padding:0!important;cursor:pointer;display:inline;white-space:inherit;letter-spacing:inherit}.data-number.data-unlinked{border-bottom-color:var(--muted)!important}
.data-chart-trace{position:absolute;right:6.4%;top:18%;font:12px var(--font-body);border:1px solid var(--muted);border-radius:9px;padding:6px 9px;background:var(--panel);color:var(--fg);cursor:pointer}
#data-panel{background:var(--panel);color:var(--fg);border:1px solid var(--muted);border-radius:18px;width:min(700px,calc(100vw - 24px));max-height:88vh;padding:24px;overflow:auto;font:15px/1.6 var(--font-body)}#data-panel::backdrop{background:#0009}
#data-panel h2{font-size:23px;margin:0;max-width:none}#data-panel h3{font-size:17px;margin:20px 0 8px}#data-panel p{font-size:14px}.data-head,.data-actions{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
#data-panel button,#data-panel select,#data-panel input[type=number]{font:inherit;background:var(--bg);color:var(--fg);border:1px solid var(--muted);border-radius:9px;padding:8px 11px}#data-panel button{cursor:pointer}#data-panel button:disabled{opacity:.45;cursor:default}#data-panel select{width:100%}
.data-muted{color:var(--muted)}.data-control{display:grid;grid-template-columns:minmax(0,1fr) 115px;gap:8px;margin:14px 0}.data-control label{grid-column:1/-1}.data-control p{grid-column:1/-1;margin:0}.data-control input{min-width:0;width:100%;accent-color:var(--accent)}.data-control output{font-variant-numeric:tabular-nums;color:var(--accent)}
.data-notice,.data-error{padding:10px 12px;border:1px solid var(--muted);border-radius:9px;margin:12px 0}.data-error{color:#e67878}.data-evidence pre,.data-evidence code{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}.data-evidence button{display:block;margin:7px 0;text-align:left}
a[aria-disabled=true]{opacity:.5;cursor:not-allowed}@media(max-width:640px){#data-panel{padding:16px}.data-control{grid-template-columns:minmax(0,1fr) 105px}#delivery-bar{flex-wrap:wrap;row-gap:5px}#delivery-bar button,#delivery-bar a{font-size:12px;padding:7px 9px}}
@media print{#data-panel,.data-chart-trace{display:none!important}.data-number{border:0!important}}
`
