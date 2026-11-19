// Spotlight tour configuration and clipboard helper for dsh-ppt Workbench.
// Uses only host/workbench CSS tokens (--w-*, --dsw-alias-*) via W.CoachmarkTour.

const PPT_TOUR_STORAGE_KEY = 'dsh-ppt.tour.v1';

function buildPptTourSteps({ project, pptText }) {
  return [
    {
      id: 'start',
      selector: '[data-tour="ppt-start"]',
      fallback: '.w-header-actions',
      side: 'bottom',
      title: pptText('新建、体验旗舰示例或直导 Excel / Word / PPTX', 'Create, load Flagship Demo, or import Office files'),
      desc: pptText(
        '点击顶栏「新建演示文稿」、「导入 Excel / Word (.xlsx/.csv/.docx)」或「导入 PPTX 翻新」，也可一键体验旗舰示例，或复制下方指令发到对话生成：',
        'Use New presentation, Import Excel/Word (.xlsx/.csv/.docx), Import & Modernize .pptx, Load Flagship Demo, or copy this chat prompt:',
      ),
      prompt: pptText(
        '请根据当前工作区材料制作一份结构清晰的演示文稿，输出 HTML、可编辑 PPTX 与工程包。',
        'Create a structured presentation from workspace materials and export HTML, editable PPTX, and project JSON.',
      ),
      promptLabel: pptText('复制对话生成指令', 'Copy generation prompt'),
    },
    {
      id: 'edit',
      selector: project ? '[data-tour="ppt-edit"]' : '[data-tour="ppt-library"]',
      fallback: project ? '.ppt-canvas-region' : '.w-empty',
      side: 'bottom',
      title: pptText('24+ 版式、Mermaid 原生流程图、LaTeX 与演讲时长预算', '24+ layouts, native Mermaid, LaTeX & pace budget'),
      desc: pptText(
        '点击画布文字即可定位输入框，在「内容编辑」切换 KPI、桑基图、不等宽市场图、Mermaid 流程图/时序图与原生公式，并实时监控目标演讲时长与超时提醒。',
        'Click slide text to focus its field, switch among 24+ layouts, Mermaid flowcharts/sequences, and native math, and monitor target speaking duration.',
      ),
    },
    {
      id: 'style',
      selector: '[data-tour="ppt-style"]',
      fallback: '.dsh-style-switcher',
      side: 'bottom',
      title: pptText('24 套大师主题、6 套母版骨架与企业模板吸收', '24 master themes, 6 skeletons & template absorb'),
      desc: pptText(
        '在「风格与母版」切换 24 套明暗主题与 6 套母版骨架，一键直吸名家范本，或上传参考 .pptx 自动提取配色、字体与 Logo。',
        'Switch 24 themes, 6 chrome skeletons, and 8 master presets in Style Studio, or absorb palette, fonts, and logo from a company .pptx.',
      ),
    },
    {
      id: 'deliver',
      selector: '[data-tour="ppt-deliver"]',
      fallback: '.w-header-actions',
      side: 'bottom',
      title: pptText('双屏提词、高管一页纸 (.html) 与 Remotion 视频分镜包', 'Dual-screen presenter, One-Pager & Remotion bundle'),
      desc: pptText(
        '独立放映按 P 开双屏提词台（L 激光笔）；在「下载成品」可导出高管一页纸 (.html)、dsh-remotion 视频分镜包 (.zip)、演讲讲义与可编辑 PPTX。',
        'Press P in standalone HTML for Dual-Screen Presenter View (L laser), or export Executive One-Pager (.html), Remotion video bundle (.zip), handout, and PPTX.',
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
