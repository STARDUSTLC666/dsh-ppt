import { buildClient } from '@stardustlc/dsh-updates/build'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
buildClient(root, 'lib/client.js')
