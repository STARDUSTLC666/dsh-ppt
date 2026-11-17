import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { PptWorkbench, PPT_DOWNLOAD_ROUTE } from '../lib/workbench.js'
import { nativeCoachingModel } from '../lib/coaching-model.js'
import { buildDeckAsync, readDeckProject, editDeck } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'

const work = resolve('.test-output'); mkdirSync(work, { recursive: true })
const route = { provider: 'configured', model: 'text-model', label: 'Configured model' }
const defaultFinding = data => ({ slideId: data.slides[0].id, kind: 'expression', question: '这个标题能更直接吗？', answer: '本页介绍季度计划与交付。', issue: '标题可更简练', suggestion: '保留含义，压缩标题。', reference: 'slide:' + data.slides[0].id, quote: data.slides[0].title, patch: { title: '季度交付计划' } })
async function fixture(run, generate = async data => ({ findings: [defaultFinding(data)] })) {
  const directory = mkdtempSync(join(work, 'coaching-')); let calls = 0, listings = 0
  const model = { routes: async () => { listings++; return [route] }, generate: async (_route, system, input, signal) => { calls++; signal.throwIfAborted(); return JSON.stringify(await generate(JSON.parse(input), signal, system)) } }
  try {
    const created = await buildDeckAsync({ title: '季度计划与交付', slides: [{ layout: 'bullets', title: '季度计划与交付', bullets: ['完成十二个项目，实际收入增长20%'], notes: '这是未经外部核验的计划材料。' }, { layout: 'bullets', title: '风险与下一步安排', bullets: ['补充客户回访记录'] }], outputDir: directory, fileName: 'plan' })
    const wb = new PptWorkbench({ catalogPath: join(directory, 'projects.jsonl'), coachingModel: model })
    await wb.remember(created, {}, { agent: { session: { header: {}, requestContext: () => route } } })
    const id = (await wb.action({ operation: 'list' })).projects[0].id
    const act = (operation, data = {}, signal) => wb.action({ operation: 'coach-' + operation, id, expectedRevision: readDeckProject({ deckPath: created.jsonPath }).manifest.revision, ...data }, signal)
    const create = (data = {}) => act('create', { confirmed: true, mode: 'review', ...route, difficulty: 'normal', limit: 1, ...data })
    await run({ directory, created, wb, id, act, create, calls: () => calls, listings: () => listings })
    wb.coaching.dispose()
  } finally { assert.ok(directory.startsWith(work)); rmSync(directory, { recursive: true, force: true }) }
}

test('normal delivery neither lists models nor generates; configuration and creation are not model calls', () => fixture(async ({ wb, id, act, create, calls, listings }) => {
  const opened = await wb.action({ operation: 'open', id }); assert.deepEqual(opened.project.modelRoute, { provider: route.provider, model: route.model })
  const zip = await wb.fetchDownload(new Request('http://local' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=bundle&revision=0`)); assert.equal(zip.status, 200)
  const share = await wb.fetchDownload(new Request('http://local' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=share&revision=0`)); assert.equal(share.status, 200)
  assert.equal(calls(), 0); assert.equal(listings(), 0)
  const options = await act('options'); assert.equal(options.available, true)
  const { run } = await create(); assert.equal(run.usedCalls, 0); assert.equal(run.maxCalls, 1); assert.equal(run.material, undefined); assert.equal(run.slides, undefined)
  assert.equal(calls(), 0); assert.equal(listings(), 2)
}))

test('review is bounded, persists across restarts and exports Q&A plus missing-evidence checklist', () => fixture(async ({ wb, act, create, id, calls }) => {
  const { run } = await create({ limit: 2 })
  await act('step', { runId: run.id, confirmed: true })
  const complete = (await act('step', { runId: run.id, confirmed: true })).run
  assert.equal(complete.status, 'complete'); assert.equal(complete.usedCalls, 2); assert.equal(complete.findings.length, 1)
  await assert.rejects(act('step', { runId: run.id, confirmed: true }), /上限/); assert.equal(calls(), 2)
  const fresh = new PptWorkbench({ catalogPath: wb.catalogPath })
  assert.equal((await fresh.action({ operation: 'coach-get', id, runId: run.id })).run.usedCalls, 2)
  const response = await wb.fetchDownload(new Request('http://local' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=coaching&revision=0&run=${run.id}`))
  assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /markdown/)
  const markdown = await response.text(); assert.match(markdown, /材料清单/); assert.match(markdown, /不代表事实核验/)
}))

test('adoption writes an undoable copy with backup slides and preserves original artifact bytes', () => fixture(async ({ created, wb, act, create, id }) => {
  const originals = Object.values(created.files).map(p => readFileSync(p))
  const { run } = await create(); const report = (await act('step', { runId: run.id, confirmed: true })).run
  const finding = report.findings[0]; assert.ok(finding.grounded); assert.ok(finding.patch)
  const adopted = await act('apply', { runId: run.id, confirmed: true, selected: [finding.id], backup: [finding.id] })
  assert.notEqual(adopted.project.id, id); assert.notEqual(adopted.project.deckId, report.deckId)
  assert.equal(adopted.project.slides[0].title, '季度交付计划'); assert.equal(adopted.project.slides.length, 3); assert.equal(adopted.project.undoAvailable, 1)
  Object.values(created.files).forEach((p, i) => assert.deepEqual(readFileSync(p), originals[i]))
  const undone = await wb.action({ operation: 'undo', id: adopted.project.id, expectedRevision: 0 })
  assert.equal(undone.project.slides[0].title, '季度计划与交付'); assert.equal(undone.project.slides.length, 2)
  Object.values(created.files).forEach((p, i) => assert.deepEqual(readFileSync(p), originals[i]))
}))

test('invented evidence, fresh numbers and logic findings cannot become adoptable expression patches', () => fixture(async ({ create, act }) => {
  const { run } = await create(); const result = (await act('step', { runId: run.id, confirmed: true })).run
  assert.equal(result.findings.length, 3)
  assert.ok(result.findings.every(f => !f.patch)); assert.equal(result.findings[0].grounded, false)
  await assert.rejects(act('apply', { runId: run.id, confirmed: true, selected: [result.findings[0].id], backup: [] }), /表达修改/)
}, async data => ({ findings: [{ ...defaultFinding(data), quote: '不存在的证据报告' }, { ...defaultFinding(data), patch: { title: '增长2%' } }, { ...defaultFinding(data), kind: 'logic' }] })))

test('plain multiline quotes match without JSON escape artifacts', () => fixture(async ({ create, act }) => {
  const { run } = await create({ material: '访谈原文第一段\n客户明确要求离线交付。' })
  const report = (await act('step', { runId: run.id, confirmed: true })).run
  assert.ok(report.findings[0].grounded)
}, async data => ({ findings: [{ ...defaultFinding(data), reference: 'material', quote: '访谈原文第一段\n客户明确要求离线交付。' }] })))

test('changed projects keep readable old reports but refuse continuation and adoption', () => fixture(async ({ created, create, act, calls }) => {
  const { run } = await create({ limit: 3 }); const report = (await act('step', { runId: run.id, confirmed: true })).run
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, edits: [{ slide: 1, patch: { title: '用户的新版本' } }] })
  assert.equal((await act('get', { runId: run.id })).run.stale, true)
  await assert.rejects(act('step', { runId: run.id, confirmed: true }), /工程已被修改/)
  await assert.rejects(act('apply', { runId: run.id, confirmed: true, selected: [report.findings[0].id], backup: [] }), /工程已被修改/)
  assert.equal(calls(), 1)
}))

test('practice asks one question at a time, assesses user answers and respects its N+1 cap', () => fixture(async ({ create, act, calls }) => {
  const { run } = await create({ mode: 'practice', limit: 2 })
  let current = (await act('step', { runId: run.id, confirmed: true })).run; assert.equal(current.questions.length, 1); assert.equal(current.completedRounds, 0)
  await assert.rejects(act('step', { runId: run.id, confirmed: true, answer: '' }), /回答/); assert.equal(calls(), 1)
  current = (await act('step', { runId: run.id, confirmed: true, answer: '据本页材料说明计划。' })).run
  assert.equal(current.questions.length, 2); assert.equal(current.completedRounds, 1); assert.equal(current.questions[0].needsEvidence, true)
  current = (await act('step', { runId: run.id, confirmed: true, answer: '需要补充回访证据。' })).run
  assert.equal(current.status, 'complete'); assert.equal(current.completedRounds, 2); assert.equal(calls(), 3)
  await assert.rejects(act('step', { runId: run.id, confirmed: true, answer: 'more' }), /上限/)
}, async data => data.questions.length ? { feedback: { note: '回答应补充实际依据。', needsEvidence: false, reference: 'material', quote: '杜撰的访谈材料' }, next: data.finalQuestion ? null : { slideId: data.slides[1].id, question: '如何应对风险？' } } : { next: { slideId: data.slides[0].id, question: '计划的依据是什么？' } }))

test('early finish and deletion consume no more model calls and never delete presentation files', () => fixture(async ({ created, create, act, calls }) => {
  const { run } = await create({ mode: 'practice', limit: 5 })
  const final = (await act('finish', { runId: run.id })).run; assert.equal(final.status, 'complete'); assert.equal(calls(), 0)
  await act('delete', { runId: run.id }); assert.deepEqual((await act('list')).runs, [])
  assert.ok(readDeckProject({ deckPath: created.jsonPath }).manifest.slides.length)
}))

test('invalid options and foreign report IDs never cause model execution', () => fixture(async ({ create, act, calls }) => {
  for (const data of [{ confirmed: false }, { limit: 0 }, { limit: 4 }, { model: 'unknown' }, { material: 'x'.repeat(20001) }, { slideId: 'missing' }]) await assert.rejects(create(data))
  await assert.rejects(act('get', { runId: '../outside' }))
  assert.equal(calls(), 0)
}))

test('model parsing failure is saved once without automatic retry', () => fixture(async ({ create, act, calls }) => {
  const { run } = await create(); await assert.rejects(act('step', { runId: run.id, confirmed: true }), /保存记录/)
  const saved = (await act('get', { runId: run.id })).run; assert.equal(saved.status, 'paused'); assert.equal(saved.usedCalls, 1)
  assert.match(saved.error, /未自动重试/); assert.equal(calls(), 1)
  await assert.rejects(act('step', { runId: run.id, confirmed: true }), /上限/)
}, async () => ({ findings: [{ slideId: 'invented', kind: 'expression', issue: 'bad', suggestion: 'bad' }] })))

test('a corrupt record is preserved without hiding other reports', () => fixture(async ({ create, act, directory }) => {
  const { run } = await create()
  const other = '00000000-0000-4000-8000-000000000000.json', path = join(directory, 'rehearsals', other)
  writeFileSync(path, '{broken')
  assert.equal((await act('list')).runs[0].id, run.id); assert.equal(readFileSync(path, 'utf8'), '{broken')
  assert.deepEqual(readdirSync(join(directory, 'rehearsals')).filter(f => /\.tmp$|\.lock$/.test(f)), [])
}))

test('native adapter reuses DSH models, supplies no tools and rejects tool calls or incomplete output', async () => {
  let seen
  const llm = { listProviders: () => [{ id: route.provider }], listModels: async () => [{ id: route.model, name: 'Existing' }, { id: 'image', inputModalities: ['image'] }],
    resolveModelInfo: async () => ({ reasoning: { efforts: [{ id: 'off' }] } }),
    async *stream(options) { seen = options; yield { type: 'text-delta', index: 0, text: '{}' }; yield { type: 'finish', reason: { kind: 'stop' } } } }
  const native = nativeCoachingModel(llm)
  assert.equal((await native.routes()).length, 1)
  assert.equal(await native.generate(route, 'policy', 'data', new AbortController().signal), '{}')
  assert.deepEqual(seen.tools, []); assert.equal(seen.sessionId, undefined); assert.equal(seen.reasoningEffort, 'off'); assert.equal(seen.maxTokens, 6000)
  llm.stream = async function* () { yield { type: 'tool-call-delta' } }
  await assert.rejects(native.generate(route, 'policy', 'data', new AbortController().signal), /工具/)
  llm.stream = async function* () { yield { type: 'text-delta', index: 0, text: '{}' }; yield { type: 'finish', reason: { kind: 'max-tokens' } } }
  await assert.rejects(native.generate(route, 'policy', 'data', new AbortController().signal), /完整/)
})

test('native cancellation releases a hanging stream even if the provider ignores its signal', async () => {
  const controller = new AbortController()
  const llm = { listProviders: () => [{ id: route.provider }], stream: () => ({ [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}), return: () => Promise.resolve({ done: true }) }) }) }
  const pending = nativeCoachingModel(llm).generate(route, 'policy', 'data', controller.signal)
  controller.abort(); await assert.rejects(pending, /停止/)
})

test('duplicate steps and stop are guarded before spending a second call', () => fixture(async ({ create, act, calls }) => {
  const { run } = await create({ limit: 3 })
  const pending = act('step', { runId: run.id, confirmed: true })
  await assert.rejects(act('step', { runId: run.id, confirmed: true }), /正在处理|busy/)
  await act('stop', { runId: run.id }); await assert.rejects(pending, /停止/)
  const saved = (await act('get', { runId: run.id })).run
  assert.equal(saved.status, 'paused'); assert.equal(saved.usedCalls, 1); assert.equal(calls(), 1)
}, async (_data, signal) => await new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(signal.reason), { once: true }); if (signal.aborted) reject(signal.reason) })))

test('only selected slide text and explicit material enter the model input', () => fixture(async ({ created, create, act }) => {
  const slide = readDeckProject({ deckPath: created.jsonPath }).manifest.slides[1]
  const { run } = await create({ slideId: slide.id, material: '用户主动补充的说明' })
  await act('step', { runId: run.id, confirmed: true })
}, async (data, _signal, system) => {
  assert.equal(data.slides.length, 1); assert.equal(data.slides[0].title, '风险与下一步安排'); assert.equal(data.slides[0].image, undefined)
  assert.equal(data.material, '用户主动补充的说明'); assert.match(system, /untrusted DATA/); assert.match(system, /NO tools/)
  return { findings: [] }
}))

test('a report from another registered project cannot be read, deleted or applied', () => fixture(async ({ directory, create, wb }) => {
  const { run } = await create()
  const other = await buildDeckAsync({ title: '另一份工程', content: '# 不相干内容', outputDir: directory, fileName: 'other' }); await wb.remember(other, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  for (const operation of ['coach-get','coach-delete','coach-apply']) await assert.rejects(wb.action({ operation, id, expectedRevision: 0, runId: run.id, confirmed: true, selected: [], backup: [] }), /不属于/)
}))

test('append bounds reject overflow before committing artifacts', () => fixture(async ({ created }) => {
  const prior = readFileSync(created.jsonPath)
  await assert.rejects(editDeck({ deckPath: created.jsonPath, append: Array.from({ length: 6 }, () => ({ layout: 'bullets', title: 'extra', bullets: ['one'] })) }), /1-5/)
  assert.deepEqual(readFileSync(created.jsonPath), prior)
}))

test('model catalog cancellation cannot leave a hanging settings operation', async () => {
  const controller = new AbortController()
  const native = nativeCoachingModel({ listProviders: () => [{ id: route.provider }], listModels: () => new Promise(() => {}) })
  const pending = native.routes(controller.signal); controller.abort(); await assert.rejects(pending)
})

test('optional-mode errors keep Chinese and English responses separate', () => fixture(async ({ wb, id }) => {
  const response = await wb.fetch(new Request('http://local/api/dsh-ppt/workbench', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-ppt-action': '1' }, body: JSON.stringify({ operation: 'coach-create', id, expectedRevision: 0, mode: 'review', confirmed: false }) }))
  const value = await response.json(); assert.equal(response.status, 400)
  assert.match(value.message, /请选择|请主动选择/); assert.doesNotMatch(value.message, /Choose/)
  assert.match(value.messageEn, /Choose/); assert.doesNotMatch(value.messageEn, /[\u3400-\u9fff]/)
}))

test('persisted proposals cannot bypass the expression-only patch boundary', () => fixture(async ({ created, directory, create, act }) => {
  const { run } = await create(); const report = (await act('step', { runId: run.id, confirmed: true })).run
  const path = join(directory, 'rehearsals', run.id + '.json'), stored = JSON.parse(readFileSync(path, 'utf8'))
  stored.findings[0].patch = { image: { src: 'file:///outside/image.png' } }; writeFileSync(path, JSON.stringify(stored))
  const before = readFileSync(created.jsonPath)
  await assert.rejects(act('apply', { runId: run.id, confirmed: true, selected: [report.findings[0].id], backup: [] }), /不支持的字段/)
  assert.deepEqual(readFileSync(created.jsonPath), before)
}))

test('storyline coaching supports up to 8 findings, Action-Title/takeaway patches, and persona examiner prompts while blocking invented numbers', () => {
  let capturedSystem = ''
  return fixture(async ({ create, act }) => {
    const { run } = await create({ audience: 'investor' })
    const report = (await act('step', { runId: run.id, confirmed: true })).run
    assert.equal(report.findings.length, 8)
    assert.match(capturedSystem, /Investors \/ Pitch committee/)
    assert.equal(report.findings[0].kind, 'storyline')
    assert.ok(report.findings[0].patch)
    assert.equal(report.findings[7].patch, undefined, 'invented number in storyline patch must be stripped')
    const adopted = await act('apply', { runId: run.id, confirmed: true, selected: [report.findings[0].id], backup: [] })
    assert.equal(adopted.project.slides[0].title, '完成十二个项目驱动实际收入增长20%')
    assert.equal(adopted.project.slides[0].takeaway, '实际收入增长20%，交付节奏符合预期')
  }, async (data, _signal, system) => {
    capturedSystem = system
    const s0 = data.slides[0], s1 = data.slides[1]
    return {
      findings: [
        { slideId: s0.id, kind: 'storyline', question: '核心结论是什么？', answer: '收入增长20%。', issue: '标题为名词短语而非判断句', suggestion: '改为结论先行 Action Title 并补充底栏 takeaway', reference: 'slide:' + s0.id, quote: '完成十二个项目，实际收入增长20%', patch: { title: '完成十二个项目驱动实际收入增长20%', takeaway: '实际收入增长20%，交付节奏符合预期' } },
        ...Array.from({ length: 6 }, (_, idx) => ({ slideId: idx % 2 ? s1.id : s0.id, kind: 'expression', question: 'Q' + idx, answer: 'A' + idx, issue: '表达细化 ' + idx, suggestion: '精简措辞 ' + idx, reference: 'slide:' + s0.id, quote: s0.title })),
        { slideId: s1.id, kind: 'storyline', question: '有无虚构数字？', answer: '无。', issue: '测试数字守卫', suggestion: '不应通过补丁', reference: 'slide:' + s1.id, quote: s1.title, patch: { title: '虚构增长99%' } },
      ],
    }
  })
})

test('coaching forwards gantt columns, pro-diagram items, and harvey rows with grounded evidence', async () => {
  const directory = mkdtempSync(join(work, 'coaching-pro-'))
  try {
    let seenInput
    const created = await buildDeckAsync({
      title: '专业图示与蓝图预审',
      template: 'architecture-review',
      outputDir: directory,
      fileName: 'pro-coach',
      slides: [
        { layout: 'gantt', chrome: 'consulting-classic', title: '交付排期路线图', columns: ['Q1', 'Q2', 'Q3', 'Q4'], items: [{ tag: '核心', title: '完成多活网关切换', start: 0, span: 2 }] },
        { layout: 'harvey', title: '架构能力矩阵', rows: [['评估项', '新架构', '旧架构'], ['异地多活能力', '●', '○']] },
      ],
    })
    const wb = new PptWorkbench({
      catalogPath: join(directory, 'projects.jsonl'),
      coachingModel: {
        routes: async () => [route],
        generate: async (_r, _sys, input) => {
          seenInput = JSON.parse(input)
          const g = seenInput.slides[0]
          return JSON.stringify({
            findings: [{ slideId: g.id, kind: 'storyline', question: 'Q', answer: 'A', issue: '结论可更前置', suggestion: '补强结论句', reference: 'slide:' + g.id, quote: '完成多活网关切换', patch: { takeaway: 'Q2 前完成多活网关切换' } }],
          })
        },
      },
    })
    await wb.remember(created, {})
    const id = (await wb.action({ operation: 'list' })).projects[0].id
    const { run } = await wb.action({ operation: 'coach-create', id, expectedRevision: 0, confirmed: true, mode: 'review', ...route, difficulty: 'strict', limit: 1 })
    const res = (await wb.action({ operation: 'coach-step', id, expectedRevision: 0, runId: run.id, confirmed: true })).run
    assert.deepEqual(seenInput.slides[0].columns, ['Q1', 'Q2', 'Q3', 'Q4'])
    assert.deepEqual(seenInput.slides[1].rows[1], ['异地多活能力', '●', '○'])
    assert.equal(res.findings[0].grounded, true)
    assert.equal(res.findings[0].patch.takeaway, 'Q2 前完成多活网关切换')
    wb.coaching.dispose()
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('coaching audience personas route academic, technical, executive, and client system guides', async () => {
  for (const [audience, marker] of [
    ['academic', /Thesis defense panel/],
    ['technical', /Architecture \/ Engineering review/],
    ['executive', /Pyramid Principle/],
    ['client', /Enterprise client \/ buyer/],
  ]) {
    let sys = ''
    await fixture(async ({ create, act }) => {
      const { run } = await create({ audience })
      await act('step', { runId: run.id, confirmed: true })
      assert.match(sys, marker)
    }, async (_data, _sig, system) => { sys = system; return { findings: [] } })
  }
})

test('coaching apply preserves gantt columns, chrome, and milestone metadata on patched slide', async () => {
  const directory = mkdtempSync(join(work, 'coaching-preserve-'))
  try {
    const created = await buildDeckAsync({
      title: '保留甘特图元数据',
      outputDir: directory,
      fileName: 'gantt-coach',
      slides: [
        { layout: 'gantt', chrome: 'academic-minimal', title: '季度计划', columns: ['M1', 'M2', 'M3'], items: [{ tag: 'P1', title: '完成方案评审与发布门禁', start: 0, span: 2 }, { tag: 'GA', title: '上线节点', start: 2, span: 0, milestone: true }] },
      ],
    })
    const wb = new PptWorkbench({
      catalogPath: join(directory, 'projects.jsonl'),
      coachingModel: {
        routes: async () => [route],
        generate: async (_r, _s, input) => {
          const s0 = JSON.parse(input).slides[0]
          return JSON.stringify({
            findings: [{ slideId: s0.id, kind: 'expression', question: 'Q', answer: 'A', issue: '标题可更明确', suggestion: '优化标题', reference: 'slide:' + s0.id, quote: '完成方案评审与发布门禁', patch: { title: '三月前完成方案评审与发布门禁' } }],
          })
        },
      },
    })
    await wb.remember(created, {})
    const id = (await wb.action({ operation: 'list' })).projects[0].id
    const { run } = await wb.action({ operation: 'coach-create', id, expectedRevision: 0, confirmed: true, mode: 'review', ...route, difficulty: 'normal', limit: 1 })
    const reviewed = (await wb.action({ operation: 'coach-step', id, expectedRevision: 0, runId: run.id, confirmed: true })).run
    const adopted = await wb.action({ operation: 'coach-apply', id, expectedRevision: 0, runId: run.id, confirmed: true, selected: [reviewed.findings[0].id], backup: [] })
    const slide = adopted.project.slides[0]
    assert.equal(slide.title, '三月前完成方案评审与发布门禁')
    assert.equal(slide.chrome, 'academic-minimal')
    assert.deepEqual(slide.columns, ['M1', 'M2', 'M3'])
    assert.equal(slide.items[1].milestone, true)
    wb.coaching.dispose()
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
