// Spotlight tour configuration and clipboard helper for dsh-ppt Workbench.
// Uses only host/workbench CSS tokens (--w-*, --dsw-alias-*) via W.CoachmarkTour.

const PPT_TOUR_STORAGE_KEY = 'dsh-ppt.tour.v1';

function buildPptTourSteps({ project, editorMode, pptText }) {
  const prompt = pptText(
    '请根据当前工作区材料制作一份结构清晰的演示文稿，输出 HTML、可编辑 PPTX 与工程包。',
    'Create a structured presentation from workspace materials and export HTML, editable PPTX, and project JSON.',
  );
  if (project) {
    return [
      {
        id: 'mode',
        selector: '[data-tour="ppt-mode"]',
        fallback: '[data-tour="ppt-edit"]',
        side: 'bottom',
        title: pptText('灯箱总览与单页精修一键切换', 'Switch between Slide Lightbox & Slide Studio'),
        desc: pptText(
          '打开演示文稿默认进入发光 16:9「实体胶片灯箱」，全局统筹整套页序；随时点击「单页精修」进入三栏精调画布，或复制指令让助手继续扩展内容：',
          'Decks open on the illuminated 16:9 Physical Slide Lightbox for deck-level choreography; toggle Slide Studio anytime for slide-by-slide editing, or copy a chat prompt:',
        ),
        prompt,
        promptLabel: pptText('复制对话生成指令', 'Copy generation prompt'),
      },
      {
        id: 'lightbox',
        selector: editorMode === 'lightbox' ? '[data-tour="ppt-lightbox"]' : '.ppt-canvas-region',
        fallback: '[data-tour="ppt-edit"]',
        side: 'bottom',
        title: pptText('实体胶片灯箱：调序、复制、插入与单击直达精修', 'Slide Lightbox: reorder, duplicate, insert & click to edit'),
        desc: pptText(
          '在 16:9 透光胶片网格直接拖拽或点 ←/→ 调序、复制本页、在末尾卡片插入 31+ 版式空白胶片；单击任意胶片直达单页精修（支持双击文字原地改写、41 种图谱、Mermaid 与演讲时长预算）。',
          'Drag or use ←/→ on 16:9 illuminated transparencies to reorder, duplicate, or insert 31+ starter archetypes; click any slide to jump into Slide Studio (double-click inline edits, 41 layouts, Mermaid & pace budget).',
        ),
      },
      {
        id: 'style',
        selector: '[data-tour="ppt-style"]',
        fallback: '.dsh-style-switcher',
        side: 'bottom',
        title: pptText('风格与母版（24 主题 / 6 骨架）+ 13 风格 8 字体', 'Style Studio (24 themes / 6 skeletons) + 13 styles & 8 fonts'),
        desc: pptText(
          '在「风格与母版」切换 24 套明暗主题、6 套母版骨架与企业 .pptx 品牌吸收；顶栏右侧随时切换工作台 13 套视觉风格与 8 套字体。',
          'Switch 24 themes, 6 chrome skeletons, or absorb corporate .pptx branding in Style Studio; use the header switcher for 13 workbench styles & 8 fonts.',
        ),
      },
      {
        id: 'deliver',
        selector: '[data-tour="ppt-deliver"]',
        fallback: '.w-header-actions',
        side: 'bottom',
        title: pptText('PPTX、高管一页纸、双屏提词与 Remotion 分镜包', 'PPTX, One-Pager, Dual-Screen Presenter & Remotion bundle'),
        desc: pptText(
          '点击「PPTX」或「导出」下载 100% 原生可编辑 PPTX、高精 PDF、PNG 图包、高管一页纸 (.html) 与 dsh-remotion 分镜包 (.zip)；独立 HTML 按 P 开双屏提词（L 激光笔 / R 离线批注）。',
          'Export native editable PPTX, high-DPI PDF, PNG pack, Executive One-Pager (.html), and Remotion video bundle (.zip); press P in standalone HTML for Dual-Screen Presenter (L laser / R review notes).',
        ),
      },
    ];
  }
  return [
    {
      id: 'start',
      selector: '[data-tour="ppt-start"]',
      fallback: '.w-header-actions',
      side: 'bottom',
      title: pptText('新建、体验旗舰示例或直导 Excel / Word / PDF / PPTX', 'Create, load Flagship Demo, or import Office/PDF/PPTX'),
      desc: pptText(
        '点击顶栏「新建演示文稿」、「导入 Excel / Word / PDF」或「导入 PPTX 翻新」，也可一键体验旗舰示例，或复制下方指令发到对话生成：',
        'Use New presentation, Import Excel/Word/PDF, Import & Modernize .pptx, Load Flagship Demo, or copy this chat prompt:',
      ),
      prompt,
      promptLabel: pptText('复制对话生成指令', 'Copy generation prompt'),
    },
    {
      id: 'edit',
      selector: '[data-tour="ppt-library"]',
      fallback: '.w-empty',
      side: 'bottom',
      title: pptText('实体胶片灯箱总览 → 1 键跃入单页精修', 'Physical Slide Lightbox → 1-click Slide Studio'),
      desc: pptText(
        '打开任意演示文稿默认进入发光 16:9「实体胶片灯箱」，支持 ←/→ 与拖拽调序、复制及插入空白胶片；单击任意胶片跃入「单页精修」，编辑 41 种图谱、Mermaid 流程图、原生公式与演讲时长预算。',
        'Opening a deck launches the illuminated 16:9 Physical Slide Lightbox for drag/←/→ reordering, duplicating, and inserting slides; click any transparency card to enter Slide Studio with 41 layouts, Mermaid, formulas & pace budget.',
      ),
    },
    {
      id: 'style',
      selector: '.dsh-style-switcher',
      fallback: '[data-tour="ppt-style"]',
      side: 'bottom',
      title: pptText('13 套工作台风格 / 8 套字体 + 24 套大师主题母版', '13 Workbench Styles / 8 Fonts + 24 Master Themes'),
      desc: pptText(
        '顶栏随时切换工作台 13 套视觉风格与 8 套字体；进入工程后可在「风格与母版」切换 24 套明暗主题、6 套母版骨架并吸收公司 .pptx 品牌 DNA。',
        'Switch 13 workbench styles & 8 fonts from the header; inside a deck, open Style Studio for 24 master themes, 6 chrome skeletons, and .pptx brand absorption.',
      ),
    },
    {
      id: 'deliver',
      selector: '[data-tour="ppt-deliver"]',
      fallback: '.w-header-actions',
      side: 'bottom',
      title: pptText('双屏提词、高管一页纸 (.html) 与 Remotion 视频分镜包', 'Dual-screen presenter, One-Pager & Remotion bundle'),
      desc: pptText(
        '独立放映按 P 开双屏提词台（L 激光笔 / R 离线批注）；在「导出」可下载 100% 可编辑 PPTX、高精 PDF、高管一页纸 (.html)、dsh-remotion 视频分镜包 (.zip) 与演讲讲义。',
        'Press P in standalone HTML for Dual-Screen Presenter View (L laser / R review notes), or export editable PPTX, high-DPI PDF, Executive One-Pager (.html), Remotion bundle (.zip), and handout.',
      ),
    },
  ];
}

async function copyPptTourPrompt(text, { setMessage, pptText }) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setMessage?.(pptText('已复制对话提示词，可直接粘贴到聊天框发送。', 'Prompt copied. Paste it into chat to generate.'));
      return true;
    }
  } catch (_) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = String(text);
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append?.(ta);
    ta.select?.();
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : true;
    ta.remove?.();
    if (ok) {
      setMessage?.(pptText('已复制对话提示词，可直接粘贴到聊天框发送。', 'Prompt copied. Paste it into chat to generate.'));
    }
    return ok;
  } catch (_) {
    return false;
  }
}
