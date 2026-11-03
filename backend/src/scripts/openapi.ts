import { writeFile } from 'fs/promises'
import { buildApp } from '../app'
import { loadConfig } from '../config'

const app = await buildApp(loadConfig())
await app.ready()
const spec = app.swagger()
await writeFile(new URL('../../openapi.json', import.meta.url), `${JSON.stringify(spec, null, 2)}\n`)
await app.close()
console.log('wrote backend/openapi.json')
