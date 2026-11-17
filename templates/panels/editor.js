function pptText(zh, en) { return languageOf() === 'en' ? en : zh; }

function PptPages({ project, selected, busy, imagePending, onChoose, onDuplicate, onAppend, dirty, dataDirty }) {
  const [newOpen, setNewOpen] = React.useState(false);
  const [archetype, setArchetype] = React.useState('cards');
  const blocked = busy || dirty || imagePending || dataDirty || project.slides.length >= 120;
  const issues = project.quality?.issues || [];
  const newOptions = [
    ['cards', pptText('Bento / 支柱卡片页', 'Bento / pillar cards')],
    ['kpi', pptText('大数字指标 KPI 页', 'KPI metrics')],
    ['comparison', pptText('双栏 / 痛点对比页', 'Two-column comparison')],
    ['process', pptText('流程 / 时间轴页', 'Process / timeline')],
    ['matrix', pptText('2×2 四象限矩阵页', '2×2 Matrix')],
    ['gantt', pptText('甘特图路线图页', 'Gantt roadmap')],
    ['architecture', pptText('分层系统架构图页', 'Architecture diagram')],
    ['harvey', pptText('哈维球竞品矩阵页', 'Harvey-ball matrix')],
    ['tam', pptText('TAM/SAM/SOM 同心圆页', 'TAM/SAM/SOM concentric')],
    ['org', pptText('组织架构 / 团队图谱页', 'Org chart / team')],
    ['table', pptText('咨询表 / 学术三线表', 'Table / 3-line booktabs')],
    ['callout', pptText('核心结论与行动清单', 'Key takeaways & callout')],
    ['bullets', pptText('精炼要点列表页', 'Concise bullets')],
    ['statement', pptText('单句核心观点页', 'Statement breather')],
    ['section', pptText('章节过渡页', 'Section divider')],
    ['agenda', pptText('汇报目录页', 'Agenda')],
    ['closing', pptText('结束与行动号召页', 'Closing & CTA')],
  ];
  return h('aside', { className: 'ppt-page-rail', 'aria-label': pptText('幻灯片目录', 'Slide outline') },
    h('h3', null, pptText('幻灯片', 'Slides')),
    h('div', { className: 'ppt-page-buttons' }, project.slides.map((row, index) => {
      const slideIssues = issues.filter(item => item.slide === index + 1 || (item.slideId && item.slideId === row.id));
      const severity = slideIssues.some(item => item.severity === 'error') ? 'error' : slideIssues.length ? 'warning' : '';
      return h('button', {
        type: 'button',
        key: row.id,
        className: 'ppt-slide-card',
        'data-dsh-card': '',
        'aria-current': row.id === selected ? 'true' : undefined,
        disabled: busy || imagePending,
        onClick: () => onChoose(row),
      },
        h('span', { className: 'ppt-page-number' }, String(index + 1).padStart(2, '0')),
        h('span', { className: 'ppt-page-body' },
          h('span', { className: 'ppt-page-title-line' },
            h('span', { className: 'ppt-page-label' }, row.title || t('未命名页')),
            severity ? h('span', {
              className: 'ppt-page-dot',
              'data-severity': severity,
              title: slideIssues.map(it => languageOf() === 'en' ? (it.messageEn || it.message) : it.message).join(' · '),
              'aria-label': severity === 'error' ? pptText('有待修复错误', 'Has error') : pptText('有排版提醒', 'Has warning'),
            }) : null),
          h('span', { className: 'w-tag ppt-page-layout-tag' }, typeof pptLayoutLabel === 'function' ? pptLayoutLabel(row.layout) : (row.layout || 'bullets'))));
    })),
    h('div', { className: 'ppt-rail-actions' },
      newOpen && onAppend ? h('div', { className: 'ppt-add-slide-box', 'data-dsh-card': '' },
        h('label', null, pptText('选择新增页面版式', 'Choose new slide archetype'),
          h('select', { value: archetype, disabled: blocked, onChange: e => setArchetype(e.target.value) },
            newOptions.map(([id, label]) => h('option', { key: id, value: id }, label)))),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { variant: 'primary', icon: 'plus', disabled: blocked, onClick: () => { setNewOpen(false); onAppend(archetype); } }, pptText('确认新增', 'Add slide')),
          h(W.Button, { variant: 'ghost', icon: 'close', disabled: busy, onClick: () => setNewOpen(false) }, pptText('收起', 'Cancel'))))
      : onAppend ? h(W.Button, { icon: 'plus', className: 'ppt-add-slide', disabled: blocked, onClick: () => setNewOpen(true) }, pptText('新建页面', 'New slide')) : null,
      h(W.Button, { icon: 'copy', className: 'ppt-duplicate', disabled: blocked, onClick: onDuplicate }, t('复制本页'))));
}

const PPT_WORKBENCH_CSS = `
.ppt-workbench.pptw{--fg:var(--w-text);--fg-muted:var(--w-muted);--bg:var(--w-canvas);--bg-surface:var(--w-bg);--border:var(--w-border);max-width:none;margin:0}
.ppt-workbench .ppt-editor{--ppt-inspector:340px;display:grid;grid-template-columns:204px minmax(0,1fr) var(--ppt-inspector);flex:1;min-height:520px}
.ppt-workbench .ppt-editor[data-view=style],.ppt-workbench .ppt-editor[data-view=visual],.ppt-workbench .ppt-editor[data-view=rehearsal],.ppt-workbench .ppt-editor[data-view=data]{--ppt-inspector:410px}
.ppt-workbench .ppt-page-rail{padding:20px 14px 20px 0;border-inline-end:var(--dsh-control-border-width,0.5px) solid var(--w-border);min-width:0;display:flex;flex-direction:column;gap:14px}
.ppt-workbench .ppt-page-rail h3{margin:0;font-size:14.5px;color:var(--w-muted);font-weight:600}
.ppt-workbench .ppt-page-buttons{display:flex;flex-direction:column;gap:6px;max-height:calc(100dvh - 340px);overflow:auto;overscroll-behavior:contain;min-width:0;padding:2px}
.ppt-workbench .ppt-page-buttons>button{border:var(--dsh-control-border-width,1px) solid transparent;border-inline-start:3px solid transparent;border-radius:var(--dsw-radius-sm,8px);padding:10px 10px;display:flex;align-items:flex-start;gap:10px;background:var(--w-canvas);min-width:0;font-size:13px;line-height:1.45;text-align:start;overflow-wrap:anywhere}
.ppt-workbench .ppt-page-buttons>button:hover:not(:disabled){background:var(--dsh-surface-spotlight,var(--w-bg));border-color:var(--w-border)}
.ppt-workbench .ppt-page-buttons>button[aria-current=true]{border-color:var(--w-border);border-inline-start-color:var(--w-accent);background:var(--w-selected);color:var(--w-text);font-weight:550}
.ppt-workbench .ppt-page-number{font-variant-numeric:tabular-nums;color:var(--w-muted);font-size:11.5px;font-weight:600;flex-shrink:0;padding-top:1px}
.ppt-workbench .ppt-page-buttons>button[aria-current=true] .ppt-page-number{color:var(--w-accent)}
.ppt-workbench .ppt-page-body{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.ppt-workbench .ppt-page-title-line{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0}
.ppt-workbench .ppt-page-layout-tag{align-self:flex-start;font-size:11px;padding:0 6px}
.ppt-workbench .ppt-page-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--dsw-alias-state-warn-primary)}
.ppt-workbench .ppt-page-dot[data-severity=error]{background:var(--dsw-alias-state-error-primary)}
.ppt-workbench .ppt-rail-actions{margin-top:auto;display:flex;flex-direction:column;gap:8px}
.ppt-workbench .ppt-rail-actions .w-button{width:100%;justify-content:flex-start;font-size:13px}
.ppt-workbench .ppt-add-slide-box{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:10px;background:var(--w-canvas);display:flex;flex-direction:column;gap:8px}
.ppt-workbench .ppt-add-slide-box label{font-size:12px;color:var(--w-muted);margin:0;display:grid;gap:6px}
.ppt-workbench .ppt-duplicate{font-size:13px}
.ppt-workbench .ppt-canvas-region{display:flex;flex-direction:column;gap:14px;padding:20px 22px;background:var(--w-bg);min-width:0}
.ppt-workbench .ppt-preview-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ppt-workbench .ppt-preview-tools .w-button{font-size:12.5px;min-height:30px;padding:5px 10px}
.ppt-workbench .ppt-preview-tools [aria-pressed=true]{background:var(--w-selected);border-color:var(--w-accent);color:var(--w-accent);font-weight:600}
.ppt-workbench .ppt-preview-tools .w-icon-button{margin-inline-start:auto}
.ppt-workbench .preview{width:100%;aspect-ratio:16/9;border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);background:var(--w-soft,#f0f4fa);box-shadow:var(--dsw-elevation-panel,0 6px 20px rgba(15,23,42,0.06));overflow:clip;min-height:0;margin:auto 0;position:relative}
.ppt-workbench .ppt-split-preview,.ppt-workbench .ppt-canvas-visual-diff{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}
.ppt-workbench .ppt-split-pane{display:flex;flex-direction:column;gap:6px;min-width:0}
.ppt-workbench .ppt-split-pane figcaption{font-size:12px;font-weight:600;color:var(--w-muted)}
.ppt-workbench .ppt-canvas-diff-card{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);padding:14px;background:var(--w-canvas);display:flex;flex-direction:column;gap:10px}
.ppt-workbench .ppt-canvas-diff-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.ppt-workbench .ppt-issue-list{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.ppt-workbench .ppt-issue-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 10px;border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);background:var(--w-bg)}
.ppt-workbench .ppt-issue-row p{margin:0;font-size:12.5px;line-height:1.55}
.ppt-workbench .ppt-issue-jump{flex-shrink:0;font-size:12px;min-height:28px;padding:3px 9px}
.ppt-workbench .preview>.ppt-fullscreen-exit{display:none}
.ppt-workbench .preview:fullscreen>.ppt-fullscreen-exit{display:inline-flex;position:absolute;inset:16px 16px auto auto;z-index:10;background:var(--w-primary);color:var(--w-on-primary);border:1px solid var(--w-border)}
.ppt-workbench .preview:fullscreen{width:100dvw;height:100dvh;aspect-ratio:auto;border:0;border-radius:0;margin:0;background:var(--dsw-alias-bg-document-preview,#1f232b);box-shadow:none}
.ppt-workbench .preview:fullscreen iframe{background:var(--dsw-alias-bg-document-preview,#1f232b)}
.ppt-workbench .preview .render-page{width:100%;height:100%;object-fit:contain}
.ppt-workbench .ppt-preview-help{font-size:12px;color:var(--w-muted);line-height:1.65}
.ppt-workbench .ppt-preview-help+details{background:var(--w-canvas);border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:12px 14px}
.ppt-workbench .ppt-preview-help+details summary{font-size:12.5px}
.ppt-workbench .ppt-inspector{padding:20px 0 20px 20px;border-inline-start:var(--dsh-control-border-width,0.5px) solid var(--w-border);min-width:0;overflow:auto;overscroll-behavior:contain;overflow-wrap:anywhere}
.ppt-workbench .ppt-inspector-panel[hidden]{display:none!important}
.ppt-workbench .ppt-inspector .card{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);padding:16px;margin:0 0 16px;background:var(--w-canvas);box-shadow:none}
.ppt-workbench .ppt-inspector h3{font-size:15.5px;margin:0 0 14px}
.ppt-workbench .ppt-inspector .card>div>label,.ppt-workbench .ppt-inspector .card>label{font-size:12.5px;margin:14px 0 5px;color:var(--w-muted)}
.ppt-workbench .ppt-inspector input,.ppt-workbench .ppt-inspector textarea,.ppt-workbench .ppt-inspector select{font-size:13.5px}
.ppt-workbench .ppt-inspector textarea{min-height:72px}
.ppt-workbench .ppt-inspector .tools{gap:8px;margin-top:16px}
.ppt-workbench .ppt-inspector .tools button{font-size:12.5px;min-height:32px;padding:6px 10px}
.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:1fr}
.ppt-workbench .ppt-inspector .before-after,.ppt-workbench .ppt-inspector .data-before-after{grid-template-columns:1fr}
.ppt-workbench .ppt-inspector .coaching{margin-top:0}
.ppt-workbench .ppt-inspector .coaching p,.ppt-workbench .ppt-inspector .data-workbench p{font-size:13px;line-height:1.65}
.ppt-workbench .ppt-inspector .coaching blockquote{margin:10px 0;padding-inline-start:12px}
.ppt-workbench .ppt-inspector .muted{font-size:12px;color:var(--w-muted)}
.ppt-workbench .ppt-inspector .data-workbench .data-controls{grid-template-columns:1fr}
.ppt-workbench .ppt-structure{border-top:var(--dsh-control-border-width,0.5px) solid var(--w-border);padding-top:14px;margin-top:14px}
.ppt-workbench .ppt-structure .w-button{font-size:12.5px}
.ppt-workbench.pptw button.primary,:is(.ppt-workbench,.ppt-dialog) button.primary{background:var(--w-primary);color:var(--w-on-primary);border-color:var(--w-primary)}
.ppt-workbench .ppt-library{max-width:1000px;padding:12px 0 24px}
.ppt-workbench .ppt-library .w-row-button{padding:16px;border:0;border-radius:0;background:transparent}
:is(.ppt-workbench,.ppt-dialog) .notice{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);background:var(--w-bg);color:var(--w-text)}
:is(.ppt-workbench,.ppt-dialog) .notice.error{color:var(--dsw-alias-state-error-primary,#ad3636);background:var(--dsw-alias-interactive-bg-hover-danger,var(--w-bg))}
.ppt-workbench .ppt-data-warning{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
:is(.ppt-workbench,.ppt-dialog) .ppt-downloads{display:flex;flex-direction:column;gap:14px}
:is(.ppt-workbench,.ppt-dialog) .ppt-downloads .tools{display:flex;flex-direction:column;align-items:stretch;gap:8px}
:is(.ppt-workbench,.ppt-dialog) .ppt-downloads .w-button,:is(.ppt-workbench,.ppt-dialog) .ppt-downloads button{font-size:13.5px;min-height:36px;justify-content:flex-start}
.ppt-workbench .ppt-image-section{border-block:var(--dsh-control-border-width,0.5px) solid var(--w-border);margin:16px 0;padding:14px 0}
.ppt-workbench .ppt-image-section>summary{font-size:13.5px}
.ppt-workbench .ppt-image-section input,.ppt-workbench .ppt-image-section select{width:100%;margin-bottom:12px}
.ppt-workbench .ppt-image-section input[type=file]{font-size:12px}
.ppt-workbench :focus-visible{outline:2px solid var(--w-accent);outline-offset:2px}
.ppt-workbench .w-dialog,.ppt-dialog.w-dialog{max-width:680px}
.ppt-workbench .ppt-inspector .image-preview{max-height:180px;object-fit:contain;background:var(--w-soft)}
@container dsh-workbench (max-width:1100px){.ppt-workbench .ppt-editor{grid-template-columns:170px minmax(0,1fr)}.ppt-workbench .ppt-inspector{grid-column:1/-1;border-inline-start:0;border-top:var(--dsh-control-border-width,0.5px) solid var(--w-border);padding:20px 0}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ppt-workbench .ppt-canvas-region{padding-inline-end:0}.ppt-workbench .ppt-page-buttons{max-height:400px}.ppt-workbench .ppt-split-preview,.ppt-workbench .ppt-canvas-visual-diff{grid-template-columns:1fr}}
@container dsh-workbench (max-width:760px){.ppt-workbench .ppt-editor{display:flex;flex-direction:column;min-height:0}.ppt-workbench .ppt-page-rail{border-inline-end:0;border-bottom:var(--dsh-control-border-width,0.5px) solid var(--w-border);padding:14px 0}.ppt-workbench .ppt-page-buttons{display:flex;flex-direction:row;max-height:150px;overflow:auto;gap:8px}.ppt-workbench .ppt-page-buttons>button{min-width:150px;max-width:210px;flex-shrink:0}.ppt-workbench .ppt-rail-actions{flex-direction:row;flex-wrap:wrap}.ppt-workbench .ppt-rail-actions .w-button{width:auto}.ppt-workbench .ppt-canvas-region{padding:16px 0;background:var(--w-canvas)}.ppt-workbench .preview{margin:0;min-height:0}.ppt-workbench .ppt-preview-tools .w-icon-button{margin-inline-start:0}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:1fr}.ppt-workbench .ppt-preview-tools .w-button{font-size:12px}.ppt-workbench .ppt-inspector{padding:18px 0}}
`;
