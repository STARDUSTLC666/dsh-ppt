function pptText(zh, en) { return languageOf() === 'en' ? en : zh; }

const PPT_QUICK_PROMPTS = Object.freeze([
  {
    id: 'quarterly',
    zhLabel: '季度经营复盘',
    enLabel: 'Quarterly review',
    zhPrompt: '请根据当前工作区材料制作季度经营复盘演示文稿，自动匹配明亮咨询风与 KPI/价值链箭头/瀑布图/甘特图，输出 HTML、可编辑 PPTX 与工程包。',
    enPrompt: 'Turn the workspace materials into an executive quarterly review deck with KPI cards, value-chain chevrons, waterfall bridge, and Gantt roadmap. Export HTML, editable PPTX, and project JSON.',
  },
  {
    id: 'absorb-corp',
    zhLabel: '吸收公司模板出稿',
    enLabel: 'Clone company .pptx',
    zhPrompt: '请先调用 ppt_absorb 吸收我的参考模板 ref.pptx 的色板、字体、Logo 与页面骨架（cloneStructure: true），再将这份汇报整理为同款风格的演示文稿。',
    enPrompt: 'Run ppt_absorb on ref.pptx to absorb its brand palette, fonts, logo, and slide skeleton (cloneStructure: true), then turn my notes into a matching presentation.',
  },
  {
    id: 'academic',
    zhLabel: '论文答辩与三线表',
    enLabel: 'Academic defense',
    zhPrompt: '请把这篇论文与实验结果整理为清澄学术风答辩 PPT，采用 Beamer 通栏页眉、无竖线学术三线表（booktabs）与方法流程图，结论先行。',
    enPrompt: 'Turn this paper and experimental data into an academic defense deck using Beamer chrome, booktabs 3-line tables, and methodology diagrams with action titles.',
  },
  {
    id: 'pitch',
    zhLabel: '创投融资简报',
    enLabel: 'Daylight pitch deck',
    zhPrompt: '请将这份商业计划整理为适合投资人屏幕阅读的硅谷创投明亮风 BP（venture-daylight），包含痛点对比、增长 KPI、TAM/SAM/SOM 同心圆与竞品哈维球矩阵。',
    enPrompt: 'Build a screen-friendly venture-daylight investor deck covering problem/solution, traction KPIs, concentric TAM/SAM/SOM sizing, and a Harvey-ball competitive matrix.',
  },
]);

function PptWorkflowGuide({ defaultOpen = false, onOpenCreate, onCopied }) {
  const [copiedId, setCopiedId] = React.useState('');
  function copyPrompt(item) {
    const text = languageOf() === 'en' ? item.enPrompt : item.zhPrompt;
    try {
      navigator.clipboard?.writeText(text).then(() => {
        setCopiedId(item.id);
        onCopied?.(pptText('已复制对话提示词，可直接粘贴到聊天框发送。', 'Prompt copied. Paste it into chat to generate.'));
        setTimeout(() => setCopiedId(prev => prev === item.id ? '' : prev), 2200);
      }).catch(() => {});
    } catch { /* ignore */ }
  }
  return h('details', { className: 'ppt-workflow-guide', open: defaultOpen || undefined },
    h('summary', null, pptText('使用流程指引与一句话提问模板（4 步快速交付）', 'How humans use this workbench · 4-step workflow & prompt templates')),
    h('div', { className: 'ppt-workflow-body' },
      h('ol', { className: 'ppt-workflow-steps' },
        h('li', null, h('strong', null, pptText('1. 起稿或导入翻新：', '1. Start or import: ')), pptText('点右上角「新建演示文稿」选 20 套蓝图 / 贴大纲出稿，或点击「导入 PPTX 翻新」一键把存量老旧 .pptx 变成高颜值可编辑工程。', 'Click New presentation for 20 blueprints or notes, or Import & Modernize .pptx to turn legacy slides into an editable deck.')),
        h('li', null, h('strong', null, pptText('2. 精修结构与公式：', '2. Shape slides & math: ')), pptText('点击画面文字直接定位输入框；在「内容编辑」一键切换 Bento、KPI、不等宽市场图、桑基图、SWOT、波特价值链、甘特图、架构图、哈维球与学术三线表，支持 LaTeX 原生公式。', 'Click slide text to focus its field; switch among Bento, KPI, Marimekko, Sankey, SWOT, Porter value chain, Gantt, architecture, Harvey balls, 3-line tables & native LaTeX math.')),
        h('li', null, h('strong', null, pptText('3. 换肤与 Office 导回：', '3. Restyle & Office sync: ')), pptText('在「风格与母版」一键套用名家范本、切换 24 套主题，或上传「Office 修改稿」把外部微调导回工作台更新（支持撤销）。', 'Apply 8 master presets, switch 24 themes, or sync an Office-edited .pptx back into this project with full undo support.')),
        h('li', null, h('strong', null, pptText('4. 演讲提词与交付：', '4. Present & deliver: ')), pptText('按需渲染并排核对真实 PPTX；HTML 放映按 P 开启双屏演讲者提词台（含 L 键激光笔），下载 panel 可导出「演讲讲义 (.md)」与分享成品包。', 'Inspect rendered PPTX side-by-side; press P in HTML playback for Dual-Screen Presenter View (with L laser pointer), and export Handout (.md) or Share ZIP.'))),
      h('div', { className: 'ppt-workflow-prompts' },
        h('span', { className: 'w-muted' }, pptText('复制对话指令：', 'Copy chat prompt:')),
        PPT_QUICK_PROMPTS.map(item => h(W.Button, {
          key: item.id,
          size: 'sm',
          icon: copiedId === item.id ? 'check' : 'copy',
          'data-copied': copiedId === item.id ? 'true' : undefined,
          onClick: () => copyPrompt(item),
        }, copiedId === item.id ? pptText('已复制', 'Copied') : pptText(item.zhLabel, item.enLabel))),
        onOpenCreate ? h(W.Button, { size: 'sm', variant: 'primary', icon: 'plus', onClick: onOpenCreate }, pptText('直接新建演示文稿', 'Create in workbench')) : null)));
}

function PptCreateDialog({ open, busy, initialMode = 'create', onClose, onCreate, onCreateDemo, onImport, onImportOffice, onError }) {
  const fieldId = React.useId();
  const [meta, setMeta] = React.useState({ themes: [], templates: [] });
  const [dialogMode, setDialogMode] = React.useState(initialMode);
  const [title, setTitle] = React.useState('');
  const [template, setTemplate] = React.useState('');
  const [theme, setTheme] = React.useState('auto');
  const [content, setContent] = React.useState('');
  const [refFile, setRefFile] = React.useState(null);
  const [cloneStructure, setCloneStructure] = React.useState(true);
  const [importFile, setImportFile] = React.useState(null);
  const [officeFile, setOfficeFile] = React.useState(null);
  const [targetMinutes, setTargetMinutes] = React.useState('');
  const [preserveSourceTheme, setPreserveSourceTheme] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDialogMode(initialMode || 'create');
    let cancelled = false;
    action({ operation: 'catalog-meta', lang: languageOf() }).then(res => {
      if (!cancelled && res?.ok) {
        setMeta({
          themes: Array.isArray(res.themes) ? res.themes : [],
          templates: Array.isArray(res.templates) ? res.templates : [],
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, initialMode]);

  if (!open) return null;
  const disabled = busy || submitting;

  function fillSampleOutline() {
    if (!title.trim()) setTitle(pptText('Q4 核心业务进展与下阶段规划', 'Q4 Business Progress & Next-Quarter Plan'));
    setContent(languageOf() === 'en'
      ? '# Q4 Business Progress & Next-Quarter Plan\n\n## Headline Metrics Exceeded Targets\n- **Quarterly ARR**: $18.5M (+42% YoY)\n- **Net Dollar Retention**: 118% across enterprise cohorts\n- **Deployment Cycle**: Reduced from 14 days to 5 days\n\n## End-to-End Value Chain Efficiency\n- **Demand Intake**: Automated qualification raised hit-rate to 64%\n- **Agile Delivery**: Standardized templates cut rework by 50%\n- **Customer Expansion**: 38% of accounts adopted multi-seat plans\n\n## Key Bottlenecks & Mitigations\n- Onboarding backlog in mid-market: Ship self-serve import wizard in W2\n- Cross-team handoff delays: Enforce single-owner milestone gates'
      : '# Q4 核心业务进展与下阶段规划\n\n## 核心经营指标超额达成\n- **季度经常性收入**：突破 1.85 亿元（同比增长 +42%）\n- **净收入留存率 NRR**：提升至 118%，标杆续费率稳健\n- **平均交付周期**：由 14 天压缩至 5 天\n\n## 端到端业务价值链提效复盘\n- **需求准入**：分级筛选机制将有效立项率提升至 64%\n- **敏捷交付**：标准化母版与自动门禁减少 50% 返工\n- **规模增购**：38% 存量客户完成多模块扩购\n\n## 当前瓶颈与应对举措对比\n- 中腰部客户上手慢：下周上线一键导入向导与场景模板\n- 跨组联调周期长：建立单点责任人与双周里程碑卡点');
  }

  function handleRefSelect(file) {
    if (!file) { setRefFile(null); return; }
    if (!/\.pptx$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError?.(pptText('请选择 24 MiB 以内的 .pptx 参考文件。', 'Choose a reference .pptx file up to 24 MiB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRefFile({ name: file.name, data: String(reader.result || '') });
    };
    reader.onerror = () => onError?.(pptText('无法读取参考 PPTX，请重试。', 'Could not read the reference PPTX.'));
    reader.readAsDataURL(file);
  }

  function handleImportSelect(file) {
    if (!file) { setImportFile(null); return; }
    if (!/\.pptx$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError?.(pptText('请选择 24 MiB 以内的 .pptx 文件。', 'Choose a .pptx file up to 24 MiB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImportFile({ name: file.name, data: String(reader.result || '') });
    };
    reader.onerror = () => onError?.(pptText('无法读取 PPTX 文件，请重试。', 'Could not read the PPTX file.'));
    reader.readAsDataURL(file);
  }

  function handleOfficeSelect(file) {
    if (!file) { setOfficeFile(null); return; }
    if (!/\.(xlsx|csv|tsv|docx)$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError?.(pptText('请选择 24 MiB 以内的 .xlsx、.csv、.tsv 或 .docx 文件。', 'Choose an .xlsx, .csv, .tsv, or .docx file up to 24 MiB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOfficeFile({ name: file.name, data: String(reader.result || '') });
    };
    reader.onerror = () => onError?.(pptText('无法读取 Office 文档，请重试。', 'Could not read the Office document.'));
    reader.readAsDataURL(file);
  }

  async function submitOffice() {
    if (!officeFile?.data || !onImportOffice) return;
    setSubmitting(true);
    try {
      const mins = targetMinutes.trim() ? Number(targetMinutes.trim()) : undefined;
      await onImportOffice({
        fileName: officeFile.name,
        data: officeFile.data,
        theme: theme || 'auto',
        lang: languageOf(),
        ...(mins && Number.isFinite(mins) && mins >= 1 ? { targetMinutes: mins } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitImport() {
    if (!importFile?.data || !onImport) return;
    setSubmitting(true);
    try {
      await onImport({
        data: importFile.data,
        modernize: true,
        preserveSourceTheme,
        theme: preserveSourceTheme ? 'auto' : (theme || 'auto'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreate() {
    const effectiveTitle = title.trim() || (template ? (meta.templates.find(tp => tp.id === template)?.name || template) : pptText('新建演示文稿', 'New Presentation'));
    setSubmitting(true);
    try {
      await onCreate({
        title: effectiveTitle,
        ...(template ? { template } : {}),
        theme: theme || 'auto',
        lang: languageOf(),
        ...(content.trim() ? { content } : {}),
        ...(refFile?.data ? { referencePptxData: refFile.data, cloneStructure } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return h(W.Dialog, {
    className: 'pptw ppt-dialog',
    title: dialogMode === 'import'
      ? pptText('导入 PPTX 翻新', 'Import & Modernize .pptx')
      : dialogMode === 'office'
        ? pptText('导入 Excel / Word 文档', 'Import Excel / CSV / Word')
        : pptText('新建演示文稿', 'New presentation'),
    closeLabel: pptText('关闭', 'Close'),
    busy: disabled,
    onClose,
  },
    h('div', { className: 'ppt-create-wizard' },
      h('div', { className: 'ppt-archetype-pills', role: 'tablist', 'aria-label': pptText('创建方式', 'Creation mode') },
        h('button', { type: 'button', role: 'tab', className: 'ppt-pill', 'aria-selected': dialogMode === 'create' ? 'true' : 'false', 'aria-pressed': dialogMode === 'create' ? 'true' : 'false', disabled, onClick: () => setDialogMode('create') }, pptText('从蓝图 / 大纲新建', 'New from blueprint / notes')),
        onImportOffice ? h('button', { type: 'button', role: 'tab', className: 'ppt-pill', 'aria-selected': dialogMode === 'office' ? 'true' : 'false', 'aria-pressed': dialogMode === 'office' ? 'true' : 'false', disabled, onClick: () => setDialogMode('office') }, pptText('导入 Excel / Word', 'Import Excel / Word')) : null,
        onImport ? h('button', { type: 'button', role: 'tab', className: 'ppt-pill', 'aria-selected': dialogMode === 'import' ? 'true' : 'false', 'aria-pressed': dialogMode === 'import' ? 'true' : 'false', disabled, onClick: () => setDialogMode('import') }, pptText('导入 PPTX 翻新', 'Import & Modernize .pptx')) : null),
      dialogMode === 'office' ? h(React.Fragment, null,
        h('p', { className: 'muted' }, pptText('拖拽或上传 .xlsx / .csv / .tsv 数据表或 .docx 文档（≤24 MiB），自动识别流向、进度、市场份额与章节结构并生成多页演示文稿。', 'Drop or upload an .xlsx / .csv / .tsv workbook or .docx report (≤24 MiB) to auto-profile charts, Sankey, Gantt, tables, and narrative slides.')),
        h('div', {
          className: 'ppt-create-refbox',
          onDragOver: e => { e.preventDefault(); },
          onDrop: e => { e.preventDefault(); if (!disabled) handleOfficeSelect(e.dataTransfer?.files?.[0]); },
        },
          h('label', { htmlFor: fieldId + '-office-file' }, pptText('拖拽或选择 .xlsx / .csv / .tsv / .docx 文件（≤24 MiB）', 'Drop or choose .xlsx / .csv / .tsv / .docx (≤24 MiB)')),
          h('input', {
            id: fieldId + '-office-file',
            type: 'file',
            accept: '.xlsx,.csv,.tsv,.docx',
            disabled,
            onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handleOfficeSelect(f); },
          }),
          officeFile ? h('div', { className: 'ppt-create-refmeta' },
            h('span', { className: 'w-tag' }, officeFile.name),
            h(W.Button, { size: 'sm', variant: 'ghost', icon: 'close', disabled, onClick: () => setOfficeFile(null) }, pptText('移除文件', 'Clear'))) : null),
        h('div', { className: 'ppt-create-grid' },
          h('div', null,
            h('label', { htmlFor: fieldId + '-office-theme' }, pptText('视觉主题（24 套大师主题）', 'Visual theme (24 curated themes)')),
            h('select', { id: fieldId + '-office-theme', value: theme, disabled, onChange: e => setTheme(e.target.value) },
              h('option', { value: 'auto' }, pptText('自动导演智能匹配', 'Auto-Director match')),
              meta.themes.map(th => h('option', { key: th.id, value: th.id }, (th.name || th.id) + (th.dark ? pptText(' · 深色', ' · Dark') : pptText(' · 浅色', ' · Light')))))),
          h('div', null,
            h('label', { htmlFor: fieldId + '-office-mins' }, pptText('目标演讲时长（分钟，可选）', 'Target duration (min, optional)')),
            h(W.Input, { id: fieldId + '-office-mins', type: 'number', min: 1, max: 240, value: targetMinutes, disabled, placeholder: '10', onChange: e => setTargetMinutes(e.target.value) }))),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { variant: 'primary', icon: 'upload', disabled: disabled || !officeFile?.data, onClick: submitOffice }, submitting ? pptText('正在剖析文档并生成工程…', 'Profiling & building deck…') : pptText('立即导入并生成演示文稿', 'Import & build presentation')),
          h(W.Button, { variant: 'ghost', disabled, onClick: onClose }, pptText('取消', 'Cancel'))))
      : dialogMode === 'import' ? h(React.Fragment, null,
        h('p', { className: 'muted' }, pptText('上传外部 .pptx（≤24 MiB），自动提取每页文字、表格、原生图表、图片与演讲备注并重排版为可编辑工程，同时生成演讲讲义（.handout.md）。', 'Upload an external .pptx (≤24 MiB) to extract slides, tables, live charts, images, and speaker notes into an editable dsh-ppt project with speaker handout (.handout.md).')),
        h('div', { className: 'ppt-create-refbox' },
          h('label', { htmlFor: fieldId + '-import-file' }, pptText('选择需要导入翻新的 .pptx 文件（≤24 MiB）', 'Choose a .pptx file to import & modernize (≤24 MiB)')),
          h('input', {
            id: fieldId + '-import-file',
            type: 'file',
            accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
            disabled,
            onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handleImportSelect(f); },
          }),
          importFile ? h('div', { className: 'ppt-create-refmeta' },
            h('span', { className: 'w-tag' }, importFile.name),
            h(W.Button, { size: 'sm', variant: 'ghost', icon: 'close', disabled, onClick: () => setImportFile(null) }, pptText('移除文件', 'Clear'))) : null),
        h('div', { className: 'ppt-create-grid' },
          h('div', null,
            h('label', { htmlFor: fieldId + '-import-mode' }, pptText('翻新视觉策略', 'Visual refurbishment mode')),
            h('select', {
              id: fieldId + '-import-mode',
              value: preserveSourceTheme ? 'preserve' : 'modernize',
              disabled,
              onChange: e => setPreserveSourceTheme(e.target.value === 'preserve'),
            },
              h('option', { value: 'modernize' }, pptText('自动焕新现代主题 (Auto-Modernize Theme)', 'Auto-Modernize Theme')),
              h('option', { value: 'preserve' }, pptText('保留原稿品牌配色 (Keep Original Brand Colors)', 'Keep Original Brand Colors')))),
          !preserveSourceTheme ? h('div', null,
            h('label', { htmlFor: fieldId + '-import-theme' }, pptText('目标主题（24 套大师主题）', 'Target theme (24 curated themes)')),
            h('select', { id: fieldId + '-import-theme', value: theme, disabled, onChange: e => setTheme(e.target.value) },
              h('option', { value: 'auto' }, pptText('自动导演智能匹配', 'Auto-Director match')),
              meta.themes.map(th => h('option', { key: th.id, value: th.id }, (th.name || th.id) + (th.dark ? pptText(' · 深色', ' · Dark') : pptText(' · 浅色', ' · Light')))))) : null),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { variant: 'primary', icon: 'upload', disabled: disabled || !importFile?.data, onClick: submitImport }, submitting ? pptText('正在解析并翻新 PPTX…', 'Importing & modernizing…') : pptText('立即导入并生成工程', 'Import & modernize deck')),
          h(W.Button, { variant: 'ghost', disabled, onClick: onClose }, pptText('取消', 'Cancel'))))
      : h(React.Fragment, null,
      h('p', { className: 'muted' }, pptText('任选一种方式即可生成：选行业蓝图快速起稿、粘贴 Markdown/要点自动排布多版式，或上传公司 .pptx 一键复刻配色与页面骨架。', 'Start from an industry blueprint, paste rough Markdown notes for auto-layout choreography, or upload a reference .pptx to absorb its style and slide structure.')),
      h('label', { htmlFor: fieldId + '-title' }, pptText('演示文稿标题', 'Presentation title')),
      h(W.Input, {
        id: fieldId + '-title',
        value: title,
        disabled,
        maxLength: 200,
        placeholder: pptText('例如：2026 Q4 研发效能复盘与规划', 'e.g. Q4 Engineering Review & Roadmap'),
        onChange: e => setTitle(e.target.value),
      }),
      h('div', { className: 'ppt-create-grid' },
        h('div', null,
          h('label', { htmlFor: fieldId + '-tpl' }, pptText('行业场景蓝图（可选，20 套）', 'Scenario blueprint (optional, 20 built-in)')),
          h('select', { id: fieldId + '-tpl', value: template, disabled, onChange: e => setTemplate(e.target.value) },
            h('option', { value: '' }, pptText('不限蓝图（按大纲自动升维版式）', 'Auto-choreograph from outline')),
            meta.templates.map(tp => h('option', { key: tp.id, value: tp.id }, tp.name + ' (' + tp.id + ')')))),
        h('div', null,
          h('label', { htmlFor: fieldId + '-theme' }, pptText('视觉主题（24 套大师主题）', 'Visual theme (24 curated themes)')),
          h('select', { id: fieldId + '-theme', value: theme, disabled, onChange: e => setTheme(e.target.value) },
            h('option', { value: 'auto' }, pptText('自动导演匹配场景（推荐明亮投影风）', 'Auto-Director match (recommended)')),
            meta.themes.map(th => h('option', { key: th.id, value: th.id }, (th.name || th.id) + (th.dark ? pptText(' · 深色', ' · Dark') : pptText(' · 浅色', ' · Light'))))))),
      h('div', { className: 'ppt-create-head-row' },
        h('label', { htmlFor: fieldId + '-content' }, pptText('汇报材料或 Markdown 大纲（可选，用 ## 分页、- 写要点）', 'Outline or Markdown notes (optional; use ## for slides, - for bullets)')),
        h(W.Button, { size: 'sm', variant: 'ghost', icon: 'sparkles', disabled, onClick: fillSampleOutline }, pptText('填入示例大纲', 'Fill sample outline'))),
      h('textarea', {
        id: fieldId + '-content',
        rows: 6,
        disabled,
        maxLength: 200000,
        value: content,
        placeholder: pptText('# 汇报标题\n\n## 核心结论句（自动识别指标升格 KPI 卡片）\n- **关键指标**：达成 118%\n\n## 痛点与对策对比\n- 原流程耗时高：上线自动化门禁缩短 50%', '# Deck Title\n\n## Action Title Slide\n- **Metric**: 118% net retention'),
        onChange: e => setContent(e.target.value),
      }),
      h('div', { className: 'ppt-create-refbox' },
        h('label', { htmlFor: fieldId + '-ref' }, pptText('可选：上传参考 .pptx 吸收配色、Logo 与版式骨架（≤24 MiB）', 'Optional: upload reference .pptx to absorb brand & slide skeleton (≤24 MiB)')),
        h('input', {
          id: fieldId + '-ref',
          type: 'file',
          accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
          disabled,
          onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handleRefSelect(f); },
        }),
        refFile ? h('div', { className: 'ppt-create-refmeta' },
          h('span', { className: 'w-tag' }, refFile.name),
          h(W.Checkbox, {
            checked: cloneStructure,
            disabled,
            onChange: next => setCloneStructure(next),
            label: pptText('同时复刻该 PPTX 的逐页版式序列与母版骨架', 'Also clone per-slide layout sequence & master skeleton'),
          }),
          h(W.Button, { size: 'sm', variant: 'ghost', icon: 'close', disabled, onClick: () => setRefFile(null) }, pptText('移除参考文件', 'Clear'))) : null),
      h('div', { className: 'w-toolbar' },
        h(W.Button, { variant: 'primary', icon: 'plus', disabled, onClick: submitCreate }, submitting ? pptText('正在生成三件套…', 'Generating HTML & PPTX…') : pptText('立即生成演示文稿', 'Create presentation')),
        onCreateDemo ? h(W.Button, { icon: 'sparkles', disabled, onClick: async () => { setSubmitting(true); try { await onCreateDemo(); } finally { setSubmitting(false); } } }, pptText('一键体验旗舰示例', 'Load Flagship Demo')) : null,
        h(W.Button, { variant: 'ghost', disabled, onClick: onClose }, pptText('取消', 'Cancel'))))));
}

function PptPages({ project, selected, busy, imagePending, onChoose, onMoveSlide, onDuplicate, onAppend, dirty, dataDirty }) {
  const railId = React.useId();
  const [newOpen, setNewOpen] = React.useState(false);
  const [archetype, setArchetype] = React.useState('cards');
  const blocked = busy || dirty || imagePending || dataDirty || project.slides.length >= 120;
  const issues = project.quality?.issues || [];
  const newOptions = [
    ['cards', pptText('Bento / 支柱卡片页', 'Bento / pillar cards')],
    ['kpi', pptText('大数字指标 KPI 页', 'KPI metrics')],
    ['comparison', pptText('双栏 / 痛点对比页', 'Two-column comparison')],
    ['process', pptText('流程 / 时间轴页', 'Process / timeline')],
    ['chevron', pptText('价值链五边形箭头页', 'Value-chain chevrons')],
    ['value-chain', pptText('波特价值链', 'Porter value chain')],
    ['marimekko', pptText('不等宽市场图', 'Marimekko market map')],
    ['sankey', pptText('桑基流向图', 'Sankey flow diagram')],
    ['swot', pptText('SWOT 十字矩阵', 'SWOT matrix')],
    ['matrix', pptText('2×2 四象限矩阵页', '2×2 Matrix')],
    ['gantt', pptText('甘特图路线图页', 'Gantt roadmap')],
    ['architecture', pptText('分层系统架构图页', 'Architecture diagram')],
    ['harvey', pptText('哈维球竞品矩阵页', 'Harvey-ball matrix')],
    ['tam', pptText('TAM/SAM/SOM 同心圆页', 'TAM/SAM/SOM concentric')],
    ['org', pptText('组织架构 / 团队图谱页', 'Org chart / team')],
    ['mermaid', pptText('Mermaid 流程图 / 时序图', 'Mermaid flowchart / sequence')],
    ['table', pptText('咨询表 / 学术三线表', 'Table / 3-line booktabs')],
    ['callout', pptText('核心结论与行动清单', 'Key takeaways & callout')],
    ['bullets', pptText('精炼要点列表页', 'Concise bullets')],
    ['statement', pptText('单句核心观点页', 'Statement breather')],
    ['section', pptText('章节过渡页', 'Section divider')],
    ['agenda', pptText('汇报目录页', 'Agenda')],
    ['closing', pptText('结束与行动号召页', 'Closing & CTA')],
  ];
  return h('aside', { className: 'ppt-page-rail', 'aria-label': pptText('幻灯片目录', 'Slide outline') },
    h('h3', { 'data-dsh-serif': '' }, pptText('幻灯片', 'Slides')),
    h('div', { className: 'ppt-page-buttons' }, project.slides.map((row, index) => {
      const slideIssues = issues.filter(item => item.slide === index + 1 || (item.slideId && item.slideId === row.id));
      const severity = slideIssues.some(item => item.severity === 'error') ? 'error' : slideIssues.length ? 'warning' : '';
      const active = row.id === selected;
      return h('div', {
        key: row.id,
        className: 'ppt-slide-row dsh-row',
        'data-dsh-row': '',
        'data-active': active ? 'true' : 'false',
        'data-selected': active ? 'true' : 'false',
      },
        h('button', {
          type: 'button',
          className: 'ppt-slide-card',
          'data-dsh-card': '',
          'aria-current': active ? 'true' : undefined,
          disabled: busy || imagePending,
          onClick: () => onChoose(row),
        },
          h('span', { className: 'dsh-pixel-cursor', 'aria-hidden': 'true' }, '▶'),
          h('span', { className: 'ppt-page-number' }, String(index + 1).padStart(2, '0')),
          h('span', { className: 'ppt-page-body' },
            h('span', { className: 'ppt-page-title-line' },
              h('span', { className: 'ppt-page-label', 'data-dsh-serif': '' }, row.title || t('未命名页')),
              severity ? h('span', {
                className: 'ppt-page-dot',
                'data-severity': severity,
                title: slideIssues.map(it => languageOf() === 'en' ? (it.messageEn || it.message) : it.message).join(' · '),
                'aria-label': severity === 'error' ? pptText('有待修复错误', 'Has error') : pptText('有排版提醒', 'Has warning'),
              }) : null),
            h('span', { className: 'w-tag ppt-page-layout-tag' }, typeof pptLayoutLabel === 'function' ? pptLayoutLabel(row.layout) : (row.layout || 'bullets')))),
        onMoveSlide ? h('div', { className: 'dsh-row-actions ppt-slide-actions', 'data-window-drag-exclude': '' },
          h(W.IconButton, { icon: 'up', label: t('上移'), disabled: blocked || index === 0, onClick: () => onMoveSlide(index, -1) }),
          h(W.IconButton, { icon: 'down', label: t('下移'), disabled: blocked || index === project.slides.length - 1, onClick: () => onMoveSlide(index, 1) })) : null);
    })),
    h('div', { className: 'ppt-rail-actions' },
      newOpen && onAppend ? h('div', { className: 'ppt-add-slide-box', 'data-dsh-card': '' },
        h('label', { htmlFor: railId + '-archetype' }, pptText('选择新增页面版式', 'Choose new slide archetype')),
        h('select', { id: railId + '-archetype', value: archetype, disabled: blocked, onChange: e => setArchetype(e.target.value) },
          newOptions.map(([id, label]) => h('option', { key: id, value: id }, label))),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { variant: 'primary', icon: 'plus', disabled: blocked, onClick: () => { setNewOpen(false); onAppend(archetype); } }, pptText('确认新增', 'Add slide')),
          h(W.Button, { variant: 'ghost', icon: 'close', disabled: busy, onClick: () => setNewOpen(false) }, pptText('收起', 'Cancel'))))
      : onAppend ? h(W.Button, { icon: 'plus', className: 'ppt-add-slide', disabled: blocked, onClick: () => setNewOpen(true) }, pptText('新建页面', 'New slide')) : null,
      h(W.Button, { icon: 'copy', className: 'ppt-duplicate', disabled: blocked, onClick: onDuplicate }, t('复制本页'))));
}

const PPT_WORKBENCH_CSS = `
.ppt-workbench.pptw{--fg:var(--w-text);--fg-muted:var(--w-muted);--bg:var(--w-canvas);--bg-surface:var(--w-bg);--border:var(--w-border);max-width:none;margin:0}
.ppt-workbench .ppt-loading-skeleton{display:flex;flex-direction:column;gap:12px;max-width:900px;padding:18px 0}
.ppt-workbench.ppt-in-project .dsh-header{gap:8px;padding-inline:10px}
.ppt-workbench.ppt-in-project .dsh-header-leading{gap:6px}
.ppt-workbench.ppt-in-project .dsh-header-title{max-width:104px;overflow:hidden;text-overflow:ellipsis}
.ppt-workbench.ppt-in-project .w-tabs>button{padding:4px 7px;font-size:12px;gap:4px}
.ppt-workbench.ppt-in-project .w-header-actions{gap:4px}
.ppt-workbench.ppt-in-project .w-header-actions .w-button:not(.w-icon-button){padding:4px 8px;font-size:12px;gap:4px}
.ppt-workbench .ppt-header-meta{font-variant-numeric:tabular-nums;font-weight:600}
.ppt-workbench .ppt-editor{--ppt-rail-width:204px;--ppt-inspector:360px;display:flex;align-items:stretch;flex:1 1 auto;min-height:480px;min-width:0}
.ppt-workbench .ppt-page-rail{flex:none;width:var(--ppt-rail-width,204px);padding:14px 10px 14px 0;min-width:0;display:flex;flex-direction:column;gap:12px}
.ppt-workbench .ppt-page-rail h3{margin:0;font-size:14px;color:var(--w-muted);font-weight:600}
.ppt-workbench .ppt-page-buttons{display:flex;flex-direction:column;gap:6px;max-height:calc(100dvh - 280px);overflow:auto;overscroll-behavior:contain;min-width:0;padding:2px}
.ppt-workbench .ppt-slide-row{display:flex;align-items:stretch;gap:4px;border-block-end:0;border-inline-start:0;padding:0;min-width:0;position:relative}
.ppt-workbench .ppt-slide-card{flex:1 1 auto;border:var(--dsh-control-border-width,1px) solid transparent;border-inline-start:3px solid transparent;border-radius:var(--dsw-radius-sm,8px);padding:9px 10px;display:flex;align-items:flex-start;gap:8px;background:var(--dsw-alias-settings-card-fill,var(--w-canvas));min-width:0;font-size:13px;line-height:1.45;text-align:start;overflow-wrap:anywhere;cursor:pointer}
.ppt-workbench .ppt-slide-card:hover:not(:disabled){background:var(--dsh-surface-spotlight,var(--w-bg));border-color:var(--w-border)}
.ppt-workbench .ppt-slide-card[aria-current=true]{border-color:var(--w-border);border-inline-start-color:var(--w-accent);background:var(--w-selected);color:var(--w-text);font-weight:550}
.ppt-workbench .ppt-slide-actions{padding-inline-end:2px;gap:2px}
.ppt-workbench .ppt-slide-actions .w-icon-button{width:24px;min-width:24px;min-height:24px;padding:0}
.ppt-workbench .ppt-page-number{font-variant-numeric:tabular-nums;color:var(--w-muted);font-size:11.5px;font-weight:600;flex-shrink:0;padding-top:1px}
.ppt-workbench .ppt-slide-card[aria-current=true] .ppt-page-number{color:var(--w-accent)}
.ppt-workbench .ppt-page-body{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.ppt-workbench .ppt-page-title-line{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0}
.ppt-workbench .ppt-page-layout-tag{align-self:flex-start;font-size:11px;padding:0 6px}
.ppt-workbench .ppt-page-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--dsw-alias-state-warn-primary)}
.ppt-workbench .ppt-page-dot[data-severity=error]{background:var(--dsw-alias-state-error-primary)}
.ppt-workbench .ppt-rail-actions{margin-top:auto;display:flex;flex-direction:column;gap:8px}
.ppt-workbench .ppt-rail-actions .w-button{width:100%;justify-content:flex-start;font-size:13px}
.ppt-workbench .ppt-add-slide-box{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:10px;background:var(--dsw-alias-settings-card-fill,var(--w-canvas));display:flex;flex-direction:column;gap:8px}
.ppt-workbench .ppt-add-slide-box label{font-size:12px;color:var(--w-muted);margin:0;display:grid;gap:6px}
.ppt-workbench .ppt-duplicate{font-size:13px}
.ppt-workbench .ppt-canvas-region{flex:1 1 auto;display:flex;flex-direction:column;gap:14px;padding:16px 18px;margin:8px 0;border-radius:var(--dsw-radius-md,10px);background:var(--w-bg);min-width:0}
.ppt-workbench .ppt-preview-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ppt-workbench .ppt-preview-tools .w-button{font-size:12.5px;min-height:30px;padding:5px 10px}
.ppt-workbench .ppt-preview-tools [aria-pressed=true]{background:var(--w-selected);border-color:var(--w-accent);color:var(--w-accent);font-weight:600}
.ppt-workbench .ppt-preview-tools .w-icon-button{margin-inline-start:auto}
.ppt-workbench .preview{width:100%;aspect-ratio:16/9;border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);background:var(--w-soft,#f0f4fa);box-shadow:var(--dsw-elevation-panel,0 6px 20px rgba(15,23,42,0.06));overflow:clip;min-height:0;margin:auto 0;position:relative;display:flex;align-items:center;justify-content:center}
.ppt-workbench .ppt-split-preview,.ppt-workbench .ppt-canvas-visual-diff{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}
.ppt-workbench .ppt-split-pane{display:flex;flex-direction:column;gap:6px;min-width:0}
.ppt-workbench .ppt-split-pane figcaption{font-size:12px;font-weight:600;color:var(--w-muted)}
.ppt-workbench .ppt-canvas-diff-card{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);padding:14px;background:var(--dsw-alias-settings-card-fill,var(--w-canvas));display:flex;flex-direction:column;gap:10px}
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
.ppt-workbench .ppt-preview-help+details{background:var(--dsw-alias-settings-card-fill,var(--w-canvas));border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:12px 14px}
.ppt-workbench .ppt-preview-help+details summary{font-size:12.5px}
.ppt-workbench .ppt-inspector{flex:none;width:var(--ppt-inspector,360px);padding:14px 0 14px 12px;min-width:0;overflow:auto;overscroll-behavior:contain;overflow-wrap:anywhere}
.ppt-workbench .ppt-inspector-panel[hidden]{display:none!important}
.ppt-workbench .ppt-inspector .card{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);padding:16px;margin:0 0 16px;background:var(--dsw-alias-settings-card-fill,var(--w-canvas));box-shadow:var(--dsh-card-shadow,none)}
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
.ppt-workbench .ppt-library .w-row-button{padding:14px 16px;border:0;border-radius:0;background:transparent}
.ppt-workbench .ppt-workflow-guide{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);background:var(--w-bg);padding:10px 14px;margin:8px 0 14px}
.ppt-workbench .ppt-workflow-guide>summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--w-text);list-style:none;display:flex;align-items:center;gap:8px}
.ppt-workbench .ppt-workflow-guide>summary::-webkit-details-marker{display:none}
.ppt-workbench .ppt-workflow-guide>summary::before{content:"▸";content:"▸" / "";color:var(--w-accent);font-size:12px}
@media(prefers-reduced-motion:no-preference){.ppt-workbench .ppt-workflow-guide>summary::before{transition:rotate .16s ease}}
.ppt-workbench .ppt-workflow-guide[open]>summary::before{rotate:90deg}
.ppt-workbench dialog:modal,.ppt-dialog:modal{overscroll-behavior:contain}
.ppt-workbench dialog::backdrop,.ppt-dialog::backdrop{overflow:hidden;overscroll-behavior:contain}
.ppt-workbench .ppt-workflow-body{margin-top:10px;padding-top:10px;border-top:var(--dsh-control-border-width,0.5px) solid var(--w-border);display:flex;flex-direction:column;gap:10px}
.ppt-workbench .ppt-workflow-steps{margin:0;padding-inline-start:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;font-size:12.5px;line-height:1.55;color:var(--w-muted)}
.ppt-workbench .ppt-workflow-steps strong{color:var(--w-text)}
.ppt-workbench .ppt-workflow-prompts{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-wizard{display:flex;flex-direction:column;gap:10px}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-head-row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-refbox{border:1px dashed var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:10px 12px;background:var(--w-soft);display:flex;flex-direction:column;gap:8px}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-refmeta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
@media(max-width:680px){.ppt-workbench .ppt-workflow-steps,:is(.ppt-workbench,.ppt-dialog) .ppt-create-grid{grid-template-columns:1fr}}
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
@container dsh-workbench (max-width:1100px){.ppt-workbench .ppt-editor{flex-wrap:wrap}.ppt-workbench .ppt-page-rail{width:var(--ppt-rail-width,180px)}.ppt-workbench .ppt-canvas-region{flex:1 1 320px}.ppt-workbench .ppt-split-resizer-right{display:none}.ppt-workbench .ppt-inspector{width:100%;border-top:var(--dsh-control-border-width,0.5px) solid var(--w-border);padding:16px 0}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ppt-workbench .ppt-page-buttons{max-height:400px}.ppt-workbench .ppt-split-preview,.ppt-workbench .ppt-canvas-visual-diff{grid-template-columns:1fr}}
@container dsh-workbench (max-width:760px){.ppt-workbench .ppt-editor{flex-direction:column;min-height:0}.ppt-workbench .ppt-split-resizer{display:none}.ppt-workbench .ppt-page-rail{width:100%;border-bottom:var(--dsh-control-border-width,0.5px) solid var(--w-border);padding:12px 0}.ppt-workbench .ppt-page-buttons{display:flex;flex-direction:row;max-height:150px;overflow:auto;gap:8px}.ppt-workbench .ppt-slide-row{min-width:165px;max-width:220px;flex-shrink:0}.ppt-workbench .ppt-rail-actions{flex-direction:row;flex-wrap:wrap}.ppt-workbench .ppt-rail-actions .w-button{width:auto}.ppt-workbench .ppt-canvas-region{padding:14px 0;background:var(--w-canvas);margin:0}.ppt-workbench .preview{margin:0;min-height:0}.ppt-workbench .ppt-preview-tools .w-icon-button{margin-inline-start:0}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:1fr}.ppt-workbench .ppt-preview-tools .w-button{font-size:12px}.ppt-workbench .ppt-inspector{width:100%;padding:16px 0}}
`;
