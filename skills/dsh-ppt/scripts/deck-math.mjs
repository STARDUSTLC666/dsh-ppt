/**
 * deck-math.mjs —— dsh-ppt 零外部依赖确定性 LaTeX 数学公式编译器。
 *
 * 将 LaTeX 数学表达式（行内 $...$、块级 $$...$$、\[...\]、\(...\) 以及 slide.formula）
 * 解析为结构化 AST，并同构编译为：
 *   1. ECMA-376 Office Math（<a14:m><m:oMathPara><m:oMath>...</m:oMath></m:oMathPara></a14:m>）
 *   2. W3C MathML（<math xmlns="http://www.w3.org/1998/Math/MathML">...</math>）
 *   3. 混排段落行内 DrawingML Run 描述符（兼容 LibreOffice 混排段落限制，杜绝吞公式或裸反斜杠泄漏）
 *   4. 2D 公式自然宽高比几何估算器（确保 LibreOffice StarMath / PowerPoint 等比居中无拉伸）
 */

const A14_NS = 'http://schemas.microsoft.com/office/drawing/2010/main'
const OMML_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML'

function escapeXmlText(value) {
  return String(value ?? '')
    .replace(/[\u000B\u000C]/g, ' ')
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtmlText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// 希腊字母、数学符号、大型算子、定界符与字体映射表
// ---------------------------------------------------------------------------

const GREEK_MAP = Object.freeze({
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ϵ',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  omicron: 'ο',
  pi: 'π',
  varpi: 'ϖ',
  rho: 'ρ',
  varrho: 'ϱ',
  sigma: 'σ',
  varsigma: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'ϕ',
  varphi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
})

const SYMBOL_MAP = Object.freeze({
  nabla: '∇',
  partial: '∂',
  infty: '∞',
  emptyset: '∅',
  varnothing: '∅',
  ell: 'ℓ',
  hbar: 'ℏ',
  Re: 'ℜ',
  Im: 'ℑ',
  aleph: 'ℵ',
  wp: '℘',
  degree: '°',
  circ: '∘',
  bullet: '∙',
  cdot: '·',
  cdots: '⋯',
  ldots: '…',
  dots: '…',
  vdots: '⋮',
  ddots: '⋱',
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  ast: '∗',
  star: '⋆',
  oplus: '⊕',
  ominus: '⊖',
  otimes: '⊗',
  oslash: '⊘',
  odot: '⊙',
  dagger: '†',
  ddagger: '‡',
  top: '⊤',
  bot: '⊥',
  perp: '⊥',
  parallel: '∥',
  mid: '|',
  nmid: '∤',
  angle: '∠',
  triangle: '△',
  backslash: '\\',
  forall: '∀',
  exists: '∃',
  nexists: '∄',
  neg: '¬',
  lnot: '¬',
  land: '∧',
  wedge: '∧',
  lor: '∨',
  vee: '∨',
  in: '∈',
  notin: '∉',
  ni: '∋',
  subset: '⊂',
  supset: '⊃',
  subseteq: '⊆',
  supseteq: '⊇',
  subsetneq: '⊊',
  supsetneq: '⊋',
  cup: '∪',
  cap: '∩',
  setminus: '∖',
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  ne: '≠',
  approx: '≈',
  sim: '∼',
  simeq: '≃',
  cong: '≅',
  equiv: '≡',
  propto: '∝',
  ll: '≪',
  gg: '≫',
  prec: '≺',
  succ: '≻',
  preceq: '≼',
  succeq: '≽',
  triangleq: '≜',
  defeq: '≔',
  coloneqq: '≔',
  rightarrow: '→',
  to: '→',
  leftarrow: '←',
  gets: '←',
  leftrightarrow: '↔',
  Rightarrow: '⇒',
  implies: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  iff: '⇔',
  mapsto: '↦',
  longmapsto: '⟼',
  longrightarrow: '⟶',
  longleftarrow: '⟵',
  Longrightarrow: '⟹',
  Longleftarrow: '⟸',
  Longleftrightarrow: '⟺',
  uparrow: '↑',
  downarrow: '↓',
  updownarrow: '↕',
  Uparrow: '⇑',
  Downarrow: '⇓',
  nearrow: '↗',
  searrow: '↘',
  swarrow: '↙',
  nwarrow: '↖',
  hookrightarrow: '↪',
  hookleftarrow: '↩',
  rightharpoonup: '⇀',
  langle: '⟨',
  rangle: '⟩',
  lfloor: '⌊',
  rfloor: '⌋',
  lceil: '⌈',
  rceil: '⌉',
  Vert: '‖',
  '|': '‖',
  '{': '{',
  '}': '}',
  '%': '%',
  '&': '&',
  '#': '#',
  '_': '_',
  '$': '$',
  prime: '′',
})

const NARY_OPERATORS = Object.freeze({
  sum: { chr: '∑', limLoc: 'undOvr' },
  prod: { chr: '∏', limLoc: 'undOvr' },
  coprod: { chr: '∐', limLoc: 'undOvr' },
  bigcup: { chr: '⋃', limLoc: 'undOvr' },
  bigcap: { chr: '⋂', limLoc: 'undOvr' },
  bigoplus: { chr: '⨁', limLoc: 'undOvr' },
  bigotimes: { chr: '⨂', limLoc: 'undOvr' },
  bigvee: { chr: '⋁', limLoc: 'undOvr' },
  bigwedge: { chr: '⋀', limLoc: 'undOvr' },
  bigsqcup: { chr: '⨆', limLoc: 'undOvr' },
  int: { chr: '∫', limLoc: 'subSup' },
  iint: { chr: '∬', limLoc: 'subSup' },
  iiint: { chr: '∭', limLoc: 'subSup' },
  oint: { chr: '∮', limLoc: 'subSup' },
})

const LIMIT_FUNCTIONS = Object.freeze({
  lim: 'lim',
  limsup: 'lim sup',
  liminf: 'lim inf',
  max: 'max',
  min: 'min',
  sup: 'sup',
  inf: 'inf',
  argmax: 'arg max',
  argmin: 'arg min',
})

const UPRIGHT_FUNCTIONS = Object.freeze({
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  cot: 'cot',
  sec: 'sec',
  csc: 'csc',
  arcsin: 'arcsin',
  arccos: 'arccos',
  arctan: 'arctan',
  sinh: 'sinh',
  cosh: 'cosh',
  tanh: 'tanh',
  coth: 'coth',
  log: 'log',
  ln: 'ln',
  lg: 'lg',
  exp: 'exp',
  det: 'det',
  dim: 'dim',
  ker: 'ker',
  deg: 'deg',
  gcd: 'gcd',
  Pr: 'Pr',
  hom: 'hom',
  arg: 'arg',
  Var: 'Var',
  Cov: 'Cov',
  tr: 'tr',
  diag: 'diag',
  rank: 'rank',
  sgn: 'sgn',
  softmax: 'softmax',
  sigmoid: 'sigmoid',
  ReLU: 'ReLU',
  GELU: 'GELU',
  mod: 'mod',
})

const ACCENT_COMMANDS = Object.freeze({
  hat: { omml: '\u0302', mathml: '^' },
  widehat: { omml: '\u0302', mathml: '^' },
  check: { omml: '\u030C', mathml: 'ˇ' },
  tilde: { omml: '\u0303', mathml: '~' },
  widetilde: { omml: '\u0303', mathml: '~' },
  acute: { omml: '\u0301', mathml: '´' },
  grave: { omml: '\u0300', mathml: '`' },
  dot: { omml: '\u0307', mathml: '˙' },
  ddot: { omml: '\u0308', mathml: '¨' },
  breve: { omml: '\u0306', mathml: '˘' },
  bar: { omml: '\u0304', mathml: '¯' },
  vec: { omml: '\u20D7', mathml: '→' },
  overrightarrow: { omml: '\u20D7', mathml: '→' },
})

const SPACING_MODIFIER_ACCENT = Object.freeze({
  hat: { glyph: 'ˆ', baseline: 12000 },
  widehat: { glyph: 'ˆ', baseline: 12000 },
  check: { glyph: 'ˇ', baseline: 12000 },
  tilde: { glyph: '˜', baseline: 12000 },
  widetilde: { glyph: '˜', baseline: 12000 },
  acute: { glyph: 'ˊ', baseline: 12000 },
  grave: { glyph: 'ˋ', baseline: 12000 },
  dot: { glyph: '˙', baseline: 14000 },
  ddot: { glyph: '¨', baseline: 14000 },
  breve: { glyph: '˘', baseline: 12000 },
  bar: { glyph: '¯', baseline: 14000 },
  vec: { glyph: '¯', baseline: 14000 },
})

const DELIM_COMMANDS = Object.freeze({
  '(': '(',
  ')': ')',
  '[': '[',
  ']': ']',
  '\\{': '{',
  '\\}': '}',
  '{': '{',
  '}': '}',
  '|': '|',
  '\\|': '‖',
  '\\Vert': '‖',
  '\\vert': '|',
  '\\langle': '⟨',
  '\\rangle': '⟩',
  '\\lfloor': '⌊',
  '\\rfloor': '⌋',
  '\\lceil': '⌈',
  '\\rceil': '⌉',
  '/': '/',
  '.': '',
})

// 严格限定在标准字体均具备字形的 BMP 类字母符号区 (U+2100..U+214F)，彻底杜绝 SMP (U+1D400..U+1D7FF) 在无头 LibreOffice 渲染为 □ 豆腐块
const SAFE_BMP_CAL = Object.freeze({
  B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ',
})

const SAFE_BMP_BB = Object.freeze({
  C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ',
})

const SPACE_COMMANDS = Object.freeze({
  ',': '\u2009',
  ':': '\u2005',
  ';': '\u2004',
  '!': '',
  ' ': ' ',
  quad: '\u2003',
  qquad: '\u2003\u2003',
  enspace: '\u2002',
})

const BINARY_OR_REL_OPS = new Set([
  '+', '-', '−', '=', '<', '>', '±', '∓', '×', '÷', '·', '∗', '⊕', '⊖', '⊗', '⊙',
  '≤', '≥', '≠', '≈', '∼', '≃', '≅', '≡', '∝', '≪', '≫', '≺', '≻', '≼', '≽', '≜', '≔',
  '∈', '∉', '∋', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∖', '∧', '∨', '∥', '∤',
  '→', '←', '↔', '⇒', '⇐', '⇔', '↦', '⟼', '⟶', '⟵', '⟹', '⟸', '⟺', '↪', '↩',
])

// ---------------------------------------------------------------------------
// 文本中的数学定界检测与货币误判防护（保护 "$120B ... $45B" 绝不误判为公式）
// ---------------------------------------------------------------------------

function isLikelyCurrencySpan(inner) {
  const trimmed = inner.trim()
  if (trimmed === '') return true
  // 若以纯数字开头且内部包含未在 \text{...} 中的中文或空格分隔普通词组（如 "10M 增长至 "），判定为两处货币符号
  const withoutTextCmd = trimmed.replace(/\\(?:text|textrm|textbf|mbox|operatorname)\s*\{[^}]*\}/g, '')
  if (/^\d[\d,.]*\s*(?:[kKmMbBtT]|万|亿|元|美元|万元|亿元)?(?:\s|$|[\u4E00-\u9FFF])/.test(withoutTextCmd)) {
    if (/[\u4E00-\u9FFF]/.test(withoutTextCmd) || /\s+[a-zA-Z]{2,}\s+/.test(withoutTextCmd)) {
      return true
    }
  }
  return false
}

/**
 * 将混合文本拆分为普通文本段与数学公式段。
 * 支持 $$...$$, \[...\], \(...\), 以及带货币防护的行内 $...$。
 */
export function splitMathSegments(input) {
  const str = String(input ?? '')
  if (str === '' || (!str.includes('$') && !str.includes('\\[') && !str.includes('\\('))) {
    return str === '' ? [] : [{ type: 'text', value: str }]
  }

  const segments = []
  let cursor = 0
  let textStart = 0
  const len = str.length

  const pushText = (endIdx) => {
    if (endIdx > textStart) {
      segments.push({ type: 'text', value: str.slice(textStart, endIdx).replace(/\\\$/g, '$') })
    }
  }

  while (cursor < len) {
    // 跳过转义 \$
    if (str[cursor] === '\\' && str[cursor + 1] === '$') {
      cursor += 2
      continue
    }

    // 1. $$...$$ 块级公式
    if (str[cursor] === '$' && str[cursor + 1] === '$') {
      const close = str.indexOf('$$', cursor + 2)
      if (close > cursor + 2) {
        const inner = str.slice(cursor + 2, close).trim()
        if (inner !== '') {
          pushText(cursor)
          segments.push({ type: 'math', latex: inner, display: true })
          cursor = close + 2
          textStart = cursor
          continue
        }
      }
      cursor += 2
      continue
    }

    // 2. \[...\] 块级公式
    if (str[cursor] === '\\' && str[cursor + 1] === '[') {
      const close = str.indexOf('\\]', cursor + 2)
      if (close > cursor + 2) {
        const inner = str.slice(cursor + 2, close).trim()
        if (inner !== '') {
          pushText(cursor)
          segments.push({ type: 'math', latex: inner, display: true })
          cursor = close + 2
          textStart = cursor
          continue
        }
      }
    }

    // 3. \(...\) 行内公式
    if (str[cursor] === '\\' && str[cursor + 1] === '(') {
      const close = str.indexOf('\\)', cursor + 2)
      if (close > cursor + 2) {
        const inner = str.slice(cursor + 2, close).trim()
        if (inner !== '') {
          pushText(cursor)
          segments.push({ type: 'math', latex: inner, display: false })
          cursor = close + 2
          textStart = cursor
          continue
        }
      }
    }

    // 4. $...$ 行内公式（严格遵循非空白紧贴与货币防护规则）
    if (str[cursor] === '$') {
      const nextCh = str[cursor + 1] ?? ''
      if (nextCh !== '' && nextCh !== '$' && !/\s/.test(nextCh)) {
        let close = cursor + 1
        let found = -1
        while (close < len) {
          if (str[close] === '\\') {
            close += 2
            continue
          }
          if (str[close] === '\n') break
          if (str[close] === '$') {
            const prevCh = str[close - 1] ?? ''
            const afterCh = str[close + 1] ?? ''
            if (!/\s/.test(prevCh) && !/\d/.test(afterCh) && afterCh !== '$') {
              found = close
              break
            }
          }
          close += 1
        }
        if (found > cursor + 1) {
          const inner = str.slice(cursor + 1, found)
          if (!isLikelyCurrencySpan(inner)) {
            pushText(cursor)
            segments.push({ type: 'math', latex: inner.trim(), display: false })
            cursor = found + 1
            textStart = cursor
            continue
          }
        }
      }
    }

    cursor += 1
  }

  pushText(len)
  return segments
}

export function containsLatexMath(input) {
  return splitMathSegments(input).some((seg) => seg.type === 'math')
}

export function looksLikeRawLatex(input) {
  const s = String(input ?? '').trim()
  if (!s) return false
  if (containsLatexMath(s)) return true
  return /\\(?:frac|dfrac|tfrac|binom|sqrt|sum|prod|int|oint|bigcup|bigcap|left|right|begin|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega|nabla|partial|infty|leq|geq|neq|approx|equiv|pm|times|cdot|in|notin|subset|subseteq|forall|exists|rightarrow|Rightarrow|leftrightarrow|mapsto|ldots|cdots|hat|bar|vec|tilde|dot|ddot|overline|underline|sin|cos|tan|log|ln|exp|max|min|lim|arg|text|mathbf|mathrm|mathcal|mathbb|boldsymbol)\b/.test(s)
    || /[A-Za-z0-9)\]}]\s*[_^]\s*(?:\{[^}]+\}|[A-Za-z0-9\\])/.test(s)
}

export function unwrapOuterMathDelimiters(input) {
  const s = String(input ?? '').trim()
  if (s.startsWith('$$') && s.endsWith('$$') && s.length > 4) return s.slice(2, -2).trim()
  if (s.startsWith('\\[') && s.endsWith('\\]') && s.length > 4) return s.slice(2, -2).trim()
  if (s.startsWith('\\(') && s.endsWith('\\)') && s.length > 4) return s.slice(2, -2).trim()
  if (s.startsWith('$') && s.endsWith('$') && s.length > 2 && !s.slice(1, -1).includes('$')) {
    return s.slice(1, -1).trim()
  }
  return s
}

/**
 * 在 Markdown / HTML 清洗前遮罩公式片段，避免 `$0 < \alpha_i < 1$` 中的 `<...>` 或 `_` 被误删。
 */
export function maskMathSpans(input) {
  const raw = String(input ?? '')
  if (!raw.includes('$') && !raw.includes('\\[') && !raw.includes('\\(') && !raw.includes('`')) {
    return { masked: raw, stash: [] }
  }
  const stash = []
  // 先遮罩反引号行内代码 `...`（如 `<m:oMath>`），防止其中的尖括号在清洗时被误剥离；输出时仍经 escapeHtml/escapeXml 严格转义
  const codeMasked = raw.replace(/`[^`\n]+`/g, (m) => {
    const idx = stash.length
    stash.push(m)
    return '\uE010MATH' + idx + '\uE011'
  })
  const segs = splitMathSegments(codeMasked)
  if (!segs.some((s) => s.type === 'math')) {
    return { masked: codeMasked, stash }
  }
  const masked = segs.map((seg) => {
    if (seg.type !== 'math') return seg.value
    const idx = stash.length
    stash.push(seg.display ? ('$$' + seg.latex + '$$') : ('$' + seg.latex + '$'))
    return '\uE010MATH' + idx + '\uE011'
  }).join('')
  return { masked, stash }
}

export function unmaskMathSpans(masked, stash) {
  if (!stash || stash.length === 0) return masked
  return String(masked).replace(/\uE010MATH(\d+)\uE011/g, (_, idx) => stash[Number(idx)] ?? '')
}

// ---------------------------------------------------------------------------
// LaTeX 词法分词器（Tokenizer）
// ---------------------------------------------------------------------------

function tokenizeLatex(latex) {
  // 仅剥离未转义的 % 行尾注释，保留转义百分号 \%（兼容 \\% 行分隔符后紧跟注释）
  const src = String(latex ?? '').replace(/((?:^|[^\\])(?:\\\\)*)%[^\n]*/g, '$1')
  const tokens = []
  let i = 0
  const n = src.length

  while (i < n) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === '\\') {
      if (i + 1 >= n) break
      const next = src[i + 1]
      if (next === '\\') {
        tokens.push({ type: 'rowSep', value: '\\\\' })
        i += 2
        // 跳过可选行距参数 \\[4pt]
        if (src[i] === '[') {
          const endBr = src.indexOf(']', i + 1)
          if (endBr > i) i = endBr + 1
        }
        continue
      }
      if (/[a-zA-Z]/.test(next)) {
        let j = i + 1
        while (j < n && /[a-zA-Z]/.test(src[j])) j += 1
        const cmd = src.slice(i + 1, j)
        // 对 \text / \textrm / \textbf / \mathrm / \mathbf / \mathcal / \mathbb / \operatorname 直接捕获原始花括号文本
        if (['text', 'textrm', 'textup', 'textbf', 'mbox', 'operatorname'].includes(cmd)) {
          while (j < n && /\s/.test(src[j])) j += 1
          if (src[j] === '{') {
            let depth = 1
            let k = j + 1
            while (k < n && depth > 0) {
              if (src[k] === '\\' && k + 1 < n) { k += 2; continue }
              if (src[k] === '{') depth += 1
              else if (src[k] === '}') depth -= 1
              k += 1
            }
            const content = src.slice(j + 1, Math.max(j + 1, k - 1))
              .replace(/\\([#$%&_{}])/g, '$1')
              .replace(/~/g, ' ')
            tokens.push({ type: 'textGroup', cmd, value: content })
            i = k
            continue
          }
        }
        tokens.push({ type: 'cmd', value: cmd })
        i = j
        continue
      }
      // 单字符转义命令（\, \; \! \{ \} \| \% \_ 等）
      tokens.push({ type: 'cmd', value: next })
      i += 2
      continue
    }
    if (ch === '{') { tokens.push({ type: 'lbrace', value: '{' }); i += 1; continue }
    if (ch === '}') { tokens.push({ type: 'rbrace', value: '}' }); i += 1; continue }
    if (ch === '[') { tokens.push({ type: 'lbrack', value: '[' }); i += 1; continue }
    if (ch === ']') { tokens.push({ type: 'rbrack', value: ']' }); i += 1; continue }
    if (ch === '^') { tokens.push({ type: 'sup', value: '^' }); i += 1; continue }
    if (ch === '_') { tokens.push({ type: 'sub', value: '_' }); i += 1; continue }
    if (ch === '&') { tokens.push({ type: 'colSep', value: '&' }); i += 1; continue }
    if (ch === '~') { tokens.push({ type: 'space', value: '\u00A0' }); i += 1; continue }
    if (ch === '\'') {
      let j = i
      while (j < n && src[j] === '\'') j += 1
      tokens.push({ type: 'prime', count: j - i })
      i = j
      continue
    }
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < n && (/[0-9]/.test(src[j]) || (src[j] === '.' && /[0-9]/.test(src[j + 1] ?? '')))) j += 1
      tokens.push({ type: 'num', value: src.slice(i, j) })
      i = j
      continue
    }
    if (/[a-zA-Z]/.test(ch)) {
      tokens.push({ type: 'ident', value: ch })
      i += 1
      continue
    }
    tokens.push({ type: 'char', value: ch === '-' ? '−' : ch })
    i += 1
  }

  return tokens
}

// ---------------------------------------------------------------------------
// 递归下降 AST 语法分析器（Parser）
// ---------------------------------------------------------------------------

export function parseLatexMath(latex) {
  const clean = unwrapOuterMathDelimiters(latex)
  const tokens = tokenizeLatex(clean)
  let pos = 0

  const peek = (offset = 0) => tokens[pos + offset] ?? null
  const next = () => tokens[pos++] ?? null

  function makeRow(children) {
    if (!children || children.length === 0) return { type: 'row', children: [] }
    if (children.length === 1) return children[0]
    return { type: 'row', children }
  }

  function readEnvName() {
    if (peek()?.type === 'lbrace') {
      next()
      let name = ''
      while (peek() && peek().type !== 'rbrace') {
        name += next().value ?? ''
      }
      if (peek()?.type === 'rbrace') next()
      return name.trim()
    }
    return ''
  }

  function readDelimiterChar() {
    const tok = peek()
    if (!tok) return ''
    if (tok.type === 'cmd') {
      next()
      return DELIM_COMMANDS['\\' + tok.value] ?? DELIM_COMMANDS[tok.value] ?? SYMBOL_MAP[tok.value] ?? tok.value
    }
    if (tok.type === 'char' || tok.type === 'lbrack' || tok.type === 'rbrack') {
      next()
      const v = tok.value === '−' ? '-' : tok.value
      return DELIM_COMMANDS[v] ?? v
    }
    return ''
  }

  function parseArg() {
    const tok = peek()
    if (!tok) return { type: 'row', children: [] }
    if (tok.type === 'lbrace') {
      next()
      const expr = parseExpression((t) => t.type === 'rbrace')
      if (peek()?.type === 'rbrace') next()
      return expr
    }
    return parseBaseAtom() ?? { type: 'row', children: [] }
  }

  function parseOptionalBracketArg() {
    if (peek()?.type !== 'lbrack') return null
    next()
    const expr = parseExpression((t) => t.type === 'rbrack')
    if (peek()?.type === 'rbrack') next()
    return expr
  }

  function parseMatrix(envName) {
    const rows = []
    let currentRow = []
    let currentCell = []

    const flushCell = () => {
      currentRow.push(makeRow(currentCell))
      currentCell = []
    }
    const flushRow = () => {
      flushCell()
      if (currentRow.length > 0) rows.push(currentRow)
      currentRow = []
    }

    while (pos < tokens.length) {
      const tok = peek()
      if (tok.type === 'cmd' && tok.value === 'end') {
        next()
        readEnvName()
        break
      }
      if (tok.type === 'colSep') {
        next()
        flushCell()
        continue
      }
      if (tok.type === 'rowSep') {
        next()
        flushRow()
        continue
      }
      const item = parseScriptedItem((t) =>
        t.type === 'colSep' || t.type === 'rowSep' || (t.type === 'cmd' && t.value === 'end'),
      )
      if (item) currentCell.push(item)
      else next()
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      flushRow()
    }
    if (rows.length === 0) rows.push([{ type: 'row', children: [] }])

    const matrixNode = { type: 'matrix', env: envName, rows }
    if (envName === 'pmatrix') return { type: 'delim', open: '(', close: ')', body: matrixNode }
    if (envName === 'bmatrix') return { type: 'delim', open: '[', close: ']', body: matrixNode }
    if (envName === 'Bmatrix') return { type: 'delim', open: '{', close: '}', body: matrixNode }
    if (envName === 'vmatrix') return { type: 'delim', open: '|', close: '|', body: matrixNode }
    if (envName === 'Vmatrix') return { type: 'delim', open: '‖', close: '‖', body: matrixNode }
    if (envName === 'cases') return { type: 'delim', open: '{', close: '', body: matrixNode }
    return matrixNode
  }

  function applyStyleTransform(ast, styleKind) {
    if (!ast) return ast
    if (ast.type === 'ident' || ast.type === 'num') {
      if (styleKind === 'cal' || styleKind === 'bb') {
        const bmpMap = styleKind === 'cal' ? SAFE_BMP_CAL : SAFE_BMP_BB
        const isBb = styleKind === 'bb'
        const chars = [...ast.value]
        if (chars.length > 1) {
          return makeRow(chars.map((ch) => (
            ch in bmpMap
              ? { type: 'sym', value: bmpMap[ch], variant: styleKind, bmp: true, upright: isBb }
              : { type: 'sym', value: ch, variant: styleKind, bmp: false, upright: isBb }
          )))
        }
        const ch = chars[0] ?? ast.value
        return ch in bmpMap
          ? { type: 'sym', value: bmpMap[ch], variant: styleKind, bmp: true, upright: isBb }
          : { type: 'sym', value: ch, variant: styleKind, bmp: false, upright: isBb }
      }
      return { ...ast, style: styleKind }
    }
    if (ast.type === 'sym') {
      return { ...ast, style: styleKind }
    }
    if (ast.type === 'row') {
      return { ...ast, children: ast.children.map((ch) => applyStyleTransform(ch, styleKind)) }
    }
    return { type: 'style', style: styleKind, body: ast }
  }

  function parseBaseAtom() {
    const tok = peek()
    if (!tok) return null

    if (tok.type === 'lbrace') {
      next()
      const inner = parseExpression((t) => t.type === 'rbrace')
      if (peek()?.type === 'rbrace') next()
      return inner
    }

    if (tok.type === 'textGroup') {
      next()
      return { type: 'text', value: tok.value, bold: tok.cmd === 'textbf' }
    }

    if (tok.type === 'num') {
      next()
      return { type: 'num', value: tok.value }
    }

    if (tok.type === 'ident') {
      next()
      return { type: 'ident', value: tok.value }
    }

    if (tok.type === 'space') {
      next()
      return { type: 'space', value: tok.value }
    }

    if (tok.type === 'lbrack' || tok.type === 'rbrack') {
      next()
      return { type: 'op', value: tok.value }
    }

    if (tok.type === 'char') {
      next()
      return { type: 'op', value: tok.value }
    }

    if (tok.type === 'cmd') {
      const cmd = tok.value
      next()

      if (cmd === 'displaystyle' || cmd === 'textstyle' || cmd === 'scriptstyle' || cmd === 'limits' || cmd === 'nolimits' || cmd === 'big' || cmd === 'Big' || cmd === 'bigg' || cmd === 'Bigg' || cmd === 'bigl' || cmd === 'bigr' || cmd === 'Bigl' || cmd === 'Bigr') {
        return parseBaseAtom()
      }

      if (cmd in SPACE_COMMANDS) {
        return SPACE_COMMANDS[cmd] ? { type: 'space', value: SPACE_COMMANDS[cmd] } : { type: 'row', children: [] }
      }

      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac' || cmd === 'cfrac') {
        const num = parseArg()
        const den = parseArg()
        return { type: 'frac', bar: true, num, den }
      }

      if (cmd === 'binom' || cmd === 'tbinom' || cmd === 'dbinom') {
        const num = parseArg()
        const den = parseArg()
        return { type: 'delim', open: '(', close: ')', body: { type: 'frac', bar: false, num, den } }
      }

      if (cmd === 'sqrt') {
        const deg = parseOptionalBracketArg()
        const body = parseArg()
        return deg ? { type: 'root', deg, body } : { type: 'sqrt', body }
      }

      if (cmd === 'left') {
        const open = readDelimiterChar()
        const body = parseExpression((t) => t.type === 'cmd' && t.value === 'right')
        let close = ''
        if (peek()?.type === 'cmd' && peek().value === 'right') {
          next()
          close = readDelimiterChar()
        }
        return { type: 'delim', open, close, body }
      }

      if (cmd === 'begin') {
        const envName = readEnvName()
        return parseMatrix(envName)
      }

      if (cmd in ACCENT_COMMANDS) {
        const body = parseArg()
        return { type: 'acc', cmd, chr: ACCENT_COMMANDS[cmd].omml, mathmlChr: ACCENT_COMMANDS[cmd].mathml, body }
      }

      if (cmd === 'overline') {
        return { type: 'bar', pos: 'top', body: parseArg() }
      }

      if (cmd === 'underline') {
        return { type: 'bar', pos: 'bot', body: parseArg() }
      }

      if (cmd === 'overbrace') {
        const body = parseArg()
        if (peek()?.type === 'sup') {
          next()
          const label = parseArg()
          return { type: 'limUpp', base: { type: 'bar', pos: 'top', body }, lim: label }
        }
        return { type: 'bar', pos: 'top', body }
      }

      if (cmd === 'underbrace') {
        const body = parseArg()
        if (peek()?.type === 'sub') {
          next()
          const label = parseArg()
          return { type: 'limLow', base: { type: 'bar', pos: 'bot', body }, lim: label }
        }
        return { type: 'bar', pos: 'bot', body }
      }

      if (cmd === 'overset' || cmd === 'stackrel') {
        const topExpr = parseArg()
        const baseExpr = parseArg()
        return { type: 'limUpp', base: baseExpr, lim: topExpr }
      }

      if (cmd === 'underset') {
        const botExpr = parseArg()
        const baseExpr = parseArg()
        return { type: 'limLow', base: baseExpr, lim: botExpr }
      }

      if (cmd === 'mathbf' || cmd === 'bm' || cmd === 'boldsymbol') {
        return applyStyleTransform(parseArg(), 'bold')
      }

      if (cmd === 'mathrm') {
        return applyStyleTransform(parseArg(), 'roman')
      }

      if (cmd === 'mathcal') {
        return applyStyleTransform(parseArg(), 'cal')
      }

      if (cmd === 'mathbb') {
        return applyStyleTransform(parseArg(), 'bb')
      }

      if (cmd === 'mathit') {
        return applyStyleTransform(parseArg(), 'italic')
      }

      if (cmd in NARY_OPERATORS) {
        const spec = NARY_OPERATORS[cmd]
        let sub = null
        let sup = null
        let limLoc = spec.limLoc
        // 读取任意顺序的 _sub / ^sup / \limits
        while (peek()) {
          if (peek().type === 'cmd' && peek().value === 'limits') {
            next()
            limLoc = 'undOvr'
            continue
          }
          if (peek().type === 'cmd' && peek().value === 'nolimits') {
            next()
            limLoc = 'subSup'
            continue
          }
          if (peek().type === 'sub' && sub === null) {
            next()
            sub = parseArg()
            continue
          }
          if (peek().type === 'sup' && sup === null) {
            next()
            sup = parseArg()
            continue
          }
          break
        }
        // 大型算子收集紧随其后的被积/被求和项（遇到顶层加减或等号关系符停止）
        const bodyParts = []
        while (pos < tokens.length) {
          const t = peek()
          if (!t || t.type === 'rbrace' || t.type === 'rbrack' || t.type === 'colSep' || t.type === 'rowSep') break
          if (t.type === 'cmd' && (t.value === 'right' || t.value === 'end')) break
          if (bodyParts.length > 0 && t.type === 'char' && ['+', '−', '-', '=', '<', '>'].includes(t.value)) break
          if (bodyParts.length > 0 && t.type === 'cmd' && ['leq', 'le', 'geq', 'ge', 'neq', 'ne', 'approx', 'equiv', 'rightarrow', 'to', 'Rightarrow', 'iff'].includes(t.value)) break
          const nextPart = parseScriptedItem()
          if (!nextPart) break
          bodyParts.push(nextPart)
        }
        return {
          type: 'nary',
          cmd,
          chr: spec.chr,
          limLoc,
          sub,
          sup,
          body: makeRow(bodyParts),
        }
      }

      // \arg\max / \arg\min 组合识别为极限型算子
      if (cmd === 'arg' && peek()?.type === 'cmd' && (peek().value === 'max' || peek().value === 'min')) {
        const subCmd = next().value
        return { type: 'func', name: 'arg ' + subCmd, limitOp: true }
      }

      if (cmd in LIMIT_FUNCTIONS) {
        return { type: 'func', name: LIMIT_FUNCTIONS[cmd], limitOp: true }
      }

      if (cmd in UPRIGHT_FUNCTIONS) {
        return { type: 'func', name: UPRIGHT_FUNCTIONS[cmd], limitOp: false }
      }

      if (cmd in GREEK_MAP) {
        const isUpper = cmd[0] === cmd[0].toUpperCase()
        return { type: 'sym', value: GREEK_MAP[cmd], greek: true, upright: isUpper }
      }

      if (cmd in SYMBOL_MAP) {
        const sym = SYMBOL_MAP[cmd]
        return BINARY_OR_REL_OPS.has(sym)
          ? { type: 'op', value: sym }
          : { type: 'sym', value: sym, upright: sym === '|' || sym === '‖' }
      }

      // 未知命令兜底：绝不泄露裸反斜杠，转为正体函数名
      return { type: 'func', name: cmd, limitOp: false }
    }

    next()
    return null
  }

  function parseScriptedItem(stopPredicate) {
    if (pos >= tokens.length) return null
    if (stopPredicate && stopPredicate(peek())) return null

    let base = parseBaseAtom()
    if (!base) return null

    // 支持紧随其后的撇号 f' / f''
    let primeText = ''
    while (peek()?.type === 'prime') {
      const p = next()
      primeText += p.count === 1 ? '′' : p.count === 2 ? '″' : '′'.repeat(p.count)
    }

    let sub = null
    let sup = primeText ? { type: 'sym', value: primeText } : null

    while (peek()) {
      if (peek().type === 'sub' && sub === null) {
        next()
        sub = parseArg()
        continue
      }
      if (peek().type === 'sup') {
        next()
        const supArg = parseArg()
        sup = sup ? makeRow([sup, supArg]) : supArg
        continue
      }
      break
    }

    if (base.type === 'func' && base.limitOp && sub && !sup) {
      return { type: 'limLow', base, lim: sub }
    }
    if (sub && sup) return { type: 'subsup', base, sub, sup }
    if (sub) return { type: 'sub', base, sub }
    if (sup) return { type: 'sup', base, sup }
    return base
  }

  function parseExpression(stopPredicate) {
    const items = []
    while (pos < tokens.length) {
      const tok = peek()
      if (!tok) break
      if (stopPredicate && stopPredicate(tok)) break
      if (tok.type === 'rbrace') break
      const item = parseScriptedItem(stopPredicate)
      if (item) {
        if (!(item.type === 'row' && item.children.length === 0)) {
          items.push(item)
        }
      } else {
        break
      }
    }
    return makeRow(items)
  }

  return parseExpression()
}

// ---------------------------------------------------------------------------
// W3C MathML 编译器（100% 浏览器原生渲染、零脚本注入）
// ---------------------------------------------------------------------------

export function astToMathMl(ast, options = {}) {
  function emit(node) {
    if (!node) return '<mrow></mrow>'
    switch (node.type) {
      case 'row':
        if (node.children.length === 0) return '<mrow></mrow>'
        return '<mrow>' + node.children.map(emit).join('') + '</mrow>'
      case 'num':
        return '<mn' + (node.style === 'bold' ? ' mathvariant="bold"' : '') + '>' + escapeHtmlText(node.value) + '</mn>'
      case 'ident': {
        const attr = node.style === 'bold'
          ? ' mathvariant="bold"'
          : node.style === 'roman'
            ? ' mathvariant="normal"'
            : ''
        return '<mi' + attr + '>' + escapeHtmlText(node.value) + '</mi>'
      }
      case 'sym': {
        let attr = ''
        if (node.variant === 'bb' && !node.bmp) attr = ' mathvariant="double-struck"'
        else if (node.variant === 'cal' && !node.bmp) attr = ' mathvariant="script"'
        else if (node.style === 'bold') attr = ' mathvariant="bold"'
        else if (node.upright || node.style === 'roman') attr = ' mathvariant="normal"'
        return '<mi' + attr + '>' + escapeHtmlText(node.value) + '</mi>'
      }
      case 'op':
        return '<mo>' + escapeHtmlText(node.value) + '</mo>'
      case 'text':
        return '<mtext' + (node.bold ? ' style="font-weight:700"' : '') + '>' + escapeHtmlText(node.value) + '</mtext>'
      case 'space':
        return '<mtext>' + escapeHtmlText(node.value) + '</mtext>'
      case 'func':
        return '<mi mathvariant="normal">' + escapeHtmlText(node.name) + '</mi>'
      case 'style': {
        const mv = node.style === 'bold' ? 'bold' : node.style === 'roman' ? 'normal' : 'italic'
        return '<mstyle mathvariant="' + mv + '">' + emit(node.body) + '</mstyle>'
      }
      case 'frac':
        return '<mfrac' + (node.bar === false ? ' linethickness="0"' : '') + '>' +
          '<mrow>' + emit(node.num) + '</mrow>' +
          '<mrow>' + emit(node.den) + '</mrow>' +
          '</mfrac>'
      case 'sqrt':
        return '<msqrt>' + emit(node.body) + '</msqrt>'
      case 'root':
        return '<mroot><mrow>' + emit(node.body) + '</mrow><mrow>' + emit(node.deg) + '</mrow></mroot>'
      case 'sub':
        return '<msub><mrow>' + emit(node.base) + '</mrow><mrow>' + emit(node.sub) + '</mrow></msub>'
      case 'sup':
        return '<msup><mrow>' + emit(node.base) + '</mrow><mrow>' + emit(node.sup) + '</mrow></msup>'
      case 'subsup':
        return '<msubsup><mrow>' + emit(node.base) + '</mrow><mrow>' + emit(node.sub) + '</mrow><mrow>' + emit(node.sup) + '</mrow></msubsup>'
      case 'limLow':
        return '<munder><mrow>' + emit(node.base) + '</mrow><mrow>' + emit(node.lim) + '</mrow></munder>'
      case 'limUpp':
        return '<mover><mrow>' + emit(node.base) + '</mrow><mrow>' + emit(node.lim) + '</mrow></mover>'
      case 'nary': {
        const opXml = '<mo largeop="true" movablelimits="false">' + escapeHtmlText(node.chr) + '</mo>'
        const limitsUnderOver = node.limLoc === 'undOvr'
        let header = opXml
        if (node.sub && node.sup) {
          header = limitsUnderOver
            ? '<munderover>' + opXml + '<mrow>' + emit(node.sub) + '</mrow><mrow>' + emit(node.sup) + '</mrow></munderover>'
            : '<msubsup>' + opXml + '<mrow>' + emit(node.sub) + '</mrow><mrow>' + emit(node.sup) + '</mrow></msubsup>'
        } else if (node.sub) {
          header = limitsUnderOver
            ? '<munder>' + opXml + '<mrow>' + emit(node.sub) + '</mrow></munder>'
            : '<msub>' + opXml + '<mrow>' + emit(node.sub) + '</mrow></msub>'
        } else if (node.sup) {
          header = limitsUnderOver
            ? '<mover>' + opXml + '<mrow>' + emit(node.sup) + '</mrow></mover>'
            : '<msup>' + opXml + '<mrow>' + emit(node.sup) + '</mrow></msup>'
        }
        return '<mrow>' + header + emit(node.body) + '</mrow>'
      }
      case 'delim':
        return '<mrow>' +
          (node.open ? '<mo stretchy="true">' + escapeHtmlText(node.open) + '</mo>' : '') +
          emit(node.body) +
          (node.close ? '<mo stretchy="true">' + escapeHtmlText(node.close) + '</mo>' : '') +
          '</mrow>'
      case 'matrix':
        return '<mtable class="math-matrix">' +
          node.rows.map((row) => '<mtr>' + row.map((cell) => '<mtd>' + emit(cell) + '</mtd>').join('') + '</mtr>').join('') +
          '</mtable>'
      case 'acc':
        return '<mover accent="true"><mrow>' + emit(node.body) + '</mrow><mo>' + escapeHtmlText(node.mathmlChr) + '</mo></mover>'
      case 'bar':
        return node.pos === 'bot'
          ? '<munder><mrow>' + emit(node.body) + '</mrow><mo stretchy="true">_</mo></munder>'
          : '<mover><mrow>' + emit(node.body) + '</mrow><mo stretchy="true">¯</mo></mover>'
      default:
        return '<mrow></mrow>'
    }
  }

  const displayAttr = options.display ? ' display="block"' : ' display="inline"'
  const classAttr = options.className ? ' class="' + escapeHtmlText(options.className) + '"' : ''
  return '<math xmlns="' + MATHML_NS + '"' + displayAttr + classAttr + '>' + emit(ast) + '</math>'
}

export function latexToMathMl(latex, options = {}) {
  return astToMathMl(parseLatexMath(latex), options)
}

// ---------------------------------------------------------------------------
// ECMA-376 Office Math (<m:oMath>) 编译器
// ---------------------------------------------------------------------------

function ommlRun(text, opts = {}) {
  const val = String(text ?? '')
  if (val === '') return ''
  const rPrParts = []
  if (opts.nor) rPrParts.push('<m:nor/>')
  if (opts.scr) rPrParts.push('<m:scr m:val="' + opts.scr + '"/>')
  if (!opts.nor && opts.sty) rPrParts.push('<m:sty m:val="' + opts.sty + '"/>')

  const mRPr = rPrParts.length > 0 ? '<m:rPr>' + rPrParts.join('') + '</m:rPr>' : ''
  let aRPr = ''
  if (opts.sizePt || opts.color) {
    const szAttr = opts.sizePt ? ' sz="' + Math.round(opts.sizePt * 100) + '"' : ''
    const bAttr = opts.sty === 'b' || opts.bold ? ' b="1"' : ''
    const fill = opts.color
      ? '<a:solidFill><a:srgbClr val="' + String(opts.color).replace(/^#/, '').slice(0, 6).toUpperCase() + '"/></a:solidFill>'
      : ''
    aRPr = '<a:rPr' + szAttr + bAttr + '>' + fill + '</a:rPr>'
  }
  const preserve = /^\s|\s$/.test(val) ? ' xml:space="preserve"' : ''
  return '<m:r>' + mRPr + aRPr + '<m:t' + preserve + '>' + escapeXmlText(val) + '</m:t></m:r>'
}

function ensureNonEmptyOmml(innerXml, runDefaults) {
  return innerXml && innerXml.trim() !== '' ? innerXml : ommlRun('\u200B', { ...runDefaults, nor: true })
}

export function astToOmml(ast, options = {}) {
  const runDefaults = {
    sizePt: options.sizePt,
    color: options.color,
  }

  function emit(node, inheritedStyle = '') {
    if (!node) return ''
    switch (node.type) {
      case 'row':
        return node.children.map((ch) => emit(ch, inheritedStyle)).join('')
      case 'num':
        return ommlRun(node.value, {
          ...runDefaults,
          sty: (node.style === 'bold' || inheritedStyle === 'bold') ? 'b' : undefined,
        })
      case 'ident': {
        const eff = node.style || inheritedStyle
        const sty = eff === 'bold' ? 'b' : eff === 'roman' ? 'p' : undefined
        return ommlRun(node.value, { ...runDefaults, sty })
      }
      case 'sym': {
        if (node.variant === 'bb' && !node.bmp) {
          return ommlRun(node.value, { ...runDefaults, scr: 'double-struck', sty: 'b' })
        }
        if (node.variant === 'cal' && !node.bmp) {
          return ommlRun(node.value, { ...runDefaults, scr: 'script' })
        }
        const eff = node.style || inheritedStyle
        const sty = eff === 'bold' ? 'b' : (node.upright || eff === 'roman') ? 'p' : undefined
        return ommlRun(node.value, { ...runDefaults, sty })
      }
      case 'op': {
        const padded = BINARY_OR_REL_OPS.has(node.value) && node.value !== '′' && node.value !== '″'
          ? ' ' + node.value + ' '
          : node.value
        return ommlRun(padded, { ...runDefaults, sty: 'p' })
      }
      case 'text':
        return ommlRun(node.value, { ...runDefaults, nor: true, bold: node.bold })
      case 'space':
        return ommlRun(node.value, { ...runDefaults, nor: true })
      case 'func': {
        const needTrailSpace = !node.limitOp && /^[a-zA-Z]/.test(node.name)
        return ommlRun(node.name + (needTrailSpace ? ' ' : ''), { ...runDefaults, nor: true })
      }
      case 'style':
        return emit(node.body, node.style)
      case 'frac': {
        const fPr = node.bar === false ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : ''
        const numXml = ensureNonEmptyOmml(emit(node.num, inheritedStyle), runDefaults)
        const denXml = ensureNonEmptyOmml(emit(node.den, inheritedStyle), runDefaults)
        return '<m:f>' + fPr + '<m:num>' + numXml + '</m:num><m:den>' + denXml + '</m:den></m:f>'
      }
      case 'sqrt': {
        const eXml = ensureNonEmptyOmml(emit(node.body, inheritedStyle), runDefaults)
        return '<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>' + eXml + '</m:e></m:rad>'
      }
      case 'root': {
        const degXml = ensureNonEmptyOmml(emit(node.deg, inheritedStyle), runDefaults)
        const eXml = ensureNonEmptyOmml(emit(node.body, inheritedStyle), runDefaults)
        return '<m:rad><m:radPr><m:degHide m:val="0"/></m:radPr><m:deg>' + degXml + '</m:deg><m:e>' + eXml + '</m:e></m:rad>'
      }
      case 'sub':
        return '<m:sSub>' +
          '<m:e>' + ensureNonEmptyOmml(emit(node.base, inheritedStyle), runDefaults) + '</m:e>' +
          '<m:sub>' + ensureNonEmptyOmml(emit(node.sub, inheritedStyle), runDefaults) + '</m:sub>' +
          '</m:sSub>'
      case 'sup':
        return '<m:sSup>' +
          '<m:e>' + ensureNonEmptyOmml(emit(node.base, inheritedStyle), runDefaults) + '</m:e>' +
          '<m:sup>' + ensureNonEmptyOmml(emit(node.sup, inheritedStyle), runDefaults) + '</m:sup>' +
          '</m:sSup>'
      case 'subsup':
        return '<m:sSubSup>' +
          '<m:e>' + ensureNonEmptyOmml(emit(node.base, inheritedStyle), runDefaults) + '</m:e>' +
          '<m:sub>' + ensureNonEmptyOmml(emit(node.sub, inheritedStyle), runDefaults) + '</m:sub>' +
          '<m:sup>' + ensureNonEmptyOmml(emit(node.sup, inheritedStyle), runDefaults) + '</m:sup>' +
          '</m:sSubSup>'
      case 'limLow':
        return '<m:limLow>' +
          '<m:e>' + ensureNonEmptyOmml(emit(node.base, inheritedStyle), runDefaults) + '</m:e>' +
          '<m:lim>' + ensureNonEmptyOmml(emit(node.lim, inheritedStyle), runDefaults) + '</m:lim>' +
          '</m:limLow>'
      case 'limUpp':
        return '<m:limUpp>' +
          '<m:e>' + ensureNonEmptyOmml(emit(node.base, inheritedStyle), runDefaults) + '</m:e>' +
          '<m:lim>' + ensureNonEmptyOmml(emit(node.lim, inheritedStyle), runDefaults) + '</m:lim>' +
          '</m:limUpp>'
      case 'nary': {
        const hasSub = Boolean(node.sub && !(node.sub.type === 'row' && node.sub.children.length === 0))
        const hasSup = Boolean(node.sup && !(node.sup.type === 'row' && node.sup.children.length === 0))
        const naryPr =
          '<m:naryPr>' +
          '<m:chr m:val="' + escapeXmlText(node.chr) + '"/>' +
          '<m:limLoc m:val="' + (node.limLoc === 'subSup' ? 'subSup' : 'undOvr') + '"/>' +
          (!hasSub ? '<m:subHide m:val="1"/>' : '') +
          (!hasSup ? '<m:supHide m:val="1"/>' : '') +
          '</m:naryPr>'
        const subXml = hasSub ? '<m:sub>' + ensureNonEmptyOmml(emit(node.sub, inheritedStyle), runDefaults) + '</m:sub>' : '<m:sub/>'
        const supXml = hasSup ? '<m:sup>' + ensureNonEmptyOmml(emit(node.sup, inheritedStyle), runDefaults) + '</m:sup>' : '<m:sup/>'
        const eXml = '<m:e>' + ensureNonEmptyOmml(emit(node.body, inheritedStyle), runDefaults) + '</m:e>'
        return '<m:nary>' + naryPr + subXml + supXml + eXml + '</m:nary>'
      }
      case 'delim':
        return '<m:d>' +
          '<m:dPr>' +
          '<m:begChr m:val="' + escapeXmlText(node.open ?? '') + '"/>' +
          '<m:endChr m:val="' + escapeXmlText(node.close ?? '') + '"/>' +
          '</m:dPr>' +
          '<m:e>' + ensureNonEmptyOmml(emit(node.body, inheritedStyle), runDefaults) + '</m:e>' +
          '</m:d>'
      case 'matrix': {
        const colCount = Math.max(1, ...node.rows.map((r) => r.length))
        const mrXml = node.rows.map((r) => {
          const cells = Array.from({ length: colCount }, (_, c) =>
            '<m:e>' + ensureNonEmptyOmml(emit(r[c], inheritedStyle), runDefaults) + '</m:e>',
          ).join('')
          return '<m:mr>' + cells + '</m:mr>'
        }).join('')
        return '<m:m>' + mrXml + '</m:m>'
      }
      case 'acc':
        return '<m:acc>' +
          '<m:accPr><m:chr m:val="' + escapeXmlText(node.chr) + '"/></m:accPr>' +
          '<m:e>' + ensureNonEmptyOmml(emit(node.body, inheritedStyle), runDefaults) + '</m:e>' +
          '</m:acc>'
      case 'bar':
        return '<m:bar>' +
          '<m:barPr><m:pos m:val="' + (node.pos === 'bot' ? 'bot' : 'top') + '"/></m:barPr>' +
          '<m:e>' + ensureNonEmptyOmml(emit(node.body, inheritedStyle), runDefaults) + '</m:e>' +
          '</m:bar>'
      default:
        return ''
    }
  }

  const inner = ensureNonEmptyOmml(emit(ast), runDefaults)
  if (options.wrapDrawingMl !== false) {
    return (
      '<a14:m xmlns:a14="' + A14_NS + '">' +
      '<m:oMathPara xmlns:m="' + OMML_NS + '">' +
      '<m:oMath>' + inner + '</m:oMath>' +
      '</m:oMathPara>' +
      '</a14:m>'
    )
  }
  if (options.para) {
    return '<m:oMathPara xmlns:m="' + OMML_NS + '"><m:oMath>' + inner + '</m:oMath></m:oMathPara>'
  }
  return '<m:oMath xmlns:m="' + OMML_NS + '">' + inner + '</m:oMath>'
}

export function latexToOmml(latex, options = {}) {
  return astToOmml(parseLatexMath(latex), options)
}

// ---------------------------------------------------------------------------
// 混排段落行内 DrawingML Run 编译（支持真上下标 baseline，杜绝 LibreOffice 吞行内公式）
// ---------------------------------------------------------------------------

export function astToOoxmlInlineRuns(ast) {
  const runs = []

  function pushRun(text, mods = {}) {
    if (!text) return
    runs.push({
      text,
      italic: Boolean(mods.italic),
      bold: Boolean(mods.bold),
      baseline: mods.baseline ?? 0,
      spcEm: mods.spcEm ?? 0,
      math: mods.isText ? false : true,
    })
  }

  function flattenPlain(node) {
    const subRuns = astToOoxmlInlineRuns(node)
    return subRuns.map((r) => r.text).join('')
  }

  function walk(node, mods = {}) {
    if (!node) return
    switch (node.type) {
      case 'row':
        node.children.forEach((ch) => walk(ch, mods))
        break
      case 'num':
        pushRun(node.value, { ...mods, italic: false, bold: mods.bold || node.style === 'bold' })
        break
      case 'ident':
        pushRun(node.value, {
          ...mods,
          italic: node.style !== 'roman' && node.style !== 'bold',
          bold: mods.bold || node.style === 'bold',
        })
        break
      case 'sym':
        if (node.variant === 'bb' && !node.bmp) {
          pushRun(node.value, { ...mods, italic: false, bold: true })
          break
        }
        if (node.variant === 'cal' && !node.bmp) {
          pushRun(node.value, { ...mods, italic: true, bold: true })
          break
        }
        pushRun(node.value, {
          ...mods,
          italic: !node.upright && node.style !== 'roman',
          bold: mods.bold || node.style === 'bold',
        })
        break
      case 'op': {
        const sp = BINARY_OR_REL_OPS.has(node.value) && !mods.baseline ? ' ' + node.value + ' ' : node.value
        pushRun(sp, { ...mods, italic: false })
        break
      }
      case 'text':
        pushRun(node.value, { ...mods, italic: false, bold: mods.bold || node.bold, isText: true })
        break
      case 'space':
        pushRun(node.value, { ...mods, italic: false })
        break
      case 'func':
        pushRun(node.name + (!node.limitOp ? ' ' : ''), { ...mods, italic: false })
        break
      case 'style':
        walk(node.body, { ...mods, bold: mods.bold || node.style === 'bold' })
        break
      case 'frac': {
        const needNumParen = node.num?.type === 'row' && node.num.children.length > 1
        const needDenParen = node.den?.type === 'row' && node.den.children.length > 1
        if (needNumParen) pushRun('(', { ...mods, italic: false })
        walk(node.num, mods)
        if (needNumParen) pushRun(')', { ...mods, italic: false })
        pushRun(node.bar === false ? ' ¦ ' : '/', { ...mods, italic: false })
        if (needDenParen) pushRun('(', { ...mods, italic: false })
        walk(node.den, mods)
        if (needDenParen) pushRun(')', { ...mods, italic: false })
        break
      }
      case 'sqrt':
        pushRun('√(', { ...mods, italic: false })
        walk(node.body, mods)
        pushRun(')', { ...mods, italic: false })
        break
      case 'root':
        walk(node.deg, { ...mods, baseline: 35000 })
        pushRun('√(', { ...mods, italic: false })
        walk(node.body, mods)
        pushRun(')', { ...mods, italic: false })
        break
      case 'sub':
      case 'limLow':
        walk(node.base, mods)
        walk(node.sub ?? node.lim, { ...mods, baseline: -25000 })
        break
      case 'sup':
      case 'limUpp': {
        walk(node.base, mods)
        if (node.base?.type === 'sym' && node.base.bmp) {
          pushRun('\u2009', { ...mods, italic: false })
        }
        walk(node.sup ?? node.lim, { ...mods, baseline: 35000 })
        break
      }
      case 'subsup': {
        walk(node.base, mods)
        if (node.base?.type === 'sym' && node.base.bmp) {
          pushRun('\u2009', { ...mods, italic: false })
        }
        walk(node.sub, { ...mods, baseline: -25000 })
        walk(node.sup, { ...mods, baseline: 35000 })
        break
      }
      case 'nary':
        pushRun(node.chr, { ...mods, italic: false })
        if (node.sub) walk(node.sub, { ...mods, baseline: -25000 })
        if (node.sup) walk(node.sup, { ...mods, baseline: 35000 })
        pushRun(' ', { ...mods, italic: false })
        walk(node.body, mods)
        break
      case 'delim':
        if (node.open) pushRun(node.open, { ...mods, italic: false })
        walk(node.body, mods)
        if (node.close) pushRun(node.close, { ...mods, italic: false })
        break
      case 'matrix': {
        const rowStrs = node.rows.map((r) => r.map(flattenPlain).join(', '))
        pushRun(rowStrs.join('; '), { ...mods, italic: false })
        break
      }
      case 'acc': {
        const baseStr = flattenPlain(node.body)
        const isVec = node.cmd === 'vec' || node.cmd === 'overrightarrow'
        const targetComb = isVec ? '\u0304' : node.chr
        const precomposed = (baseStr + targetComb).normalize('NFC')
        // 1. 若存在单码位 NFC 预组字形（如 â, ê, î, ô, û, ā, ū, ã, ñ），直接输出单码位零组合符
        if ([...precomposed].length === 1 && precomposed !== baseStr) {
          pushRun(precomposed, { ...mods, italic: true, bold: mods.bold || isVec })
          break
        }
        // 2. 若基底是纯 ASCII 拉丁单字母且为上横线（如 \bar{x} / \vec{x}），Liberation Serif 原生 GPOS 居中锚定完美
        if (/^[a-zA-Z]$/.test(baseStr) && targetComb === '\u0304') {
          pushRun(baseStr + '\u0304', { ...mods, italic: true, bold: mods.bold || isVec })
          break
        }
        // 3. 对无 NFC 预组的希腊字母或任意字符（如 \hat{\omega}_i, \tilde{\theta}_m），在同一 <a:r> 内利用负字距回退叠印顶标修饰符，随后插入细空隙与下标自然衔接
        const modSpec = SPACING_MODIFIER_ACCENT[node.cmd] ?? { glyph: 'ˆ', baseline: 12000 }
        pushRun(baseStr + modSpec.glyph, { ...mods, italic: true, bold: mods.bold || isVec, spcEm: -0.44 })
        pushRun('\u2009', { ...mods, italic: false })
        break
      }
      case 'bar': {
        const baseStr = flattenPlain(node.body)
        const comb = node.pos === 'bot' ? '\u0332' : '\u0304'
        const composed = [...baseStr].map((c) => (c + comb).normalize('NFC')).join('')
        pushRun(composed, { ...mods, italic: true })
        break
      }
      default:
        break
    }
  }

  walk(ast)
  return runs
}

// ---------------------------------------------------------------------------
// 2D 结构判定与自然宽高比几何估算器（确保 LibreOffice StarMath 1:1 等比无畸变）
// ---------------------------------------------------------------------------

export function has2dMathConstruct(ast) {
  if (!ast) return false
  if (['frac', 'sqrt', 'root', 'nary', 'matrix', 'limLow', 'limUpp'].includes(ast.type)) return true
  if (ast.type === 'row') return ast.children.some(has2dMathConstruct)
  return Boolean(
    has2dMathConstruct(ast.body) ||
    has2dMathConstruct(ast.base) ||
    has2dMathConstruct(ast.num) ||
    has2dMathConstruct(ast.den) ||
    has2dMathConstruct(ast.sub) ||
    has2dMathConstruct(ast.sup),
  )
}

export function measureMathAst(ast) {
  if (!ast) return { widthEm: 0.6, heightEm: 1.0 }
  switch (ast.type) {
    case 'row': {
      if (ast.children.length === 0) return { widthEm: 0.4, heightEm: 1.0 }
      let w = 0
      let h = 1.0
      for (const ch of ast.children) {
        const m = measureMathAst(ch)
        w += m.widthEm
        h = Math.max(h, m.heightEm)
      }
      return { widthEm: w, heightEm: h }
    }
    case 'num':
      return { widthEm: Math.max(0.55, ast.value.length * 0.56), heightEm: 1.0 }
    case 'ident':
    case 'sym':
      return { widthEm: 0.62, heightEm: 1.0 }
    case 'op':
      return { widthEm: BINARY_OR_REL_OPS.has(ast.value) ? 1.15 : 0.48, heightEm: 1.0 }
    case 'text': {
      let w = 0
      for (const ch of ast.value) {
        w += (ch.codePointAt(0) ?? 0) > 0x2E80 ? 1.0 : 0.54
      }
      return { widthEm: Math.max(0.5, w), heightEm: 1.05 }
    }
    case 'space':
      return { widthEm: 0.35 * ast.value.length, heightEm: 1.0 }
    case 'func':
      return { widthEm: ast.name.length * 0.54 + 0.25, heightEm: 1.05 }
    case 'style':
      return measureMathAst(ast.body)
    case 'frac': {
      const n = measureMathAst(ast.num)
      const d = measureMathAst(ast.den)
      return {
        widthEm: Math.max(n.widthEm, d.widthEm) + 0.52,
        heightEm: n.heightEm * 0.86 + d.heightEm * 0.86 + 0.54,
      }
    }
    case 'sqrt': {
      const b = measureMathAst(ast.body)
      return { widthEm: b.widthEm + 0.72, heightEm: b.heightEm + 0.32 }
    }
    case 'root': {
      const deg = measureMathAst(ast.deg)
      const b = measureMathAst(ast.body)
      return { widthEm: deg.widthEm * 0.6 + b.widthEm + 0.78, heightEm: b.heightEm + 0.36 }
    }
    case 'sub': {
      const b = measureMathAst(ast.base)
      const s = measureMathAst(ast.sub)
      return { widthEm: b.widthEm + s.widthEm * 0.68, heightEm: Math.max(1.22, b.heightEm + 0.22) }
    }
    case 'sup': {
      const b = measureMathAst(ast.base)
      const s = measureMathAst(ast.sup)
      return { widthEm: b.widthEm + s.widthEm * 0.68, heightEm: Math.max(1.28, b.heightEm + 0.30) }
    }
    case 'subsup': {
      const b = measureMathAst(ast.base)
      const sub = measureMathAst(ast.sub)
      const sup = measureMathAst(ast.sup)
      return {
        widthEm: b.widthEm + Math.max(sub.widthEm, sup.widthEm) * 0.68,
        heightEm: Math.max(1.42, b.heightEm + 0.42),
      }
    }
    case 'limLow':
    case 'limUpp': {
      const b = measureMathAst(ast.base)
      const l = measureMathAst(ast.lim)
      return { widthEm: Math.max(b.widthEm, l.widthEm * 0.74) + 0.2, heightEm: b.heightEm + 0.62 }
    }
    case 'nary': {
      const sub = ast.sub ? measureMathAst(ast.sub) : { widthEm: 0, heightEm: 0 }
      const sup = ast.sup ? measureMathAst(ast.sup) : { widthEm: 0, heightEm: 0 }
      const b = measureMathAst(ast.body)
      const opW = ast.limLoc === 'undOvr'
        ? Math.max(1.25, sub.widthEm * 0.68, sup.widthEm * 0.68)
        : 1.05 + Math.max(sub.widthEm, sup.widthEm) * 0.65
      const opH = ast.limLoc === 'undOvr'
        ? 1.55 + (ast.sub ? 0.42 : 0) + (ast.sup ? 0.42 : 0)
        : 1.75
      return { widthEm: opW + 0.22 + b.widthEm, heightEm: Math.max(opH, b.heightEm) }
    }
    case 'delim': {
      const b = measureMathAst(ast.body)
      const delimCount = (ast.open ? 1 : 0) + (ast.close ? 1 : 0)
      return { widthEm: b.widthEm + delimCount * 0.46, heightEm: Math.max(1.18, b.heightEm * 1.06) }
    }
    case 'matrix': {
      const cols = Math.max(1, ...ast.rows.map((r) => r.length))
      const colWidths = Array.from({ length: cols }, () => 0.6)
      let totalH = 0
      for (const r of ast.rows) {
        let rowH = 1.0
        r.forEach((cell, cIdx) => {
          const m = measureMathAst(cell)
          colWidths[cIdx] = Math.max(colWidths[cIdx], m.widthEm)
          rowH = Math.max(rowH, m.heightEm)
        })
        totalH += rowH
      }
      return {
        widthEm: colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * 0.92 + 0.5,
        heightEm: totalH + Math.max(0, ast.rows.length - 1) * 0.34 + 0.36,
      }
    }
    case 'acc':
    case 'bar': {
      const b = measureMathAst(ast.body)
      return { widthEm: b.widthEm, heightEm: b.heightEm + 0.28 }
    }
    default:
      return { widthEm: 0.8, heightEm: 1.0 }
  }
}

/**
 * 在给定容器框内，按公式自然宽高比求解 1:1 无拉伸的 <p:sp> 几何框。
 */
export function fitFormulaBoxIn(ast, containerBoxIn, options = {}) {
  const {
    padXIn = 0.28,
    padYIn = 0.14,
    emIn = 0.31,
    align = 'ctr',
  } = options
  const metrics = measureMathAst(ast)
  const maxW = Math.max(0.8, containerBoxIn.w - padXIn * 2)
  const maxH = Math.max(0.36, containerBoxIn.h - padYIn * 2)

  let naturalW = Math.max(0.9, metrics.widthEm * emIn)
  let naturalH = Math.max(0.40, metrics.heightEm * emIn * 1.06)

  const scale = Math.min(1, maxW / naturalW, maxH / naturalH)
  const w = +(naturalW * scale).toFixed(4)
  const h = +(naturalH * scale).toFixed(4)
  const x = align === 'l'
    ? +(containerBoxIn.x + padXIn).toFixed(4)
    : +(containerBoxIn.x + (containerBoxIn.w - w) / 2).toFixed(4)
  const y = +(containerBoxIn.y + (containerBoxIn.h - h) / 2).toFixed(4)

  return { x, y, w, h, widthEm: metrics.widthEm, heightEm: metrics.heightEm }
}
