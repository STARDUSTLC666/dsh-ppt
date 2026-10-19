import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

function fixture() {
  const readers = []
  class FileReader {
    constructor() { readers.push(this); this.readyState = 0 }
    readAsDataURL(file) { this.file = file; this.readyState = 1 }
    abort() { this.aborted = true; this.readyState = 2; this.onabort?.() }
    complete(data) { this.readyState = 2; this.result = data; this.onload?.() }
    fail() { this.readyState = 2; this.onerror?.() }
  }
  let plugin
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    FileReader,
    window: { __ModuleLoader__: { load(entry) { plugin = entry.factory(() => ({ createElement() {} })) } } },
  })
  return { readers, loader: plugin.__internals.createImageLoader() }
}

test('switching slides cancels an in-flight image and ignores late completion and errors', () => {
  const { readers, loader } = fixture(), images = [], failures = []
  loader.read({ name: 'page-one.png' }, value => images.push(value), () => failures.push('error'))
  assert.equal(loader.pending, true)
  loader.cancel()
  assert.equal(readers[0].aborted, true)
  assert.equal(loader.pending, false)
  readers[0].complete('data:image/png;base64,old')
  readers[0].fail()
  assert.deepEqual(images, [])
  assert.deepEqual(failures, [])
})

test('selecting a newer image keeps the new read active when an old reader returns', () => {
  const { readers, loader } = fixture(), images = []
  loader.read({ name: 'old.png' }, value => images.push(value), assert.fail)
  loader.read({ name: 'new.png' }, value => images.push(value), assert.fail)
  readers[0].complete('old')
  assert.equal(loader.pending, true)
  readers[1].complete('new')
  assert.equal(loader.pending, false)
  assert.deepEqual(images, ['new'])
})

test('a failed image finishes the pending read and does not prevent retry', () => {
  const { readers, loader } = fixture(), images = [], failures = []
  loader.read({}, value => images.push(value), () => failures.push('unreadable'))
  readers[0].fail()
  assert.equal(loader.pending, false)
  assert.deepEqual(failures, ['unreadable'])
  loader.read({}, value => images.push(value), assert.fail)
  readers[1].complete('retry')
  assert.deepEqual(images, ['retry'])
})
