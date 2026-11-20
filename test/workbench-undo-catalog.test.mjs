import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { buildDeckAsync } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { PptWorkbench } from '../lib/workbench.js'

test('undo records the restored slide count and new revision for the project list across reloads', async t => {
  const root = resolve('.test-output'); mkdirSync(root, { recursive: true })
  const directory = mkdtempSync(join(root, 'undo-catalog-'))
  t.after(() => { assert.ok(directory.startsWith(root)); rmSync(directory, { recursive: true, force: true }) })
  const created = await buildDeckAsync({ title: '撤销索引', slides: [{ layout: 'cover', title: '原始封面' }, { layout: 'closing', title: '下一步' }], outputDir: directory })
  const catalogPath = join(directory, 'projects.jsonl')
  const wb = new PptWorkbench({ catalogPath })
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const appended = await wb.action({ operation: 'append', id, expectedRevision: 0, archetype: 'bullets' })
  assert.equal(appended.project.slides.length, 3)
  assert.equal((await wb.action({ operation: 'list' })).projects[0].revision, 1)
  const undone = await wb.action({ operation: 'undo', id, expectedRevision: 1 })
  assert.equal(undone.project.revision, 2)
  assert.equal(undone.project.slides.length, 2)
  const reopened = new PptWorkbench({ catalogPath })
  const listed = (await reopened.action({ operation: 'list' })).projects[0]
  assert.equal(listed.revision, undone.project.revision)
  assert.equal(listed.slideCount, undone.project.slides.length)
})
