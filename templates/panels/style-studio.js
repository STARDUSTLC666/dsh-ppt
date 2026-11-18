// Style Studio, Slide Archetype Switcher, and Structured Content Editors.
// Uses only host/workbench CSS tokens (--w-*, --dsw-alias-*); palette swatches use inline style objects.

const PPT_CHROME_SKELETONS = Object.freeze([
  { id: 'consulting-classic', zh: '麦肯锡直角', en: 'Consulting Classic', descZh: '0px 直角卡片 + 左强调竖线 + 右上章节标', descEn: '0px sharp cards, left accent rule & section pill' },
  { id: 'keynote-spatial', zh: 'Apple 空间留白', en: 'Keynote Spatial', descZh: '无顶部分隔线 + 16pt 留白无边框浮卡', descEn: 'Divider-free airy canvas with 16pt borderless cards' },
  { id: 'editorial-folio', zh: '杂志社论书脊', en: 'Editorial Folio', descZh: '顶栏刊号 + 右上页码 + 衬线大序号', descEn: 'Top running folio, top-right page number & display numerals' },
  { id: 'saas-bento', zh: '黑曜石 Bento', en: 'SaaS Bento', descZh: '10pt 圆角描边网格 + 等宽标签', descEn: '10pt rounded hairline grid & monospace pills' },
  { id: 'academic-minimal', zh: '学术顶栏横幅', en: 'Academic Beamer', descZh: 'Beamer 通栏色带页眉 + 三段学术底栏', descEn: 'Full-width Beamer header band & 3-zone footer' },
  { id: 'gov-ceremonial', zh: '东方政务双线', en: 'Gov Ceremonial', descZh: '双线页眉 + 方括章节标签 + 对称卡片', descEn: 'Double-rule header, bracketed tag & symmetric cards' },
]);

function pptChromeLabel(id) {
  const found = PPT_CHROME_SKELETONS.find(item => item.id === id);
  if (!found) return id || '';
  return languageOf() === 'en' ? found.en : found.zh;
}

const PPT_LAYOUT_CATALOG = Object.freeze([
  { id: 'cover', zh: '封面', en: 'Cover', group: 'framing', variants: [['standard', '标准', 'Standard'], ['monolith', '色块横幅', 'Monolith'], ['editorial', '社论留白', 'Editorial'], ['swiss-grid', '瑞士栅格', 'Swiss grid'], ['inverted', '深底反白', 'Inverted']] },
  { id: 'agenda', zh: '目录议程', en: 'Agenda', group: 'framing', variants: [['list', '列表目录', 'List'], ['cards', '卡片目录', 'Cards']] },
  { id: 'section', zh: '章节过渡', en: 'Section', group: 'framing', variants: [['minimal', '极简章节', 'Minimal'], ['number-hero', '大数字序号', 'Number hero'], ['inverted', '深色反白', 'Inverted']] },
  { id: 'bullets', zh: '核心要点', en: 'Bullets', group: 'structured', quick: true, variants: [['clean', '清爽列表', 'Clean'], ['accent-rail', '强调竖线', 'Accent rail'], ['ruled', '分割细线', 'Ruled'], ['two-column', '双栏要点', 'Two-column']] },
  { id: 'cards', zh: 'Bento / 支柱卡', en: 'Cards & Bento', group: 'structured', quick: true, variants: [['pillars', '并列支柱卡', 'Pillars'], ['bento', 'Bento 网格', 'Bento grid'], ['exec-summary', '结论+三支柱', 'Exec summary'], ['numbered', '编号卡片', 'Numbered']] },
  { id: 'kpi', zh: '大数字指标 KPI', en: 'KPI metrics', group: 'structured', quick: true, variants: [['grid', '指标矩阵', 'Grid'], ['hero-left', '主指标左置', 'Hero left'], ['banner', '通栏指标', 'Banner']] },
  { id: 'comparison', zh: '双栏 / 痛点对比', en: 'Comparison', group: 'structured', quick: true, variants: [['versus', 'A/B 对比', 'Versus'], ['before-after', '前后对比', 'Before / after'], ['do-dont', '推荐 vs 避免', 'Do / don’t'], ['issue-action', '痛点 → 举措', 'Issue → action']] },
  { id: 'process', zh: '流程 / 价值链 / 飞轮', en: 'Process & value chain', group: 'structured', quick: true, variants: [['steps', '推进步骤', 'Steps'], ['chevron', '价值链箭头', 'Value-chain chevrons'], ['timeline', '里程碑时间轴', 'Timeline'], ['layers', '架构分层', 'Layers'], ['funnel', '转化漏斗', 'Funnel'], ['flywheel', '增长飞轮', 'Flywheel']] },
  { id: 'matrix', zh: '2×2 四象限矩阵', en: '2×2 Matrix', group: 'structured', quick: true, variants: [['2x2', '四象限坐标轴', '2×2 quadrant'], ['grid', '四宫格', 'Grid']] },
  { id: 'callout', zh: '结论清单 / 定理框', en: 'Callout & checklist', group: 'structured', variants: [['takeaways', '行动清单', 'Takeaways'], ['definition', '核心定义框', 'Definition'], ['formula', '公式定理框', 'Formula']] },
  { id: 'gantt', zh: '甘特图路线图', en: 'Gantt roadmap', group: 'data', quick: true, variants: [['quarters', '按季度', 'Quarters'], ['months', '按月份', 'Months'], ['weeks', '按周次', 'Weeks'], ['swimlane', '泳道甘特', 'Swimlane']] },
  { id: 'architecture', zh: '分层系统架构图', en: 'Architecture diagram', group: 'structured', quick: true, variants: [['layered', '分层架构', 'Layered'], ['platform', '平台中台', 'Platform']] },
  { id: 'harvey', zh: '哈维球竞品矩阵', en: 'Harvey-ball matrix', group: 'data', quick: true, variants: [] },
  { id: 'tam', zh: 'TAM/SAM/SOM 同心圆', en: 'TAM/SAM/SOM', group: 'data', variants: [['concentric', '同心圆', 'Concentric']] },
  { id: 'org', zh: '组织架构 / 团队图谱', en: 'Org & team', group: 'structured', variants: [['tree', '汇报树状图', 'Org tree'], ['team', '核心团队卡', 'Team bios']] },
  { id: 'table', zh: '表格 / 学术三线表', en: 'Table', group: 'data', quick: true, variants: [] },
  { id: 'chart', zh: '原生数据图表', en: 'Chart', group: 'data', variants: [] },
  { id: 'chart-split', zh: '图表 + 洞察分栏', en: 'Chart + insights', group: 'data', variants: [['chart-left', '左图右洞察', 'Chart left'], ['chart-right', '左洞察右图', 'Chart right']] },
  { id: 'statement', zh: '单句核心论断', en: 'Statement', group: 'framing', variants: [['rail', '侧栏强调', 'Rail'], ['editorial-asymmetric', '非对称社论', 'Asymmetric'], ['centered', '居中金句', 'Centered']] },
  { id: 'quote', zh: '引用金句', en: 'Quote', group: 'framing', variants: [['editorial', '经典引号', 'Editorial'], ['card', '卡片引用', 'Card']] },
  { id: 'image', zh: '整页大图 / 画廊', en: 'Full image', group: 'media', variants: [['framed', '画框留白', 'Framed'], ['full-bleed', '满版铺满', 'Full bleed'], ['gallery', '多图画廊', 'Gallery']] },
  { id: 'image-left', zh: '左图右文', en: 'Image left', group: 'media', variants: [['framed', '圆角画框', 'Framed'], ['split-bleed', '半屏满版', 'Split bleed']] },
  { id: 'image-right', zh: '左文右图', en: 'Image right', group: 'media', variants: [['framed', '圆角画框', 'Framed'], ['split-bleed', '半屏满版', 'Split bleed']] },
  { id: 'closing', zh: '结束与行动号召', en: 'Closing & CTA', group: 'framing', variants: [['standard', '标准致谢', 'Standard'], ['cta-cards', '行动卡片', 'CTA cards'], ['inverted', '深色封底', 'Inverted']] },
]);

const PPT_ITEM_LAYOUTS = new Set(['cards', 'kpi', 'comparison', 'matrix', 'process', 'chart-split', 'gantt', 'architecture', 'tam', 'org']);

function pptLayoutMeta(layout) {
  return PPT_LAYOUT_CATALOG.find(item => item.id === layout) || { id: layout || 'bullets', zh: layout || '要点', en: layout || 'Bullets', group: 'structured', variants: [] };
}

function pptLayoutLabel(layout) {
  const meta = pptLayoutMeta(layout);
  return languageOf() === 'en' ? meta.en : meta.zh;
}

function normalizeSlideItems(slide) {
  const raw = Array.isArray(slide?.items) ? slide.items : Array.isArray(slide?.cards) ? slide.cards : [];
  return raw.slice(0, 8).map(entry => ({
    tag: String(entry?.tag ?? entry?.badge ?? ''),
    title: String(entry?.title ?? ''),
    text: String(entry?.text ?? entry?.body ?? ''),
    value: entry?.value === undefined || entry?.value === null ? '' : String(entry.value),
    unit: String(entry?.unit ?? ''),
    delta: String(entry?.delta ?? ''),
    status: String(entry?.status ?? entry?.tone ?? ''),
    start: typeof entry?.start === 'number' && Number.isFinite(entry.start) ? String(entry.start) : '',
    span: typeof entry?.span === 'number' && Number.isFinite(entry.span) ? String(entry.span) : '',
    milestone: entry?.milestone === true,
    role: String(entry?.role ?? ''),
    conversion: String(entry?.conversion ?? ''),
    bullets: Array.isArray(entry?.bullets) ? entry.bullets.map(b => String(b)) : [],
  }));
}

function serializeSlideRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return '';
  return rows.map(row => Array.isArray(row) ? row.map(cell => String(cell ?? '').replace(/\t|\r|\n/g, ' ')).join('\t') : '').join('\n');
}

function parseSlideRowsText(text) {
  const lines = String(text ?? '').split(/\r?\n/).map(line => line.trimEnd()).filter(line => line.trim() !== '');
  if (!lines.length) return null;
  const useTab = lines.some(line => line.includes('\t'));
  const usePipe = !useTab && lines.every(line => line.includes('|'));
  const parsed = lines.map(line => {
    if (useTab) return line.split('\t').map(cell => cell.trim());
    if (usePipe) {
      const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
      return trimmed.split('|').map(cell => cell.trim());
    }
    return line.split(/\s*,\s*/).map(cell => cell.trim());
  }).filter(row => !(usePipe && row.every(cell => /^:?-{2,}:?$/.test(cell))));
  if (!parsed.length) return null;
  const cols = Math.max(1, Math.min(12, Math.max(...parsed.map(r => r.length))));
  return parsed.slice(0, 50).map(row => {
    const padded = row.slice(0, cols);
    while (padded.length < cols) padded.push('');
    return padded.map(cell => {
      if (/^[+-]?\d+(?:\.\d+)?$/.test(cell) && Number.isFinite(Number(cell))) return Number(cell);
      return cell.slice(0, 500);
    });
  });
}

function itemsFromBulletsText(bulletsText, targetLayout) {
  const lines = String(bulletsText || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 6);
  if (!lines.length) return [];
  return lines.map((line, index) => {
    const clean = line.replace(/^\*\*([^*]+)\*\*\s*[:：—-]\s*/, '$1：');
    if (targetLayout === 'kpi') {
      const metric = /^([+-]?\d+(?:[.,]\d+)?[%％xX倍万亿kKmMbB+]?)\s*(.*)$/.exec(clean) || /^(.*?)\s*[:：]\s*([+-]?\d+(?:[.,]\d+)?[%％xX倍万亿kKmMbB+]?.*)$/.exec(clean);
      if (metric) {
        const firstIsNum = /^[+-]?\d/.test(metric[1]);
        return { tag: '', value: (firstIsNum ? metric[1] : metric[2]).slice(0, 40), unit: '', delta: '', title: (firstIsNum ? metric[2] : metric[1]).trim() || ('KPI ' + (index + 1)), text: '', status: 'accent' };
      }
      return { tag: '', value: String(index + 1), unit: '', delta: '', title: clean.slice(0, 60), text: '', status: 'neutral' };
    }
    const split = /^([^:：]{1,28})[:：]\s*(.+)$/.exec(clean);
    return {
      tag: String(index + 1).padStart(2, '0'),
      title: split ? split[1].trim() : clean.slice(0, 48),
      text: split ? split[2].trim() : '',
      value: '',
      unit: '',
      delta: '',
      status: '',
    };
  });
}

function bulletsFromItems(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map(item => {
    const head = [item.value, item.unit].filter(Boolean).join('');
    const title = item.title || '';
    const body = item.text || '';
    if (head && title) return head + ' ' + title + (body ? '：' + body : '');
    if (title && body) return '**' + title + '**：' + body;
    return title || body || head;
  }).filter(Boolean).join('\n');
}

function projectDraftToLayout(draft, nextLayout) {
  const next = { ...draft, layout: nextLayout };
  const meta = pptLayoutMeta(nextLayout);
  if (meta.variants.length && !meta.variants.some(([v]) => v === next.variant)) {
    next.variant = meta.variants[0][0];
  } else if (!meta.variants.length) {
    next.variant = '';
  }
  if (PPT_ITEM_LAYOUTS.has(nextLayout) && (!Array.isArray(next.items) || !next.items.length) && next.bullets?.trim()) {
    next.items = itemsFromBulletsText(next.bullets, nextLayout);
  } else if (nextLayout === 'bullets' && !next.bullets?.trim() && Array.isArray(next.items) && next.items.length) {
    next.bullets = bulletsFromItems(next.items);
  } else if ((nextLayout === 'table' || nextLayout === 'harvey') && !next.rowsText?.trim()) {
    const en = languageOf() === 'en';
    if (nextLayout === 'harvey') {
      const rows = en
        ? [['Capability', 'Ours', 'Vendor A', 'Vendor B'], ['Native editability', '●', '◑', '○'], ['Contrast guard', '●', '◕', '◑']]
        : [['能力维度', '本方案', '竞品 A', '竞品 B'], ['原生可编辑', '●', '◑', '○'], ['对比度净化', '●', '◕', '◑']];
      next.rowsText = serializeSlideRows(rows);
      next.tableStyle = 'harvey';
    } else if (Array.isArray(next.items) && next.items.length) {
      const rows = [[en ? 'Item' : '项目', en ? 'Detail' : '说明'], ...next.items.map(it => [it.title || it.tag || '-', it.value ? (it.value + (it.unit || '')) : (it.text || '-')])];
      next.rowsText = serializeSlideRows(rows);
    } else if (next.bullets?.trim()) {
      const lines = next.bullets.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const rows = [[en ? '#' : '序号', en ? 'Point' : '内容'], ...lines.map((l, i) => [String(i + 1), l])];
      next.rowsText = serializeSlideRows(rows);
    }
    if (!next.tableStyle) next.tableStyle = 'consulting';
  }
  if (nextLayout === 'gantt' && !next.columnsText?.trim()) {
    next.columnsText = 'Q1, Q2, Q3, Q4';
  }
  return next;
}

function SlideArchetypeEditor({ slide, draft, disabled, controlId, onChange }) {
  const L = (zh, en) => languageOf() === 'en' ? en : zh;
  const currentLayout = draft.layout || slide?.layout || 'bullets';
  const meta = pptLayoutMeta(currentLayout);
  const canQuickSwitch = !['chart', 'image', 'image-left', 'image-right'].includes(slide?.layout) || currentLayout === slide?.layout;
  const items = Array.isArray(draft.items) ? draft.items : [];
  const showItemsEditor = PPT_ITEM_LAYOUTS.has(currentLayout) || items.length > 0;
  const showTableEditor = currentLayout === 'table' || currentLayout === 'harvey' || Boolean(draft.rowsText?.trim());

  function updateItem(idx, key, val) {
    const nextItems = items.map((entry, i) => i === idx ? { ...entry, [key]: val } : entry);
    onChange({ ...draft, items: nextItems });
  }
  function addItem() {
    if (items.length >= 8) return;
    onChange({
      ...draft,
      items: [...items, {
        tag: currentLayout === 'kpi' ? '' : currentLayout === 'tam' ? ['TAM', 'SAM', 'SOM'][items.length] || 'SOM' : String(items.length + 1).padStart(2, '0'),
        title: L('卡片标题', 'Card title'),
        text: currentLayout === 'kpi' ? '' : L('补充关键论据或举措', 'Supporting point or action'),
        value: currentLayout === 'kpi' ? '95%' : currentLayout === 'tam' ? '$1B' : '',
        unit: '',
        delta: '',
        status: currentLayout === 'kpi' ? 'accent' : '',
        start: currentLayout === 'gantt' ? String(Math.min(items.length, 3)) : '',
        span: currentLayout === 'gantt' ? '1' : '',
        milestone: false,
        role: currentLayout === 'org' ? L('负责人', 'Lead') : '',
        conversion: '',
        bullets: [],
      }],
    });
  }
  function removeItem(idx) {
    onChange({ ...draft, items: items.filter((_, i) => i !== idx) });
  }

  return h('div', { className: 'ppt-archetype-box' },
    h('div', { className: 'ppt-archetype-header' },
      h('label', { htmlFor: controlId + '-layout' }, L('页面版式（一键切换）', 'Slide archetype (1-click switch)')),
      h('select', {
        id: controlId + '-layout',
        value: currentLayout,
        disabled,
        onChange: e => onChange(projectDraftToLayout(draft, e.target.value)),
      }, PPT_LAYOUT_CATALOG.map(row => h('option', { key: row.id, value: row.id }, languageOf() === 'en' ? row.en : row.zh)))),
    canQuickSwitch ? h('div', { className: 'ppt-archetype-pills', role: 'group', 'aria-label': L('常用高质感版式', 'Recommended archetypes') },
      PPT_LAYOUT_CATALOG.filter(row => row.quick).map(row => h('button', {
        type: 'button',
        key: row.id,
        className: 'ppt-pill',
        'aria-pressed': currentLayout === row.id ? 'true' : 'false',
        disabled,
        onClick: () => onChange(projectDraftToLayout(draft, row.id)),
      }, languageOf() === 'en' ? row.en : row.zh))) : null,
    h('div', { className: 'ppt-archetype-subgrid' },
      meta.variants.length > 0 ? h('div', null,
        h('label', { htmlFor: controlId + '-variant' }, L('视觉变体', 'Visual variant')),
        h('select', {
          id: controlId + '-variant',
          value: draft.variant || '',
          disabled,
          onChange: e => onChange({ ...draft, variant: e.target.value }),
        }, h('option', { value: '' }, L('主题推荐默认', 'Theme default')),
          meta.variants.map(([v, zh, en]) => h('option', { key: v, value: v }, L(zh, en))))) : null,
      h('div', null,
        h('label', { htmlFor: controlId + '-density' }, L('排版疏密', 'Spacing density')),
        h('select', {
          id: controlId + '-density',
          value: draft.density || '',
          disabled,
          onChange: e => onChange({ ...draft, density: e.target.value }),
        },
          h('option', { value: '' }, L('自动均衡', 'Auto balanced')),
          h('option', { value: 'compact' }, L('紧凑（信息量大）', 'Compact')),
          h('option', { value: 'balanced' }, L('标准均衡', 'Balanced')),
          h('option', { value: 'airy' }, L('舒展留白', 'Airy')))),
      h('div', null,
        h('label', { htmlFor: controlId + '-chrome' }, L('单页母版骨架', 'Slide chrome skeleton')),
        h('select', {
          id: controlId + '-chrome',
          value: draft.chrome || '',
          disabled,
          onChange: e => onChange({ ...draft, chrome: e.target.value }),
        },
          h('option', { value: '' }, L('跟随整稿母版', 'Deck default')),
          PPT_CHROME_SKELETONS.map(sk => h('option', { key: sk.id, value: sk.id }, L(sk.zh, sk.en)))))),
    currentLayout === 'gantt' ? h('div', { className: 'ppt-structured-section' },
      h('label', { htmlFor: controlId + '-columns' }, L('时间轴列头（逗号分隔，如 Q1, Q2, Q3, Q4）', 'Timeline columns (comma-separated, e.g. Q1, Q2, Q3, Q4)')),
      h('input', {
        id: controlId + '-columns',
        value: draft.columnsText || '',
        disabled,
        placeholder: 'Q1, Q2, Q3, Q4',
        onChange: e => onChange({ ...draft, columnsText: e.target.value }),
      })) : null,
    showTableEditor ? h('details', { className: 'ppt-structured-section', open: currentLayout === 'table' || currentLayout === 'harvey' },
      h('summary', null, currentLayout === 'harvey' ? L('哈维球矩阵数据（● ◕ ◑ ◔ ○）', 'Harvey-ball matrix data (● ◕ ◑ ◔ ○)') : L('表格样式与数据编辑', 'Table style & cell data')),
      h('label', { htmlFor: controlId + '-table-style' }, L('表格规范样式', 'Table style')),
      h('div', { className: 'ppt-archetype-pills', role: 'group', 'aria-label': L('表格样式', 'Table style') },
        [['consulting', L('咨询报告表', 'Consulting')], ['booktabs', L('学术三线表', 'Academic 3-line')], ['minimal', L('极简细线', 'Minimal')], ['banded', L('斑马纹', 'Banded')], ['harvey', L('哈维球矩阵', 'Harvey balls')]].map(([id, label]) =>
          h('button', {
            type: 'button',
            key: id,
            className: 'ppt-pill',
            'aria-pressed': (draft.tableStyle || (currentLayout === 'harvey' ? 'harvey' : 'consulting')) === id ? 'true' : 'false',
            disabled,
            onClick: () => onChange({ ...draft, tableStyle: id }),
          }, label))),
      h('label', { htmlFor: controlId + '-rows' }, L('表格单元格（每行一排，用 Tab、竖线 | 或逗号分隔，首行为表头）', 'Table cells (first line is header; separate columns with Tab, |, or comma)')),
      (currentLayout === 'harvey' || draft.tableStyle === 'harvey') ? h('div', { className: 'ppt-archetype-pills', role: 'group', 'aria-label': L('快捷插入哈维球符号', 'Quick insert Harvey symbols') },
        [['●', L('● 满分', '● Full')], ['◕', L('◕ 较强', '◕ Strong')], ['◑', L('◑ 中等', '◑ Half')], ['◔', L('◔ 起步', '◔ Quarter')], ['○', L('○ 暂无', '○ None')]].map(([sym, lbl]) =>
          h('button', {
            type: 'button',
            key: sym,
            className: 'ppt-pill',
            disabled,
            onClick: () => {
              const base = String(draft.rowsText || '');
              const sep = base && !base.endsWith('\t') && !base.endsWith('\n') ? '\t' : '';
              onChange({ ...draft, rowsText: base + sep + sym });
            },
          }, lbl))) : null,
      h('textarea', {
        id: controlId + '-rows',
        rows: 5,
        disabled,
        value: draft.rowsText || '',
        placeholder: currentLayout === 'harvey'
          ? L('能力项\t本方案\t竞品A\n原生可编辑\t●\t◑', 'Capability\tOurs\tVendor A\nNative edit\t●\t◑')
          : L('模块\t负责人\t进度\n核心架构\t平台组\t已完成', 'Stream\tOwner\tStatus\nCore\tPlatform\tDone'),
        onChange: e => onChange({ ...draft, rowsText: e.target.value }),
      })) : null,
    showItemsEditor ? h('details', { className: 'ppt-structured-section', open: PPT_ITEM_LAYOUTS.has(currentLayout) },
      h('summary', null, L('结构化卡片 / 指标项（', 'Structured cards / metrics (') + items.length + L(' 项）', ')')),
      h('div', { className: 'tools' },
        h('button', { type: 'button', disabled: disabled || items.length >= 8, onClick: addItem }, L('+ 添加卡片项', '+ Add card item')),
        draft.bullets?.trim() ? h('button', { type: 'button', disabled, onClick: () => onChange({ ...draft, items: itemsFromBulletsText(draft.bullets, currentLayout) }) }, L('从要点文本自动生成卡片', 'Convert bullets to cards')) : null),
      items.map((entry, idx) => h('div', { key: idx, className: 'ppt-item-editor' },
        h('div', { className: 'ppt-item-head' },
          h('strong', null, '#' + (idx + 1)),
          h('button', { type: 'button', disabled, onClick: () => removeItem(idx) }, L('移除', 'Remove'))),
        h('div', { className: 'ppt-archetype-subgrid' },
          h('div', null,
            h('label', null, currentLayout === 'kpi' ? L('核心数值', 'Metric value') : L('角标 / 序号', 'Badge / step')),
            h('input', {
              value: currentLayout === 'kpi' ? entry.value : entry.tag,
              disabled,
              maxLength: 120,
              placeholder: currentLayout === 'kpi' ? '98.5%' : '01',
              onChange: e => updateItem(idx, currentLayout === 'kpi' ? 'value' : 'tag', e.target.value),
            })),
          h('div', null,
            h('label', null, currentLayout === 'kpi' ? L('涨跌 / 标签', 'Delta / note') : L('状态强调', 'Semantic tone')),
            currentLayout === 'kpi'
              ? h('input', { value: entry.delta, disabled, maxLength: 120, placeholder: '+12% YoY', onChange: e => updateItem(idx, 'delta', e.target.value) })
              : h('select', { value: entry.status || '', disabled, onChange: e => updateItem(idx, 'status', e.target.value) },
                  h('option', { value: '' }, L('默认表面', 'Default')),
                  h('option', { value: 'accent' }, L('主色强调', 'Accent')),
                  h('option', { value: 'positive' }, L('正向达成', 'Positive')),
                  h('option', { value: 'warning' }, L('风险关注', 'Warning')),
                  h('option', { value: 'negative' }, L('负向警示', 'Negative'))))),
        currentLayout === 'gantt' ? h('div', { className: 'ppt-archetype-subgrid' },
          h('div', null,
            h('label', null, L('起始列 (0-based)', 'Start slot (0-based)')),
            h('input', { type: 'number', min: 0, max: 52, step: 0.5, value: entry.start ?? '', disabled, placeholder: '0', onChange: e => updateItem(idx, 'start', e.target.value) })),
          h('div', null,
            h('label', null, L('跨度列数 (0=里程碑)', 'Span (0=milestone)')),
            h('input', { type: 'number', min: 0, max: 52, step: 0.5, value: entry.span ?? '', disabled, placeholder: '1', onChange: e => updateItem(idx, 'span', e.target.value) }))) : null,
        currentLayout === 'org' ? h('div', null,
          h('label', null, L('角色 / 职级标签', 'Role / title badge')),
          h('input', { value: entry.role || '', disabled, maxLength: 120, placeholder: L('例如：技术负责人', 'e.g. VP Engineering'), onChange: e => updateItem(idx, 'role', e.target.value) })) : null,
        currentLayout === 'process' ? h('div', null,
          h('label', null, L('阶段转化率 / 指标', 'Stage conversion / metric')),
          h('input', { value: entry.conversion || '', disabled, maxLength: 120, placeholder: '42%', onChange: e => updateItem(idx, 'conversion', e.target.value) })) : null,
        h('label', null, L('卡片标题', 'Card title')),
        h('input', { value: entry.title, disabled, maxLength: 300, onChange: e => updateItem(idx, 'title', e.target.value) }),
        h('label', null, L('说明正文', 'Card description')),
        h('textarea', { rows: 2, value: entry.text, disabled, maxLength: 1500, onChange: e => updateItem(idx, 'text', e.target.value) }),
        currentLayout === 'architecture' || (Array.isArray(entry.bullets) && entry.bullets.length > 0) ? h('div', null,
          h('label', null, L('子模块 / 要点（每行一项）', 'Sub-modules / bullets (one per line)')),
          h('textarea', {
            rows: 2,
            value: Array.isArray(entry.bullets) ? entry.bullets.join('\n') : '',
            disabled,
            placeholder: L('模块 A\n模块 B', 'Module A\nModule B'),
            onChange: e => updateItem(idx, 'bullets', e.target.value.split(/\r?\n/)),
          })) : null))) : null);
}

const PPT_SAVED_BRANDS_KEY = 'dsh-ppt:saved-brands';
const PPT_FALLBACK_MASTER_PRESETS = Object.freeze([
  { id: 'mckinsey-board', zh: '麦肯锡董事会简报', en: 'McKinsey Board Brief', metaZh: '0px 直角卡片 · 结论先行 · 深海蓝主调', metaEn: '0px sharp cards · Action titles · Deep navy', theme: 'consulting', brand: { primaryColor: '#0057B8', secondaryColor: '#0E7490', backgroundColor: '#FFFFFF', textColor: '#0F172A', chromeStyle: 'consulting-classic' } },
  { id: 'bcg-growth', zh: 'BCG 增长与双碳战略', en: 'BCG Growth Strategy', metaZh: '翡翠绿主色 · 价值链五边形箭头 · 哈维球矩阵', metaEn: 'Emerald accent · Value-chain chevrons · Harvey matrix', theme: 'bcg-emerald', brand: { primaryColor: '#006B54', secondaryColor: '#0F4C81', backgroundColor: '#FFFFFF', textColor: '#0D1F18', chromeStyle: 'consulting-classic' } },
  { id: 'sequoia-memo', zh: '红杉 / YC 创投简报（明亮版）', en: 'Sequoia / YC Partner Deck', metaZh: '适合邮件与平板阅读 · TAM 同心圆 · 增长指标', metaEn: 'Screen-first daylight · TAM sizing · Traction KPIs', theme: 'venture-daylight', brand: { primaryColor: '#C2410C', secondaryColor: '#0F766E', backgroundColor: '#FFFFFF', textColor: '#111827', chromeStyle: 'keynote-spatial' } },
  { id: 'apple-cupertino', zh: 'Cupertino 旗舰产品发布', en: 'Cupertino Spatial Keynote', metaZh: '无顶部分隔线 · 16pt 呼吸感浮卡 · 大数字聚焦', metaEn: 'Divider-free canvas · 16pt airy Bento · Hero metrics', theme: 'keynote-light', brand: { primaryColor: '#0066CC', secondaryColor: '#5E5CE6', backgroundColor: '#FFFFFF', textColor: '#1D1D1F', chromeStyle: 'keynote-spatial' } },
  { id: 'stripe-product', zh: 'Stripe / Vercel 产研评审', en: 'Stripe / Vercel Product Craft', metaZh: '1px 精密 Bento 网格 · 系统分层架构 · 路线图', metaEn: '1px Bento grid · Layered architecture · Roadmap', theme: 'stripe-craft', brand: { primaryColor: '#4F46E5', secondaryColor: '#0284C7', backgroundColor: '#F8FAFC', textColor: '#0F172A', chromeStyle: 'saas-bento' } },
  { id: 'economist-macro', zh: '经济学人 / FT 宏观与财报', en: 'Economist & FT Briefing', metaZh: '暖纸底色 · 红标书脊 · 衬线标题 + 瀑布利润桥', metaEn: 'Warm paper · Editorial folio · Serif title & waterfall', theme: 'economist-brief', brand: { primaryColor: '#C8102E', secondaryColor: '#1D3557', backgroundColor: '#F9F8F5', textColor: '#141413', headingFont: 'Georgia', chromeStyle: 'editorial-folio' } },
  { id: 'nature-defense', zh: 'Nature / ETH 学术答辩', en: 'Nature & Beamer Defense', metaZh: 'Beamer 通栏页眉 · 无竖线学术三线表 · 严谨对比', metaEn: 'Beamer header band · Booktabs 3-line tables · Rigor', theme: 'academic', brand: { primaryColor: '#006980', secondaryColor: '#C8430E', backgroundColor: '#FFFFFF', textColor: '#111827', chromeStyle: 'academic-minimal' } },
  { id: 'imperial-gov', zh: '现代东方政务述职', en: 'Modern Institutional Briefing', metaZh: '深霁蓝庄重封面 + 宣纸浅底正文 · 双线页眉', metaEn: 'Inverted slate cover + warm paper body · Double rule', theme: 'exec-jilan', brand: { primaryColor: '#1A2B4C', secondaryColor: '#9E1B1E', chromeStyle: 'gov-ceremonial' } },
]);

function readSavedBrands() {
  try {
    const raw = window.localStorage?.getItem(PPT_SAVED_BRANDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function writeSavedBrands(list) {
  try {
    window.localStorage?.setItem(PPT_SAVED_BRANDS_KEY, JSON.stringify(list.slice(0, 12)));
  } catch { /* sandbox storage fallback */ }
}

function StyleStudioPanel({ project, busy, blocked, onApplyTheme, onApplyBrand, onApplyAbsorbed, onError, onMessage }) {
  const L = (zh, en) => languageOf() === 'en' ? en : zh;
  const controlId = React.useId();
  const themes = Array.isArray(project?.themes) ? project.themes : [];
  const masterPresets = Array.isArray(project?.presets) && project.presets.length > 0
    ? project.presets
    : PPT_FALLBACK_MASTER_PRESETS.map(p => ({ id: p.id, name: L(p.zh, p.en), sourceStyle: L(p.metaZh, p.metaEn), theme: p.theme, brand: p.brand }));
  const lightThemes = themes.filter(item => !item.dark);
  const darkThemes = themes.filter(item => item.dark);
  const savedBrand = project?.brand || {};
  const activeThemeMeta = themes.find(item => item.id === project?.theme);
  const activeChromeStyle = savedBrand.chromeStyle || activeThemeMeta?.chromeStyle || '';
  const [brandDraft, setBrandDraft] = React.useState(() => ({
    name: savedBrand.name || '',
    primaryColor: savedBrand.primaryColor || '',
    secondaryColor: savedBrand.secondaryColor || '',
    backgroundColor: savedBrand.backgroundColor || '',
    textColor: savedBrand.textColor || '',
    fontFamily: savedBrand.fontFamily || '',
    headingFont: savedBrand.headingFont || '',
    footer: savedBrand.footer || '',
    logo: savedBrand.logo || '',
    chromeStyle: savedBrand.chromeStyle || '',
  }));
  const [absorbing, setAbsorbing] = React.useState(false);
  const [absorbed, setAbsorbed] = React.useState(null);
  const [absorbedName, setAbsorbedName] = React.useState('');
  const [savedVault, setSavedVault] = React.useState(() => readSavedBrands());

  React.useEffect(() => {
    const next = project?.brand || {};
    setBrandDraft({
      name: next.name || '',
      primaryColor: next.primaryColor || '',
      secondaryColor: next.secondaryColor || '',
      backgroundColor: next.backgroundColor || '',
      textColor: next.textColor || '',
      fontFamily: next.fontFamily || '',
      headingFont: next.headingFont || '',
      footer: next.footer || '',
      logo: next.logo || '',
      chromeStyle: next.chromeStyle || '',
    });
  }, [project?.id, project?.revision]);

  const disabled = busy || blocked || absorbing;

  function saveCurrentAbsorbedToVault() {
    if (!absorbed) return;
    const entryBrand = {
      ...(absorbed.sanitizedBrand || {}),
      ...(!absorbed.sanitizedBrand?.chromeStyle && absorbed.recommendedChrome ? { chromeStyle: absorbed.recommendedChrome } : {}),
    };
    if (typeof entryBrand.logo === 'string' && entryBrand.logo.length > 260000) {
      delete entryBrand.logo;
    }
    const label = (absorbedName || entryBrand.name || L('企业模板风格', 'Corporate style')).replace(/\.pptx$/i, '').slice(0, 48);
    const nextItem = {
      id: 'brand-' + Date.now(),
      label,
      theme: absorbed.recommendedTheme || project.theme || 'consulting',
      brand: entryBrand,
    };
    const nextList = [nextItem, ...savedVault.filter(item => item.label !== label)].slice(0, 12);
    setSavedVault(nextList);
    writeSavedBrands(nextList);
    onMessage(L('已收藏到“我的品牌库”，后续任何演示文稿均可一键套用。', 'Saved to My Brand Library for 1-click reuse across future decks.'));
  }

  function removeVaultItem(id) {
    const nextList = savedVault.filter(item => item.id !== id);
    setSavedVault(nextList);
    writeSavedBrands(nextList);
  }

  function renderSwatches(palette) {
    if (!palette || typeof palette !== 'object') return null;
    const colors = [palette.bg, palette.panel, palette.accent, palette.accent2 || palette.fg].filter(c => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c));
    return h('span', { className: 'ppt-swatch-row', 'aria-hidden': 'true' },
      colors.map((hex, idx) => h('span', { key: idx, className: 'ppt-swatch-dot', style: { backgroundColor: hex } })));
  }

  function renderThemeCard(theme) {
    const active = project.theme === theme.id;
    return h('button', {
      type: 'button',
      key: theme.id,
      className: 'ppt-theme-card',
      'data-dsh-card': '',
      'aria-pressed': active ? 'true' : 'false',
      disabled,
      onClick: () => { if (!active) onApplyTheme(theme.id); },
    },
      h('div', { className: 'ppt-theme-card-top' },
        renderSwatches(theme.palette),
        active ? h('span', { className: 'w-tag' }, L('当前使用', 'Active')) : null),
      h('strong', { className: 'ppt-theme-name' }, theme.name || theme.id),
      theme.mood ? h('span', { className: 'ppt-theme-meta' }, theme.mood) : null,
      theme.bestFor ? h('span', { className: 'ppt-theme-meta' }, L('适合：', 'Best for: ') + theme.bestFor) : null);
  }

  function handlePptxFile(file) {
    if (!file) return;
    if (!/\.pptx$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError(L('请选择 24 MiB 以内的 .pptx 参考文件。', 'Choose a reference .pptx file up to 24 MiB.'));
      return;
    }
    setAbsorbing(true);
    onError('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const response = await action({
          operation: 'absorb-upload',
          id: project.id,
          expectedRevision: project.revision,
          data: String(reader.result || ''),
          extractLogo: true,
        });
        setAbsorbed(response.absorbed);
        setAbsorbedName(file.name);
        onMessage(L('已解析参考 PPTX 配色、字体与对比度净化方案，确认后可一键应用。', 'Extracted and contrast-sanitized the reference PPTX palette and fonts. Review and apply below.'));
      } catch (err) {
        onError(err.message || L('解析参考 PPTX 失败。', 'Could not extract style from this PPTX.'));
      } finally {
        setAbsorbing(false);
      }
    };
    reader.onerror = () => {
      setAbsorbing(false);
      onError(L('无法读取该 PPTX 文件，请重试。', 'Could not read the PPTX file. Try again.'));
    };
    reader.readAsDataURL(file);
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      onError(L('Logo 请选择 5 MiB 以内的 PNG 或 JPEG 图片。', 'Choose a PNG or JPEG logo up to 5 MiB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBrandDraft(prev => ({ ...prev, logo: String(reader.result || '') }));
      onMessage(L('Logo 已载入，点击下方“应用品牌设置”生效。', 'Logo loaded. Click Apply brand below to save.'));
    };
    reader.onerror = () => onError(L('无法读取图片，请重试。', 'Could not read the image. Try again.'));
    reader.readAsDataURL(file);
  }

  function submitBrand() {
    const payload = {
      name: brandDraft.name.trim(),
      footer: brandDraft.footer.trim(),
      ...(brandDraft.primaryColor.trim() ? { primaryColor: brandDraft.primaryColor.trim() } : {}),
      ...(brandDraft.secondaryColor.trim() ? { secondaryColor: brandDraft.secondaryColor.trim() } : {}),
      ...(brandDraft.backgroundColor.trim() ? { backgroundColor: brandDraft.backgroundColor.trim() } : {}),
      ...(brandDraft.textColor.trim() ? { textColor: brandDraft.textColor.trim() } : {}),
      ...(brandDraft.fontFamily.trim() ? { fontFamily: brandDraft.fontFamily.trim() } : {}),
      ...(brandDraft.headingFont.trim() ? { headingFont: brandDraft.headingFont.trim() } : {}),
      ...(brandDraft.chromeStyle ? { chromeStyle: brandDraft.chromeStyle } : savedBrand.chromeStyle ? { chromeStyle: null } : {}),
      ...(brandDraft.logo ? { logo: brandDraft.logo } : savedBrand.logo ? { logo: null } : {}),
    };
    onApplyBrand(payload);
  }

  return h('section', { className: 'card ppt-style-studio', 'data-dsh-card': '', 'aria-label': L('风格与母版工作室', 'Style & Master Studio') },
    h('style', null, PPT_STYLE_STUDIO_CSS),
    h('h3', null, L('风格与母版工作室', 'Style & Master Studio')),
    h('p', { className: 'muted' }, L('无需手调设计参数：可一键直吸名家范本、切换 24 套大师明暗主题，或拖拽企业参考 PPTX 提取配色、双字体、封面反白与母版骨架。所有更改同步更新 HTML 与可编辑 PPTX，且支持撤销。', 'Apply curated master deck DNA in one click, switch 24 themes, or drop a reference .pptx to absorb its palette, font pairing, cover polarity, and skeleton with undo.')),
    blocked ? h('p', { className: 'dirty' }, L('请先保存或取消“内容编辑 / 数据推演”中的未保存修改，再切换全稿风格。', 'Save or discard unsaved content or scenario edits before restyling the presentation.')) : null,

    savedVault.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('我的已收藏企业品牌（一键复用）', 'My Saved Brand Presets')),
      h('div', { className: 'ppt-theme-grid' }, savedVault.map(item =>
        h('div', { key: item.id, className: 'ppt-theme-card', 'data-dsh-card': '' },
          h('div', { className: 'ppt-theme-card-top' },
            renderSwatches({ bg: item.brand?.backgroundColor, accent: item.brand?.primaryColor, accent2: item.brand?.secondaryColor, fg: item.brand?.textColor }),
            h('button', { type: 'button', className: 'ppt-pill', disabled, onClick: () => removeVaultItem(item.id) }, L('移除', 'Remove'))),
          h('strong', { className: 'ppt-theme-name' }, item.label),
          h('button', {
            type: 'button',
            className: 'ppt-pill',
            disabled,
            onClick: () => onApplyAbsorbed({ theme: item.theme, brand: item.brand }),
          }, L('套用此品牌', 'Apply brand')))))) : null,

    masterPresets.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('名家范本一键直吸（免上传 .pptx）', 'World-Class Reference Deck Presets')),
      h('div', { className: 'ppt-theme-grid' }, masterPresets.map(preset => {
        const isCurrent = project.theme === preset.theme && (savedBrand.chromeStyle || activeChromeStyle) === (preset.brand?.chromeStyle || preset.chromeStyle);
        return h('button', {
          type: 'button',
          key: preset.id,
          className: 'ppt-theme-card',
          'data-dsh-card': '',
          'aria-pressed': isCurrent ? 'true' : 'false',
          disabled,
          onClick: () => onApplyAbsorbed({ theme: preset.theme, brand: preset.brand }),
        },
          h('div', { className: 'ppt-theme-card-top' },
            renderSwatches({ bg: preset.brand?.backgroundColor || '#FFFFFF', accent: preset.brand?.primaryColor, accent2: preset.brand?.secondaryColor, fg: preset.brand?.textColor || '#0F172A' }),
            isCurrent ? h('span', { className: 'w-tag' }, L('已匹配', 'Active')) : null),
          h('strong', { className: 'ppt-theme-name' }, preset.name),
          preset.sourceStyle ? h('span', { className: 'ppt-theme-meta' }, preset.sourceStyle) : null);
      }))) : null,

    lightThemes.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('明亮投影与政务/咨询/学术推荐（', 'Projector-safe daylight themes (') + lightThemes.length + L(' 套）', ')')),
      h('div', { className: 'ppt-theme-grid' }, lightThemes.map(renderThemeCard))) : null,

    darkThemes.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('沉浸舞台与科技路演深色主题（', 'Keynote & stage dark themes (') + darkThemes.length + L(' 套）', ')')),
      h('div', { className: 'ppt-theme-grid' }, darkThemes.map(renderThemeCard))) : null,

    h('div', { className: 'ppt-theme-section' },
      h('div', { className: 'ppt-theme-card-top' },
        h('h4', null, L('母版骨架（6 套结构规范）', 'Master Skeleton (6 Chrome Styles)')),
        savedBrand.chromeStyle ? h('button', {
          type: 'button',
          className: 'ppt-pill',
          disabled,
          onClick: () => onApplyBrand({ chromeStyle: null }),
        }, L('恢复主题默认', 'Theme default')) : null),
      h('p', { className: 'muted' }, L('改变页眉分割线、圆角几何、页码位置与卡片装饰结构，可独立于配色切换。', 'Switch header dividers, card corner geometry, folio placement, and card accents independently from colours.')),
      h('div', { className: 'ppt-theme-grid', role: 'group', 'aria-label': L('母版骨架', 'Master Skeleton') },
        PPT_CHROME_SKELETONS.map(sk => {
          const pressed = savedBrand.chromeStyle ? savedBrand.chromeStyle === sk.id : activeChromeStyle === sk.id;
          return h('button', {
            type: 'button',
            key: sk.id,
            className: 'ppt-theme-card',
            'data-dsh-card': '',
            'data-chrome-style': sk.id,
            'aria-pressed': pressed ? 'true' : 'false',
            disabled,
            onClick: () => onApplyBrand({ chromeStyle: sk.id }),
          },
            h('div', { className: 'ppt-theme-card-top' },
              h('strong', { className: 'ppt-theme-name' }, L(sk.zh, sk.en)),
              pressed ? h('span', { className: 'w-tag' }, savedBrand.chromeStyle ? L('已指定', 'Override') : L('默认', 'Default')) : null),
            h('span', { className: 'ppt-theme-meta' }, L(sk.descZh, sk.descEn)));
        }))),

    h('details', { className: 'ppt-structured-section', open: true },
      h('summary', null, L('吸收外部优质 PPTX 风格（零本地路径暴露）', 'Absorb style from reference .pptx')),
      h('p', { className: 'muted' }, L('上传公司模板或喜欢的参考 .pptx（≤24 MiB）：深度解析母版主辅色、中英文标题/正文字体配对、封面深底反白、母版 Logo 与逐页版式序列，自动完成 WCAG ≥4.5:1 对比度净化。', 'Upload a corporate template or reference .pptx (≤24 MiB) to extract dual brand colours, heading/body fonts, cover polarity, logo, and slide archetypes with WCAG ≥4.5:1 clamping.')),
      h('div', {
        className: 'ppt-dropzone',
        onDragOver: e => { e.preventDefault(); },
        onDrop: e => { e.preventDefault(); if (!disabled) handlePptxFile(e.dataTransfer?.files?.[0]); },
      },
        h('label', { htmlFor: controlId + '-absorb-pptx' }, absorbing ? L('正在解析参考 PPTX…', 'Extracting reference PPTX style…') : L('拖拽 .pptx 到此处，或点击选择参考文件', 'Drop a .pptx here, or choose a reference file')),
        h('input', {
          id: controlId + '-absorb-pptx',
          type: 'file',
          accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
          disabled,
          onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handlePptxFile(f); },
        })),
      absorbed ? h('div', { className: 'ppt-absorbed-card', 'data-dsh-card': '' },
        h('strong', null, L('已提取风格方案：', 'Extracted style: ') + absorbedName + ' · ' + (absorbed.slideCount ?? 0) + L(' 页', ' slides')),
        absorbed.recommendedTheme ? h('p', { className: 'muted' }, L('匹配基底主题：', 'Recommended base theme: ') + absorbed.recommendedTheme + (absorbed.recommendedChrome ? ' · ' + L('推荐母版骨架：', 'Recommended skeleton: ') + pptChromeLabel(absorbed.recommendedChrome) + ' (' + absorbed.recommendedChrome + ')' : '')) : null,
        absorbed.extractedSkeleton ? h('p', { className: 'muted' },
          L('骨架几何：', 'Extracted geometry: ') +
          (absorbed.extractedSkeleton.cornerStyle || 'rounded') +
          (absorbed.extractedSkeleton.hasTopBanner ? L(' · 顶部通栏横幅', ' · Top banner') : '') +
          (absorbed.extractedSkeleton.hasSideSpine ? L(' · 侧边装饰脊', ' · Side spine') : '') +
          (absorbed.sanitizedBrand?.coverMode === 'inverted-accent' ? L(' · 深色庄重封面+浅色正文', ' · Inverted cover + daylight body') : '') +
          (typeof absorbed.extractedSkeleton.masterShapeCount === 'number' ? ' · ' + absorbed.extractedSkeleton.masterShapeCount + L(' 个母版形状', ' master shapes') : '')) : null,
        Array.isArray(absorbed.slideSkeleton) && absorbed.slideSkeleton.length > 0 ? h('p', { className: 'muted' },
          L('页面骨架序列：', 'Slide sequence: ') + absorbed.slideSkeleton.slice(0, 10).map(s => 'P' + s.slideNumber + ':' + s.inferredLayout + (s.variant ? '[' + s.variant + ']' : '')).join(' → ') + (absorbed.slideSkeleton.length > 10 ? ' …' : '')) : null,
        absorbed.narrativeProfile && typeof absorbed.narrativeProfile.diagramRatio === 'number' ? h('p', { className: 'muted' },
          L('版式诊断：专业图示占比 ', 'Layout recipe: diagram ratio ') + Math.round(absorbed.narrativeProfile.diagramRatio * 100) + '%' +
          (absorbed.recommendedTableStyle ? ' · ' + L('推荐表格：', 'Table style: ') + absorbed.recommendedTableStyle : '')) : null,
        absorbed.sanitizedBrand ? h('div', { className: 'ppt-swatch-row' },
          [absorbed.sanitizedBrand.backgroundColor, absorbed.sanitizedBrand.primaryColor, absorbed.sanitizedBrand.secondaryColor, absorbed.sanitizedBrand.textColor].filter(Boolean).map((hex, i) =>
            h('span', { key: i, className: 'ppt-swatch-chip' },
              h('span', { className: 'ppt-swatch-dot', style: { backgroundColor: hex } }),
              h('code', null, hex)))) : null,
        (absorbed.sanitizedBrand?.fontFamily || absorbed.sanitizedBrand?.headingFont) ? h('p', { className: 'muted' },
          L('安全字体映射：', 'Safe font pairing: ') + [absorbed.sanitizedBrand.headingFont ? L('标题 ', 'Heading ') + absorbed.sanitizedBrand.headingFont : '', absorbed.sanitizedBrand.fontFamily ? L('正文 ', 'Body ') + absorbed.sanitizedBrand.fontFamily : ''].filter(Boolean).join(' · ')) : null,
        Array.isArray(absorbed.warnings) && absorbed.warnings.length > 0 ? h('p', { className: 'muted' }, absorbed.warnings.join(' ')) : null,
        absorbed.sanitizedBrand?.logo ? h('img', { className: 'image-preview', src: absorbed.sanitizedBrand.logo, alt: L('提取的母版 Logo', 'Extracted master logo') }) : null,
        h('div', { className: 'tools' },
          h('button', {
            type: 'button',
            className: 'primary',
            disabled,
            onClick: () => onApplyAbsorbed({
              theme: absorbed.recommendedTheme || project.theme,
              brand: absorbed.sanitizedBrand || absorbed.recommendedChrome
                ? { ...(absorbed.sanitizedBrand || {}), ...(!absorbed.sanitizedBrand?.chromeStyle && absorbed.recommendedChrome ? { chromeStyle: absorbed.recommendedChrome } : {}) }
                : null,
            }),
          }, L('一键应用吸收的主题与品牌', 'Apply absorbed theme & brand')),
          h('button', { type: 'button', disabled, onClick: saveCurrentAbsorbedToVault }, L('收藏到我的品牌库', 'Save to My Brand Library')),
          h('button', { type: 'button', disabled, onClick: () => { setAbsorbed(null); setAbsorbedName(''); } }, L('清除预览', 'Dismiss')))) : null),

    h('details', { className: 'ppt-structured-section', open: Boolean(project.brand) },
      h('summary', null, L('自定义品牌色、安全字体、Logo 与页脚', 'Custom brand colours, font, logo & footer')),
      h('div', { className: 'ppt-archetype-subgrid' },
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-primary' }, L('主强调色 (#RRGGBB)', 'Primary (#RRGGBB)')),
          h('div', { className: 'ppt-color-pair' },
            h('input', { type: 'color', 'aria-label': L('选择主强调色', 'Pick primary colour'), value: /^#[0-9A-Fa-f]{6}$/.test(brandDraft.primaryColor) ? brandDraft.primaryColor : '#0057B8', disabled, onChange: e => setBrandDraft({ ...brandDraft, primaryColor: e.target.value.toUpperCase() }) }),
            h('input', { id: controlId + '-brand-primary', value: brandDraft.primaryColor, disabled, placeholder: '#0057B8', onChange: e => setBrandDraft({ ...brandDraft, primaryColor: e.target.value }) }))),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-secondary' }, L('辅助色 (#RRGGBB)', 'Secondary (#RRGGBB)')),
          h('div', { className: 'ppt-color-pair' },
            h('input', { type: 'color', 'aria-label': L('选择辅助色', 'Pick secondary colour'), value: /^#[0-9A-Fa-f]{6}$/.test(brandDraft.secondaryColor) ? brandDraft.secondaryColor : '#0E7490', disabled, onChange: e => setBrandDraft({ ...brandDraft, secondaryColor: e.target.value.toUpperCase() }) }),
            h('input', { id: controlId + '-brand-secondary', value: brandDraft.secondaryColor, disabled, placeholder: '#0E7490', onChange: e => setBrandDraft({ ...brandDraft, secondaryColor: e.target.value }) }))),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-bg' }, L('背景色 (#RRGGBB)', 'Background (#RRGGBB)')),
          h('div', { className: 'ppt-color-pair' },
            h('input', { type: 'color', 'aria-label': L('选择背景色', 'Pick background colour'), value: /^#[0-9A-Fa-f]{6}$/.test(brandDraft.backgroundColor) ? brandDraft.backgroundColor : '#FFFFFF', disabled, onChange: e => setBrandDraft({ ...brandDraft, backgroundColor: e.target.value.toUpperCase() }) }),
            h('input', { id: controlId + '-brand-bg', value: brandDraft.backgroundColor, disabled, placeholder: '#FFFFFF', onChange: e => setBrandDraft({ ...brandDraft, backgroundColor: e.target.value }) }))),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-fg' }, L('正文色 (#RRGGBB)', 'Text (#RRGGBB)')),
          h('div', { className: 'ppt-color-pair' },
            h('input', { type: 'color', 'aria-label': L('选择正文色', 'Pick text colour'), value: /^#[0-9A-Fa-f]{6}$/.test(brandDraft.textColor) ? brandDraft.textColor : '#0F172A', disabled, onChange: e => setBrandDraft({ ...brandDraft, textColor: e.target.value.toUpperCase() }) }),
            h('input', { id: controlId + '-brand-fg', value: brandDraft.textColor, disabled, placeholder: '#0F172A', onChange: e => setBrandDraft({ ...brandDraft, textColor: e.target.value }) }))),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-font' }, L('正文安全字体', 'Body font family')),
          h('input', { id: controlId + '-brand-font', value: brandDraft.fontFamily, disabled, placeholder: 'Microsoft YaHei', onChange: e => setBrandDraft({ ...brandDraft, fontFamily: e.target.value }) })),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-heading-font' }, L('标题字体（可选衬线配对）', 'Heading font (optional)')),
          h('input', { id: controlId + '-brand-heading-font', value: brandDraft.headingFont, disabled, placeholder: 'Georgia', onChange: e => setBrandDraft({ ...brandDraft, headingFont: e.target.value }) }))),
      h('label', { htmlFor: controlId + '-brand-chrome' }, L('母版骨架覆盖（chromeStyle）', 'Master skeleton override (chromeStyle)')),
      h('select', {
        id: controlId + '-brand-chrome',
        value: brandDraft.chromeStyle,
        disabled,
        onChange: e => setBrandDraft({ ...brandDraft, chromeStyle: e.target.value }),
      },
        h('option', { value: '' }, L('跟随主题默认', 'Theme default')),
        PPT_CHROME_SKELETONS.map(sk => h('option', { key: sk.id, value: sk.id }, L(sk.zh, sk.en)))),
      h('label', { htmlFor: controlId + '-brand-footer' }, L('统一页脚文字', 'Shared footer')),
      h('input', { id: controlId + '-brand-footer', value: brandDraft.footer, disabled, maxLength: 200, placeholder: L('例如：战略发展部 · 2026 Q4', 'e.g. Strategy Team · 2026'), onChange: e => setBrandDraft({ ...brandDraft, footer: e.target.value }) }),
      h('label', { htmlFor: controlId + '-brand-logo' }, L('上传品牌 Logo（PNG / JPEG）', 'Upload brand logo (PNG / JPEG)')),
      h('input', { id: controlId + '-brand-logo', type: 'file', accept: 'image/png,image/jpeg', disabled, onChange: handleLogoUpload }),
      brandDraft.logo ? h('div', { className: 'tools' },
        h('img', { className: 'image-preview', src: brandDraft.logo, alt: L('当前品牌 Logo', 'Current brand logo') }),
        h('button', { type: 'button', disabled, onClick: () => setBrandDraft({ ...brandDraft, logo: '' }) }, L('移除 Logo', 'Clear logo'))) : null,
      h('div', { className: 'tools' },
        h('button', { type: 'button', className: 'primary', disabled, onClick: submitBrand }, L('应用品牌设置', 'Apply brand')),
        project.brand ? h('button', { type: 'button', disabled, onClick: () => onApplyBrand(null) }, L('恢复默认主题无品牌状态', 'Clear custom brand')) : null)));
}

const PPT_STYLE_STUDIO_CSS = `
.ppt-workbench .ppt-archetype-box{border-bottom:1px solid var(--w-border);padding-bottom:16px;margin-bottom:16px}
.ppt-workbench .ppt-archetype-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ppt-workbench .ppt-pill{font-size:12px;padding:5px 10px;border-radius:999px;border:1px solid var(--w-border);background:var(--w-bg);color:var(--w-text);cursor:pointer}
.ppt-workbench .ppt-pill[aria-pressed=true]{background:var(--w-selected);border-color:var(--w-accent);color:var(--w-accent);font-weight:600}
.ppt-workbench .ppt-archetype-subgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;margin-top:8px}
.ppt-workbench .ppt-structured-section{border-top:1px solid var(--w-border);margin-top:14px;padding-top:12px}
.ppt-workbench .ppt-item-editor{border:1px solid var(--w-border);border-radius:8px;padding:10px;margin-top:10px;background:var(--w-soft)}
.ppt-workbench .ppt-item-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}
.ppt-workbench .ppt-theme-section{margin:16px 0}
.ppt-workbench .ppt-theme-section h4{font-size:13px;color:var(--w-muted);margin:0 0 10px;font-weight:600}
.ppt-workbench .ppt-theme-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ppt-workbench .ppt-theme-card{display:flex;flex-direction:column;gap:5px;padding:10px;border-radius:10px;border:1px solid var(--w-border);background:var(--w-bg);text-align:start;cursor:pointer;min-width:0}
.ppt-workbench .ppt-theme-card:not(:disabled):hover{background:var(--w-soft)}
.ppt-workbench .ppt-theme-card[aria-pressed=true]{border-color:var(--w-accent);background:var(--w-selected)}
.ppt-workbench .ppt-theme-card-top{display:flex;justify-content:space-between;align-items:center;gap:6px;width:100%}
.ppt-workbench .ppt-theme-name{font-size:13px;line-height:1.35;color:var(--w-text)}
.ppt-workbench .ppt-theme-meta{font-size:11px;line-height:1.4;color:var(--w-muted)}
.ppt-workbench .ppt-swatch-row{display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap}
.ppt-workbench .ppt-swatch-dot{width:14px;height:14px;border-radius:50%;border:1px solid var(--w-border);display:inline-block;flex-shrink:0}
.ppt-workbench .ppt-swatch-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border:1px solid var(--w-border);border-radius:999px;background:var(--w-bg);font-size:11px}
.ppt-workbench .ppt-dropzone{border:1px dashed var(--w-border);border-radius:10px;padding:12px;margin-top:8px;background:var(--w-soft)}
.ppt-workbench .ppt-absorbed-card{border:1px solid var(--w-border);border-radius:10px;padding:12px;margin-top:10px;background:var(--w-bg);display:flex;flex-direction:column;gap:8px}
.ppt-workbench .ppt-color-pair{display:grid;grid-template-columns:34px minmax(0,1fr);gap:6px;align-items:center}
.ppt-workbench .ppt-color-pair input[type=color]{width:34px;height:34px;padding:2px;border:1px solid var(--w-border);border-radius:8px;background:var(--w-bg);cursor:pointer}
@container dsh-workbench (max-width:760px){.ppt-workbench .ppt-theme-grid,.ppt-workbench .ppt-archetype-subgrid{grid-template-columns:1fr}}
`;
