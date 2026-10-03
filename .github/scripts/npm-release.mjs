import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { waitForPublishedMetadata } from './npm-registry-verification.mjs'

const config = JSON.parse(readFileSync('.github/npm-release.json', 'utf8'))
const registry = 'https://registry.npmjs.org'
const dist = resolve('.release')
function checkInput() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.equal(process.env.GITHUB_REPOSITORY, config.repository, 'Unexpected repository')
  assert.equal(process.env.GITHUB_REF, 'refs/heads/' + config.branch, 'Use the default release branch')
  assert.equal(pkg.name, config.package, 'Unexpected package name')
  assert.equal(pkg.version, process.env.RELEASE_VERSION, 'Input version must match package.json')
  assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
  const repository = (pkg.repository?.url || '').replace(/^git\+/, '').replace(/\.git$/, '')
  assert.equal(repository, 'https://github.com/' + config.repository, 'Package repository URL does not match')
  return pkg
}
function integrity(path) { return 'sha512-' + createHash('sha512').update(readFileSync(path)).digest('base64') }
function verifyArtifact() {
  const pkg = checkInput()
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'))
  assert.equal(manifest.repository, config.repository)
  assert.equal(manifest.commit, process.env.GITHUB_SHA)
  assert.equal(manifest.name, pkg.name); assert.equal(manifest.version, pkg.version)
  assert.match(manifest.filename, /^[a-z0-9][a-z0-9._-]*\.tgz$/)
  const file = join(dist, manifest.filename)
  assert.ok(statSync(file).isFile())
  assert.equal(integrity(file), manifest.integrity, 'Artifact digest changed')
  return { file, manifest }
}
async function verifyOidc() {
  checkInput()
  assert.ok(process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'GitHub OIDC permission missing')
  const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL)
  url.searchParams.set('audience', 'npm:registry.npmjs.org')
  const response = await fetch(url, { headers: { accept: 'application/json', authorization: 'Bearer ' + process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN }, signal: AbortSignal.timeout(30000) })
  assert.ok(response.ok, 'GitHub OIDC request failed: HTTP ' + response.status)
  const oidc = await response.json()
  assert.equal(typeof oidc.value, 'string', 'GitHub OIDC token missing')
  // Same audience and exchange endpoint as npm CLI. Never log or persist credentials.
  const escaped = config.package.replace('/', '%2f')
  const exchanged = await fetch(registry + '/-/npm/v1/oidc/token/exchange/package/' + escaped, { method: 'POST', headers: { authorization: 'Bearer ' + oidc.value }, signal: AbortSignal.timeout(30000) })
  assert.ok(exchanged.ok, 'npm trusted publisher exchange failed: HTTP ' + exchanged.status)
  const result = await exchanged.json()
  assert.equal(typeof result.token, 'string', 'npm publish credential missing')
  console.log('Verified npm OIDC trust for ' + config.package)
}
async function metadata(version) {
  const url = registry + '/' + config.package.replace('/', '%2f') + '/' + version + '?verify=' + Date.now()
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(30000) })
  if (response.status === 404) return null
  assert.ok(response.ok, 'Registry verification failed: HTTP ' + response.status)
  return response.json()
}
async function main() {
  const command = process.argv[2]
  if (command === 'check-input') { checkInput(); console.log('Release inputs verified'); return }
  if (command === 'pack') {
    const pkg = checkInput(); assert.ok(!existsSync(dist), 'Release directory already exists')
    mkdirSync(dist)
    const output = execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', dist], { encoding: 'utf8' })
    const [pack] = JSON.parse(output)
    assert.equal(pack.name, pkg.name); assert.equal(pack.version, pkg.version)
    assert.match(pack.filename, /^[a-z0-9][a-z0-9._-]*\.tgz$/)
    assert.equal(pack.integrity, integrity(join(dist, pack.filename)))
    writeFileSync(join(dist, 'manifest.json'), JSON.stringify({ name: pkg.name, version: pkg.version, filename: pack.filename, integrity: pack.integrity, repository: config.repository, commit: process.env.GITHUB_SHA }, null, 2))
    verifyArtifact(); console.log('Packaged verified release artifact'); return
  }
  if (command === 'verify-artifact') { verifyArtifact(); console.log('Release artifact verified'); return }
  if (command === 'verify-oidc') { await verifyOidc(); return }
  if (command === 'publish') {
    const { file, manifest } = verifyArtifact()
    const existing = await metadata(manifest.version)
    if (existing !== null) {
      assert.equal(existing.dist?.integrity, manifest.integrity, 'Version already exists with different contents; use a new version')
      console.log('Identical version is already published'); return
    }
    execFileSync('npm', ['publish', file, '--ignore-scripts', '--access', 'public', '--registry', registry, '--provenance'], { stdio: 'inherit' })
    await waitForPublishedMetadata(() => metadata(manifest.version), manifest.integrity)
    console.log('Published registry integrity verified'); return
  }
  throw new Error('Unknown release command')
}
await main()
