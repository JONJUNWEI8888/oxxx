import { buildApp } from './app'
import { loadConfig, startupWarnings } from './config'

const config = loadConfig()
const app = await buildApp(config)
for (const warning of startupWarnings(config)) {
  app.log.warn(warning)
  console.warn(warning)
}

try {
  await app.listen({ port: config.PORT, host: config.HOST })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
