import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

/** npm may accept an upload before the public version metadata becomes visible. Only retry reads. */
export async function waitForPublishedMetadata(readMetadata, expectedIntegrity, options = {}) {
  const now = options.now ?? Date.now
  const pause = options.pause ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const deadline = now() + (options.timeoutMs ?? 10 * 60 * 1000)
  const interval = options.intervalMs ?? 10000
  for (;;) {
    const published = await readMetadata()
    if (published !== null) {
      assert.equal(published.dist?.integrity, expectedIntegrity, 'Published artifact integrity mismatch')
      return published
    }
    const remaining = deadline - now()
    if (remaining <= 0) throw new Error('npm accepted the upload, but registry verification timed out. Re-run verification for this version; do not publish a replacement version merely for propagation delay.')
    await pause(Math.min(interval, remaining))
  }
}

/** Verify the bytes served by the public URL npm install will use. Retry propagation, never upload. */
export async function waitForPublishedTarball(readMetadata, expectedIntegrity, options = {}) {
  const fetchTarball = options.fetchTarball ?? fetch
  return waitForPublishedMetadata(async () => {
    const published = await readMetadata()
    if (published === null) return null
    assert.equal(published.dist?.integrity, expectedIntegrity, 'Published metadata integrity mismatch')
    const url = new URL(published.dist.tarball)
    assert.ok(url.origin === 'https://registry.npmjs.org' && !url.username && !url.password, 'Unexpected public tarball URL')
    const response = await fetchTarball(url, {
      redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { 'cache-control': 'no-cache' },
    })
    if (response.status === 404) {
      await response.body?.cancel()
      return null
    }
    if (!response.ok || response.body === null) {
      await response.body?.cancel()
      throw new Error('Public tarball download failed: HTTP ' + response.status)
    }
    const hash = createHash('sha512')
    for await (const chunk of response.body) hash.update(chunk)
    assert.equal('sha512-' + hash.digest('base64'), expectedIntegrity, 'Public tarball integrity mismatch')
    return published
  }, expectedIntegrity, options)
}
