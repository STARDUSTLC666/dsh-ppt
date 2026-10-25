import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const normalize = value => value.replace(/\r\n/g, '\n')
const kit = normalize(readFileSync(join(root, 'templates/workbench-ui.js'), 'utf8'))
let client = normalize(readFileSync(join(root, 'templates/client.js'), 'utf8'))
if (client.includes('__ENGINE__')) {
  const name = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name
  if (!['dsh-hyperframes', 'dsh-remotion'].includes(name)) throw new Error('Unknown media engine package')
  client = client.replaceAll('__ENGINE__', name.slice(4))
}
const directory = join(root, 'templates/panels')
const parts = existsSync(directory) ? readdirSync(directory).filter(name => name.endsWith('.js')).sort().map(name => normalize(readFileSync(join(directory, name), 'utf8'))).join('\n') : ''
const marker = 'const W = createWorkbenchUI(React);'
if (!client.includes(marker)) throw new Error('Workbench source marker missing')
client = client.replace(marker, marker + '\n' + parts)
mkdirSync(join(root, 'lib'), { recursive: true })
writeFileSync(join(root, 'lib/client.js'), '// Generated from templates/client.js, templates/panels/ and templates/workbench-ui.js. Edit the sources.\n(function () {\n' + kit + '\n' + client + '\n})();\n')
