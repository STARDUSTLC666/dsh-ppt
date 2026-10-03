import assert from 'node:assert/strict'

/** npm may accept an upload before the public version metadata becomes visible. Only retry reads. */
export async function waitForPublishedMetadata(readMetadata, expectedIntegrity, options = {}) {
  const now = options.now ?? Date.now
  const pause = options.pause ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const deadline = now() + (options.timeoutMs ?? 5 * 60 * 1000)
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
