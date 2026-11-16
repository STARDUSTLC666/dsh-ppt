import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

export async function publishGitHubRelease({ name, version }, repository, commit) {
  assert.match(commit ?? '', /^[0-9a-f]{40}$/, 'Expected the tested Git commit')
  assert.ok(process.env.GH_TOKEN, 'GitHub Release requires contents: write')
  const tag = 'v' + version
  const encodedTag = encodeURIComponent(tag)
  const api = async (path, body) => {
    const method = body === undefined ? 'GET' : 'POST'
    const result = await fetch('https://api.github.com/repos/' + repository + '/' + path, {
      method, signal: AbortSignal.timeout(30000),
      headers: {
        accept: 'application/vnd.github+json',
        authorization: 'Bearer ' + process.env.GH_TOKEN,
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (method === 'GET' && result.status === 404) return null
    if (!result.ok) throw new Error(`GitHub ${method} ${path} failed (${result.status}): ${(await result.json()).message}`)
    return result.json()
  }

  const releasePath = 'releases/tags/' + encodedTag
  const existing = await api(releasePath)
  const tagPath = 'git/ref/tags/' + encodedTag
  const tagged = await api(tagPath)
  if (tagged) {
    const target = await api('commits/' + encodedTag)
    assert.equal(target?.sha, commit, tag + ' already points to a different commit')
  }
  if (existing) {
    assert.ok(tagged && !existing.draft, tag + ' already has a draft or lacks a tag')
    console.log('GitHub Release already published: ' + existing.html_url)
    return
  }

  const section = readFileSync('CHANGELOG.md', 'utf8').split(/^##[ \t]+/m).slice(1)
    .find(heading => heading.split(/\s/, 1)[0] === version)
  const notes = section?.split(/\r?\n/).slice(1).join('\n').trim()
  assert.ok(notes, 'No changelog section for ' + version)
  if (!tagged) await api('git/refs', { ref: 'refs/tags/' + tag, sha: commit })
  const prerelease = version.includes('-')
  await api('releases', {
    tag_name: tag,
    target_commitish: commit,
    name: name + ' ' + version,
    body: '## 更新内容\n\n' + notes + '\n\n[npm 发布包](https://www.npmjs.com/package/' + name + '/v/' + version + ')',
    prerelease,
    make_latest: prerelease ? 'false' : 'legacy',
  })
  const visible = await api(releasePath)
  assert.ok(visible && !visible.draft, 'GitHub Release is not visible')
  const target = await api('commits/' + encodedTag)
  assert.equal(target?.sha, commit, tag + ' must point to the tested commit')
  console.log('GitHub Release published: ' + visible.html_url)
}
