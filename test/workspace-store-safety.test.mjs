import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve, relative, sep, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { saveWorkspaceExemplar, loadWorkspaceExemplars } from '../skills/dsh-ppt/scripts/deck-exemplars.mjs'
import { saveWorkspaceTasteRecipe, loadWorkspaceTasteRecipes } from '../skills/dsh-ppt/scripts/deck-taste.mjs'

const root = fileURLToPath(new URL('../../.harness-validation/ppt-workspace-store/', import.meta.url))
const exemplar = { id: 'saved-example', name: 'Saved Example', slots: [{ layout: 'cover' }] }
const recipe = { id: 'saved-recipe', name: 'Saved Recipe', cardMaterial: 'solid' }
function fixture(t) {
  mkdirSync(root, { recursive: true })
  const directory = mkdtempSync(join(root, 'run-'))
  mkdirSync(join(directory, '.dsh-ppt'))
  t.after(() => {
    const child = relative(resolve(root), resolve(directory))
    assert.ok(child && child !== '..' && !child.startsWith('..' + sep) && !isAbsolute(child))
    rmSync(directory, { recursive: true, force: true })
  })
  return directory
}
for (const [name, save, load] of [
  ['exemplars.json', cwd => saveWorkspaceExemplar(cwd, exemplar), loadWorkspaceExemplars],
  ['taste-recipes.json', cwd => saveWorkspaceTasteRecipe(recipe, cwd), loadWorkspaceTasteRecipes],
]) test(`saving ${name} preserves a malformed original instead of resetting the library`, t => {
  const cwd = fixture(t), file = join(cwd, '.dsh-ppt', name), original = '{"existing-user-content":'
  writeFileSync(file, original)
  assert.deepEqual(load(cwd), {}, 'read-only listing remains tolerant of a damaged store')
  assert.throws(() => save(cwd), /保留|preserv|invalid|损坏|格式/i)
  assert.equal(readFileSync(file, 'utf8'), original)
})

test('saving both workspace libraries preserves other valid entries and remains readable', t => {
  const cwd = fixture(t)
  saveWorkspaceExemplar(cwd, { ...exemplar, id: 'first-example' })
  saveWorkspaceExemplar(cwd, exemplar)
  saveWorkspaceTasteRecipe({ ...recipe, id: 'first-recipe' }, cwd)
  saveWorkspaceTasteRecipe(recipe, cwd)
  assert.deepEqual(Object.keys(loadWorkspaceExemplars(cwd)).sort(), ['first-example', 'saved-example'])
  assert.deepEqual(Object.keys(loadWorkspaceTasteRecipes(cwd)).sort(), ['first-recipe', 'saved-recipe'])
})
