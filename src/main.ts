import * as process from 'node:process'
import { runInteractiveLoop } from './cli/interactive'
import {
  openConfigEditor,
  parseCliArgs,
  printHelp,
  runBatch,
} from './cli/non-interactive'
import { VERSION } from './types/version'

export { waitExit } from './cli/interactive'

async function entry() {
  const parsed = parseCliArgs(process.argv.slice(2))

  if (parsed.type === 'help') {
    printHelp()
    process.exit(0)
  }
  if (parsed.type === 'version') {
    console.log(VERSION)
    process.exit(0)
  }

  if (parsed.command === 'backup' || parsed.command === 'restore') {
    await runBatch(parsed.command === 'restore', parsed.configPath, parsed.names)
    return
  }
  if (parsed.command === 'editor') {
    await openConfigEditor({ skipPrompt: true, configFilePath: parsed.configPath })
    process.exit(0)
  }

  await runInteractiveLoop(parsed.configPath)
}

entry().catch((err) => {
  console.error(err)
  process.exit(1)
})
