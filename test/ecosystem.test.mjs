import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as engine from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import {
  attachCitationsToDeck,
  buildRemotionBundleFiles,
  computePaceBudgetFallback,
  exportRemotionBundle,
  loadCitationEntriesFromFile,
  normalizeDoi,
  parseBibtexEntries,
  renderOnePagerHtmlFallback,
} from '../lib/ecosystem.js'

async function withTmpDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-ecosystem-'))
  try {
    return await fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('parseBibtexEntries and loadCitationEntriesFromFile handle .bib, .json (dsh-cite v1), and .jsonl', () => withTmpDir(async dir => {
  const bibText = `
@article{lecun2015deep,
  author = {LeCun, Yann and Bengio, Yoshua and Hinton, Geoffrey},
  title = {Deep Learning},
  journal = {Nature},
  year = {2015},
  volume = {521},
  number = {7553},
  pages = {436--444},
  doi = {10.1038/nature14539}
}
@inproceedings{vaswani2017attention,
  author = {Ashish Vaswani and Noam Shazeer},
  title = {{Attention Is All You Need}},
  booktitle = {NeurIPS},
  year = {2017},
  doi = {https://doi.org/10.5555/3295222.3295349}
}
`
  const parsedBib = parseBibtexEntries(bibText)
  assert.equal(parsedBib.length, 2)
  assert.equal(parsedBib[0].bibKey, 'lecun2015deep')
  assert.equal(parsedBib[0].authors.length, 3)
  assert.equal(parsedBib[0].doi, '10.1038/nature14539')
  assert.equal(parsedBib[1].title, 'Attention Is All You Need')
  assert.equal(parsedBib[1].doi, '10.5555/3295222.3295349')

  const bibPath = join(dir, 'refs.bib')
  writeFileSync(bibPath, bibText, 'utf8')
  assert.equal(loadCitationEntriesFromFile(bibPath).length, 2)

  // Exact dsh-cite CitationLibrary v1 schema
  const citeLib = {
    version: 1,
    revision: 3,
    sources: [{ id: '11111111-1111-4111-8111-111111111111', kind: 'doi', text: '10.1038/nature14539', label: 'DOI', createdAt: '2026-01-01T00:00:00Z' }],
    entries: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        bibKey: 'lecun2015deep',
        sourceIds: ['11111111-1111-4111-8111-111111111111'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        work: {
          doi: '10.1038/nature14539',
          type: 'journal-article',
          title: 'Deep learning',
          authors: [
            { given: 'Yann', family: 'LeCun', name: '' },
            { given: 'Yoshua', family: 'Bengio', name: '' },
            { given: 'Geoffrey', family: 'Hinton', name: '' },
          ],
          containerTitle: 'Nature',
          publisher: 'Springer Nature',
          year: 2015,
          volume: '521',
          issue: '7553',
          page: '436-444',
          url: 'https://doi.org/10.1038/nature14539',
        },
      },
    ],
  }
  const jsonPath = join(dir, 'library.json')
  writeFileSync(jsonPath, JSON.stringify(citeLib), 'utf8')
  const loadedJson = loadCitationEntriesFromFile(jsonPath)
  assert.equal(loadedJson.length, 1)
  assert.equal(loadedJson[0].bibKey, 'lecun2015deep')
  assert.equal(loadedJson[0].year, 2015)

  const jsonlPath = join(dir, 'refs.jsonl')
  writeFileSync(jsonlPath, JSON.stringify(citeLib.entries[0]) + '\nnot-json\n', 'utf8')
  assert.equal(loadCitationEntriesFromFile(jsonlPath).length, 1)
  assert.equal(normalizeDoi('https://dx.doi.org/10.1038/NATURE14539'), '10.1038/nature14539')
}))

test('attachCitationsToDeck auto-discovers .dsh-cite store, formats slide.source footers, and appends/updates References slide with zero invented DOIs', () => withTmpDir(async dir => {
  const citeDir = join(dir, '.dsh-cite')
  mkdirSync(citeDir, { recursive: true })
  writeFileSync(join(citeDir, 'library.json'), JSON.stringify({
    version: 1,
    revision: 1,
    sources: [],
    entries: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        bibKey: 'he2016resnet',
        sourceIds: ['11111111-1111-4111-8111-111111111111'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        work: {
          doi: '10.1109/cvpr.2016.90',
          type: 'proceedings-article',
          title: 'Deep Residual Learning for Image Recognition',
          authors: [{ given: 'Kaiming', family: 'He', name: '' }, { given: 'Xiangyu', family: 'Zhang', name: '' }],
          containerTitle: 'CVPR',
          year: 2016,
          page: '770-778',
        },
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        bibKey: 'nodoi2025local',
        sourceIds: ['11111111-1111-4111-8111-111111111111'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        work: {
          doi: '',
          type: 'report',
          title: 'Internal Benchmark Report',
          authors: [{ given: '', family: 'Platform Team', name: 'Platform Team' }],
          containerTitle: 'Tech Memo',
          year: 2025,
        },
      },
    ],
  }), 'utf8')

  const created = await engine.buildDeckAsync({
    title: 'Vision Backbone Study',
    slides: [
      { layout: 'cover', title: 'Vision Backbone Study', subtitle: 'Empirical Review' },
      { layout: 'bullets', title: 'Residual Connections', bullets: ['Skip connections stabilize deep nets [@he2016resnet].', 'Internal baseline [@nodoi2025local] and missing [@unknown2099].'] },
      { layout: 'kpi', title: 'External Verification', items: [{ value: '99.1%', title: 'Reproduced' }], notes: 'See [doi:10.1000/verified-only] for raw benchmark.' },
    ],
    outputDir: dir,
  })

  const res = await attachCitationsToDeck({
    deckPath: created.jsonPath,
    cwd: dir,
    style: 'gb-t-7714',
    engine,
  })
  assert.equal(res.ok, true)
  assert.equal(res.matchedCount, 3)
  assert.deepEqual(res.citedKeys, ['he2016resnet', 'nodoi2025local', '10.1000/verified-only'])
  assert.deepEqual(res.missingKeys, ['unknown2099'])
  assert.equal(res.referencesSlideIndex, 4)
  assert.match(res.sourcePath, /library\.json$/)

  const manifest1 = engine.readDeckProject({ deckPath: created.jsonPath }).manifest
  assert.match(manifest1.slides[1].source, /\[1\] He & Zhang, CVPR 2016 · doi:10\.1109\/cvpr\.2016\.90/)
  assert.match(manifest1.slides[1].source, /\[2\] Platform Team, Tech Memo 2025/)
  assert.doesNotMatch(manifest1.slides[1].source, /\[2\].*doi:/)
  assert.equal(manifest1.slides[2].source, '[3] doi:10.1000/verified-only')
  assert.equal(manifest1.slides.length, 4)
  assert.equal(manifest1.slides[3].kicker, 'REFERENCES')
  assert.equal(manifest1.slides[3].bullets.length, 3)
  assert.equal(manifest1.slides[3].bullets[2], '[3] doi:10.1000/verified-only')

  // Re-running updates the existing References slide in place without duplicating slides or footers
  const res2 = await attachCitationsToDeck({
    deckPath: created.jsonPath,
    cwd: dir,
    style: 'apa',
    engine,
  })
  assert.equal(res2.referencesSlideIndex, 4)
  const manifest2 = engine.readDeckProject({ deckPath: created.jsonPath }).manifest
  assert.equal(manifest2.slides.length, 4)
  assert.match(manifest2.slides[3].bullets[0], /\(2016\)\. Deep Residual Learning/)
}))

test('exportRemotionBundle & buildRemotionBundleFiles emit ready-to-render 30fps TSX composition with KPI count-up and synced captions', () => withTmpDir(async dir => {
  const created = await engine.buildDeckAsync({
    title: 'Quarterly Video Brief',
    theme: 'consulting',
    slides: [
      { layout: 'cover', title: 'Quarterly Video Brief', subtitle: '2026 Q4', notes: 'Welcome to the Q4 review. Let us walk through the highlights.' },
      { layout: 'kpi', title: 'ARR & Margin Surge', items: [{ tag: 'ARR', value: '98.5%', title: 'SLA Attainment' }, { tag: 'GROWTH', value: '$18.5M', title: 'New Bookings' }], notes: 'ARR attainment reached 98.5 percent! New bookings hit 18.5 million.' },
      { layout: 'chart', title: 'Quarterly Revenue', chart: { kind: 'column', categories: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'Rev', values: [12, 18, 25, 34] }] }, notes: 'Revenue climbed smoothly every quarter.' },
    ],
    outputDir: dir,
  })

  const manifest = engine.readDeckProject({ deckPath: created.jsonPath }).manifest
  const built = buildRemotionBundleFiles(manifest, { fps: 30, format: 'portrait' })
  assert.equal(built.fps, 30)
  assert.equal(built.storyboard.width, 1080)
  assert.equal(built.storyboard.height, 1920)
  assert.ok(built.files['remotion-storyboard.json'])
  assert.ok(built.files['src/DeckVideo.tsx'])
  assert.ok(built.files['src/slides-data.json'])
  assert.ok(built.files['src/index.ts'])
  assert.ok(built.files['package.json'])
  assert.ok(built.files['README.md'])

  const slidesJson = JSON.parse(built.files['src/slides-data.json'])
  assert.equal(slidesJson.slides.length, 3)
  assert.equal(slidesJson.slides[1].items[0].numericValue, 98.5)
  assert.equal(slidesJson.slides[1].items[0].suffix, '%')
  assert.equal(slidesJson.slides[1].items[1].prefix, '$')
  assert.equal(slidesJson.slides[1].items[1].numericValue, 18.5)
  assert.equal(slidesJson.slides[1].captions.length, 2)
  assert.equal(slidesJson.slides[2].chartBars.length, 4)

  const tsx = built.files['src/DeckVideo.tsx']
  assert.match(tsx, /spring\(/)
  assert.match(tsx, /interpolate\(/)
  assert.match(tsx, /slidesData\.themeTokens/)
  assert.match(tsx, /activeCaption/)

  const exported1 = await exportRemotionBundle({ deckPath: created.jsonPath, cwd: dir, engine })
  assert.equal(exported1.ok, true)
  assert.equal(exported1.fps, 30)
  assert.ok(existsSync(exported1.storyboardPath))
  assert.ok(existsSync(join(exported1.outputDir, 'src', 'DeckVideo.tsx')))

  const exported2 = await exportRemotionBundle({ deckPath: created.jsonPath, cwd: dir, overwrite: false, engine })
  assert.notEqual(exported2.outputDir, exported1.outputDir)
  assert.match(exported2.outputDir, /-remotion-2$/)
}))

test('computePaceBudgetFallback and renderOnePagerHtmlFallback work deterministically for tight vs balanced budgets', () => {
  const sampleManifest = {
    title: 'Pace & One-Pager Check',
    language: 'zh',
    targetMinutes: 1,
    brand: { primaryColor: '#0057B8' },
    slides: [
      { layout: 'cover', title: '封面', notes: '欢迎参加今天的评审。' },
      { layout: 'chart', title: '核心趋势', bullets: ['增长 42%'], notes: '这一页包含大量背景说明与数据细节，我们需要逐条展开说明每个季度的增长驱动力以及各个大区的贡献差异。'.repeat(4) },
    ],
  }
  const pace = computePaceBudgetFallback(sampleManifest)
  assert.equal(pace.slideCount, 2)
  assert.equal(pace.targetMinutes, 1)
  assert.equal(pace.overBudget, true)
  assert.ok(pace.overrunSlides.includes(2))

  const html = renderOnePagerHtmlFallback(sampleManifest, 'zh')
  assert.match(html, /<!doctype html>/)
  assert.match(html, /切换长图战报/)
  assert.match(html, /@media print/)
})

test('dsh-cite avoids double periods on et al., abbreviates long venues with acronyms, and keeps 3+ citation footers compact', () => withTmpDir(async dir => {
  const bib = `
@inproceedings{a1,
  author = {Alpha, A. and Beta, B. and Gamma, C. and Delta, D.},
  title = {Paper One},
  booktitle = {Advances in Neural Information Processing Systems (NeurIPS)},
  year = {2024},
  doi = {10.5555/1111.2222}
}
@inproceedings{a2,
  author = {Epsilon, E. and Zeta, Z. and Eta, H. and Theta, T.},
  title = {Paper Two},
  booktitle = {International Conference on Machine Learning (ICML)},
  year = {2024},
  doi = {10.5555/3333.4444}
}
@inproceedings{a3,
  author = {Iota, I. and Kappa, K. and Lambda, L. and Mu, M.},
  title = {Paper Three},
  booktitle = {Computer Vision and Pattern Recognition (CVPR)},
  year = {2025},
  doi = {10.1109/cvpr.2025.9999}
}
`
  const created = await engine.buildDeckAsync({
    title: 'Compact Footer Test',
    slides: [
      { layout: 'cover', title: 'Compact Footer Test' },
      { layout: 'bullets', title: 'Three Citations', bullets: ['Combined findings [@a1; @a2; @a3].'] },
    ],
    outputDir: dir,
  })
  const res = await attachCitationsToDeck({
    deckPath: created.jsonPath,
    bibtex: bib,
    style: 'gb-t-7714',
    cwd: dir,
    engine,
  })
  assert.equal(res.matchedCount, 3)
  const manifest = engine.readDeckProject({ deckPath: created.jsonPath }).manifest
  const footer = manifest.slides[1].source
  assert.match(footer, /NeurIPS 2024/)
  assert.match(footer, /ICML 2024/)
  assert.match(footer, /CVPR 2025/)
  assert.doesNotMatch(footer, /doi:10\./, '3+ long citations omit DOIs in slide footer to stay single-line')
  for (const refLine of manifest.slides[2].bullets) {
    assert.doesNotMatch(refLine, /et al\.\./, 'no double period after et al.')
    assert.match(refLine, /DOI: 10\./, 'full DOIs remain on References slide')
  }
}))
