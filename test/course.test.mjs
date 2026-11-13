import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, relative } from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'
import { zipSync, strToU8 } from 'fflate'
import { CourseService } from '../lib/course.js'

const FFMPEG = '/opt/homebrew/bin/ffmpeg'
const FFPROBE = '/opt/homebrew/bin/ffprobe'
const haveFfmpeg = existsSync(FFMPEG) && existsSync(FFPROBE)

const work = resolve('.test-output'); // shared with other suites
mkdirSync(work, { recursive: true })

const STUB_SEGMENTS = [
  { start: 0, end: 3, text: '大家好，今天我们讲如何部署一个网页。' },
  { start: 3, end: 8, text: '首先，准备服务器环境。' },
  { start: 8, end: 14, text: '然后，上传代码到服务器。' },
  { start: 14, end: 20, text: '接着，配置域名和证书。' },
  { start: 20, end: 26, text: '注意，不要直接在生产环境测试，容易出错。' },
  { start: 26, end: 32, text: '例如，先用本地环境跑通整个流程。' },
  { start: 32, end: 38, text: '最后，检查日志并确认服务正常运行。' },
  { start: 38, end: 42, text: '小结：部署的关键是环境一致与逐步验证。' },
]

const REFINED_JSON = {
  coreConcepts: [
    { title: '部署准备', points: ['准备服务器', '安装运行环境', '检查依赖版本'], start: 3, end: 8 },
    { title: '上传代码', points: ['打包项目', '上传到服务器', '解压到目标目录'], start: 8, end: 14 },
    { title: '域名与证书', points: ['解析域名', '配置 HTTPS', '证书续期'], start: 14, end:20 },
    { title: '环境一致性', points: ['本地与线上一致', '用容器隔离', '固定依赖版本'], start: 20, end: 26 },
    { title: '日志与监控', points: ['查看日志', '配置监控', '告警设置'], start: 32, end: 38 },
    { title: '逐步验证', points: ['本地验证', '线上验证', '回滚预案'], start: 38, end: 42 },
  ],
  keySteps: [
    { title: '准备服务器', points: ['选择云主机', '配置安全组', '登录服务器'], start: 3, end: 8 },
    { title: '上传代码', points: ['打包', '上传', '解压'], start: 8, end: 14 },
    { title: '配置域名', points: ['解析', '证书', '跳转'], start: 14, end: 20 },
    { title: '验证上线', points: ['日志', '监控', '回滚'], start: 32, end: 42 },
  ],
  pitfalls: ['不要在生产环境直接测试', '注意证书到期', '别忽略权限配置'],
  examples: [
    { title: '本地先行', points: ['本地跑通', '记录步骤', '再上线'] },
    { title: '域名配置实例', points: ['A 记录', 'CNAME', 'HTTPS'] },
  ],
  summary: ['部署关键是环境一致与逐步验证', '上线前检查日志', '准备回滚预案'],
}

function stubTranscriber() {
  return async () => STUB_SEGMENTS.map((s) => ({ ...s }))
}
function stubLlm() {
  return { complete: async (_system, _input, _signal) => JSON.stringify(REFINED_JSON) }
}

function makeService(opts = {}) {
  return new CourseService({
    ffmpegPath: FFMPEG, ffprobePath: FFPROBE,
    ...opts,
  })
}

function synthVideo(dir, name = '第01课-部署网页.mp4') {
  const out = join(dir, name)
  const r = spawnSync(FFMPEG, ['-y',
    '-f', 'lavfi', '-i', 'color=c=blue:s=320x240:d=3',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
    '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', out],
    { stdio: 'pipe' })
  assert.equal(r.status, 0, '合成视频失败：' + (r.stderr ? r.stderr.toString() : ''))
  return out
}

test('scan 正确分类视频/压缩包/文档/图片，并给出课序与时长', async (t) => {
  if (!haveFfmpeg) return t.skip('本机没有 ffmpeg')
  const dir = mkdtempSync(join(work, 'course-scan-'))
  try {
    synthVideo(dir, '第01课-部署网页.mp4')
    synthVideo(dir, '第02课-配置域名.mp4')
    writeFileSync(join(dir, '第01课-素材.zip'), zipSync({ '练习.txt': strToU8('练习') }))
    writeFileSync(join(dir, '讲义.md'), '# 讲义')
    writeFileSync(join(dir, '封面.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    const service = makeService()
    const res = await service.scan({ folder: dir })
    assert.equal(res.ok, true)
    assert.equal(res.videos.length, 2)
    assert.equal(res.videos[0].lesson, 1)
    assert.equal(res.videos[1].lesson, 2)
    assert.ok(res.videos.every((v) => typeof v.durationSec === 'number' && v.durationSec >= 2))
    assert.equal(res.zips.length, 1)
    assert.equal(res.zips[0].matchedLesson, 1)
    assert.equal(res.docs.length, 1)
    assert.equal(res.images.length, 1)
    assert.equal(res.suggestedLessons, 2)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('build 用 stub STT + stub LLM 跑通：产出三件套 + homework.md + build-report.md，JSON 可解析', async (t) => {
  if (!haveFfmpeg) return t.skip('本机没有 ffmpeg')
  const dir = mkdtempSync(join(work, 'course-build-'))
  try {
    const folder = join(dir, 'course')
    const { mkdirSync } = await import('node:fs')
    mkdirSync(folder, { recursive: true })
    synthVideo(folder, '第01课-部署网页.mp4')
    const service = makeService({ transcribe: stubTranscriber(), llm: stubLlm() })
    const out = await service.build({ folder, mode: 'deep', withHomework: true, useMaterials: 'none', outputDir: join(dir, 'out') })
    assert.equal(out.ok, true)
    assert.equal(out.lessons.length, 1)
    const lesson = out.lessons[0]
    assert.equal(lesson.stt, 'ok')
    assert.equal(lesson.refine, 'llm')
    assert.ok(lesson.slideCount >= 15 && lesson.slideCount <= 25, 'deep 页数应在 15–25，实际 ' + lesson.slideCount)
    assert.ok(existsSync(lesson.htmlPath))
    assert.ok(existsSync(lesson.pptxPath))
    assert.ok(existsSync(lesson.jsonPath))
    assert.ok(existsSync(lesson.lessonPlanPath))
    assert.ok(lesson.homeworkPath && existsSync(lesson.homeworkPath))
    // 总览 + 报告 + 索引
    assert.ok(existsSync(out.overview.htmlPath))
    assert.ok(existsSync(out.courseIndexPath))
    assert.ok(existsSync(out.reportPath))
    // JSON 可解析
    const manifest = JSON.parse(readFileSync(lesson.jsonPath, 'utf8'))
    assert.equal(manifest.slides.length, lesson.slideCount)
    const report = readFileSync(out.reportPath, 'utf8')
    assert.match(report, /生成报告/)
    assert.match(report, /转写/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('三种 mode 的页数区间符合预期', async (t) => {
  if (!haveFfmpeg) return t.skip('本机没有 ffmpeg')
  const dir = mkdtempSync(join(work, 'course-modes-'))
  try {
    const folder = join(dir, 'course')
    const { mkdirSync } = await import('node:fs')
    mkdirSync(folder, { recursive: true })
    synthVideo(folder, '第01课-部署网页.mp4')
    const service = makeService({ transcribe: stubTranscriber(), llm: stubLlm() })
    const ranges = { deep: [15, 25], quick: [6, 10], outline: [3, 5] }
    for (const [mode, [min, max]] of Object.entries(ranges)) {
      const out = await service.build({ folder, mode, withHomework: true, useMaterials: 'none', outputDir: join(dir, 'out-' + mode) })
      assert.equal(out.ok, true)
      const n = out.lessons[0].slideCount
      assert.ok(n >= min && n <= max, mode + ' 页数应在 ' + min + '–' + max + '，实际 ' + n)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('缺 STT：明确中文原因、不崩、不产出假装有内容的课件', async (t) => {
  if (!haveFfmpeg) return t.skip('本机没有 ffmpeg')
  const dir = mkdtempSync(join(work, 'course-nostt-'))
  try {
    const folder = join(dir, 'course')
    const { mkdirSync } = await import('node:fs')
    mkdirSync(folder, { recursive: true })
    synthVideo(folder, '第01课-部署网页.mp4')
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => { throw new Error('no network') }
    try {
      const service = makeService({ transcribe: undefined, speechToText: undefined, llm: stubLlm() })
      const out = await service.build({ folder, mode: 'deep', withHomework: true, useMaterials: 'none', outputDir: join(dir, 'out') })
      assert.equal(out.ok, true)
      const lesson = out.lessons[0]
      assert.ok(lesson.stt !== 'ok')
      assert.equal(lesson.htmlPath, '')
      assert.ok(existsSync(out.reportPath))
      const report = readFileSync(out.reportPath, 'utf8')
      assert.match(report, /无转写|无可用转写|不可用|跳过/)
    } finally {
      globalThis.fetch = originalFetch
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('缺 LLM：降级为提取式摘要且标注原因，不崩', async (t) => {
  if (!haveFfmpeg) return t.skip('本机没有 ffmpeg')
  const dir = mkdtempSync(join(work, 'course-nollm-'))
  try {
    const folder = join(dir, 'course')
    const { mkdirSync } = await import('node:fs')
    mkdirSync(folder, { recursive: true })
    synthVideo(folder, '第01课-部署网页.mp4')
    const service = makeService({ transcribe: stubTranscriber(), llm: undefined })
    const out = await service.build({ folder, mode: 'quick', withHomework: true, useMaterials: 'none', outputDir: join(dir, 'out') })
    assert.equal(out.ok, true)
    assert.equal(out.lessons[0].refine, 'extractive')
    assert.ok(out.lessons[0].htmlPath && existsSync(out.lessons[0].htmlPath))
    const planMd = readFileSync(out.lessons[0].lessonPlanPath, 'utf8')
    assert.match(planMd, /转写溯源/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('VoiceStudio 未运行：明确报错，绝不假装成功', async (t) => {
  const dir = mkdtempSync(join(work, 'course-voice-'))
  try {
    const srt = join(dir, 'a.srt')
    writeFileSync(srt, '1\n00:00:00,000 --> 00:00:02,000\n你好\n')
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => { throw new Error('no network') }
    try {
      const service = makeService()
      await assert.rejects(() => service.voice({ input: srt }), /VoiceStudio 未运行/)
    } finally {
      globalThis.fetch = originalFetch
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('zip-slip 防护：带 ../ 的 zip 被拒绝', async (t) => {
  const dir = mkdtempSync(join(work, 'course-zipslip-'))
  try {
    const evil = join(dir, 'evil.zip')
    writeFileSync(evil, zipSync({ '../evil.txt': strToU8('pwned'), 'ok.txt': strToU8('fine') }))
    const service = makeService()
    await assert.rejects(() => service.safeUnzip(evil, join(dir, 'out'), new AbortController().signal), /越界|\.\.\//)
    assert.equal(existsSync(join(dir, 'evil.txt')), false, '不应解压到上级目录')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('素材解压（正常 zip）成功且路径安全', async (t) => {
  const dir = mkdtempSync(join(work, 'course-unzip-'))
  try {
    const zip = join(dir, '素材.zip')
    writeFileSync(zip, zipSync({ '练习.txt': strToU8('练习内容'), '子目录/说明.md': strToU8('# 说明') }))
    const service = makeService()
    const files = await service.safeUnzip(zip, join(dir, 'materials'), new AbortController().signal)
    assert.ok(files.length >= 2)
    assert.ok(files.some((f) => f.endsWith('练习.txt')))
    assert.ok(readFileSync(join(dir, 'materials', '练习.txt'), 'utf8') === '练习内容')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('去水印：给 regions 调 ffmpeg，输出文件存在且时长不变', async (t) => {
  if (!haveFfmpeg) return t.skip('本机没有 ffmpeg')
  const dir = mkdtempSync(join(work, 'course-clean-'))
  try {
    const video = synthVideo(dir, 'sample.mp4')
    const service = makeService()
    const out = await service.clean({ input: video, method: 'box', regions: [{ x: 10, y: 10, w: 60, h: 40 }], outputDir: join(dir, 'clean') })
    assert.equal(out.ok, true)
    assert.ok(existsSync(out.outputPath))
    assert.ok(out.durationSec >= 2 && out.durationSec <= 4, '时长应约 3 秒，实际 ' + out.durationSec)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('去水印：缺 regions 且未传 auto 时明确报错', async (t) => {
  if (!haveFfmpeg) return t.skip('本机没有 ffmpeg')
  const dir = mkdtempSync(join(work, 'course-clean-err-'))
  try {
    const video = synthVideo(dir, 'sample.mp4')
    const service = makeService()
    await assert.rejects(() => service.clean({ input: video, outputDir: join(dir, 'clean') }), /regions|auto/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('系统 zip 打包的中文文件名不乱码（复现真实场景：无 UTF-8 标志位）', async (t) => {
  // 用户手上的作业素材包通常是 macOS/Windows 的资源管理器或 zip 命令打的，
  // 这类包的条目名不带 UTF-8 标志（通用标志位 11），fflate 会按 latin1 还原成乱码。
  const dir = mkdtempSync(join(work, 'course-cnzip-'))
  try {
    const srcDir = join(dir, 'src')
    mkdirSync(join(srcDir, '子目录'), { recursive: true })
    writeFileSync(join(srcDir, '作业清单.csv'), '任务,负责人\n整理提纲,张三\n')
    writeFileSync(join(srcDir, '作业说明.txt'), '完成需求清单')
    writeFileSync(join(srcDir, '子目录', '参考图.png'), 'png')
    const zip = join(dir, '第01课-作业素材.zip')
    // 用系统 zip -r 打包（不写 UTF-8 标志，与用户实际遇到的情况一致）
    execFileSync('zip', ['-qr', zip, '.'], { cwd: srcDir })

    const service = makeService()
    const files = await service.safeUnzip(zip, join(dir, 'materials'), new AbortController().signal)
    const names = files.map((f) => relative(join(dir, 'materials'), f)).sort()
    assert.ok(names.includes('作业清单.csv'), '顶层中文文件名应正确：' + JSON.stringify(names))
    assert.ok(names.includes('作业说明.txt'), '顶层中文文件名应正确：' + JSON.stringify(names))
    assert.ok(names.some((n) => n.endsWith('参考图.png')), '子目录内中文文件名应正确：' + JSON.stringify(names))
    // 内容不能因为是乱码路径而丢失
    assert.equal(readFileSync(join(dir, 'materials', '作业说明.txt'), 'utf8'), '完成需求清单')
    // 不应留下乱码残影
    assert.ok(!names.some((n) => /[ÃÂäåæçè]/.test(n)), '不应出现 latin1 乱码：' + JSON.stringify(names))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
