import fsPromises from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import * as process from 'node:process'
import enquirer from 'enquirer'
import which from 'which'
// @ts-ignore-next-line
import configEditorHtml from '../../docs/index.html' with { type: 'text' }
import { VERSION } from '../types/version'
import { backupRestoreItem, readConfigFile } from '../utils/backup-restore'
import { opener } from '../utils/opener'

export function checkEnv(commands: string[] = []) {
  if (!commands.length) {
    return true
  }

  let cmdNotFound = ''
  commands.forEach((command) => {
    try {
      which.sync(command)
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (e) {
      cmdNotFound = command
    }
  })

  if (cmdNotFound) {
    console.error(`Error：运行此脚本需要的命令 '${cmdNotFound}' 未找到，请安装这些软件包，然后重试。`)
    return false
  }
  return true
}

const basePath = process.cwd()
const tempDirPath = os.tmpdir()
export const defaultConfigPath = path.join(basePath, 'backup-config.json')

export function printHelp() {
  console.log(`存档备份还原工具 | Backup Restore Utility v${VERSION}

用法 Usage:
  game-backup-cli [选项]                  交互式菜单（默认）
  game-backup-cli backup [选项]           非交互：按配置备份
  game-backup-cli restore [选项]          非交互：按配置还原
  game-backup-cli editor [选项]           非交互：在浏览器打开内置配置编辑器

选项 Options:
  -h, --help              显示此帮助
  -V, --version           显示版本号
  -c, --config <路径>     配置文件路径（默认: ./backup-config.json）
  --names <a,b,c>         仅处理列出的配置项名称（逗号分隔）；默认全部未禁用项

示例 Examples:
  game-backup-cli
  game-backup-cli backup -c ./my-backup-config.json
  game-backup-cli restore --names StardewValley,pvzHE
`)
}

export type ParseResult
  = | { type: 'help' }
    | { type: 'version' }
    | { type: 'run', configPath: string, names: string[], command?: 'backup' | 'restore' | 'editor' }

export function parseCliArgs(argv: string[]): ParseResult {
  const positionals: string[] = []
  let configPath = defaultConfigPath
  const names: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '-h' || a === '--help')
      return { type: 'help' }
    if (a === '-V' || a === '--version')
      return { type: 'version' }
    if (a === '-c' || a === '--config') {
      const v = argv[++i]
      if (!v) {
        console.error('错误：--config 需要路径参数。\nError: --config requires a path.')
        process.exit(1)
      }
      configPath = path.resolve(basePath, v)
      continue
    }
    if (a === '--names') {
      const v = argv[++i] ?? ''
      names.push(...v.split(',').map(s => s.trim()).filter(Boolean))
      continue
    }
    if (a.startsWith('-')) {
      console.error(`未知选项 Unknown option: ${a}`)
      printHelp()
      process.exit(1)
    }
    positionals.push(a)
  }

  if (positionals.length > 1) {
    console.error(`多余参数 Unexpected arguments: ${positionals.slice(1).join(' ')}`)
    printHelp()
    process.exit(1)
  }

  const raw = positionals[0]
  if (!raw)
    return { type: 'run', configPath, names }

  if (raw === 'backup' || raw === 'restore' || raw === 'editor')
    return { type: 'run', configPath, names, command: raw }

  console.error(`未知命令 Unknown command: ${raw}`)
  printHelp()
  process.exit(1)
}

export async function runBatch(isRestore: boolean, configPath: string, filterNames: string[]) {
  if (!checkEnv(['rclone']))
    process.exit(1)

  const config = await readConfigFile(configPath)
  if (!config) {
    console.error(`配置文件不存在。\nConfig file does not exist.\n${configPath}`)
    process.exit(1)
  }

  let list = config.filter(item => !item.disabled)
  if (filterNames.length) {
    const set = new Set(filterNames)
    const missing = filterNames.filter(n => !config.some(c => c.name === n))
    if (missing.length)
      console.warn(`警告：配置中未找到的名称（将跳过）\nWarning: unknown names: ${missing.join(', ')}`)
    list = list.filter(item => set.has(item.name))
  }

  if (!list.length) {
    console.error('没有可执行的项目。\nNo items to process.')
    process.exit(1)
  }

  let failed = false
  for (const item of list) {
    console.log('')
    try {
      await backupRestoreItem(item, { basePath, isRestore })
    }
    catch (error: any) {
      failed = true
      console.error(`[${item.name}] Error: ${error}`)
    }
  }
  process.exit(failed ? 1 : 0)
}

export async function openConfigEditor(opts?: { skipPrompt?: boolean, configFilePath?: string }) {
  const cfgPath = opts?.configFilePath ?? defaultConfigPath
  const configEditorPath = path.join(tempDirPath, 'bru-config-editor.html')

  console.log(`
配置编辑器已在浏览器中打开。请选择或拖拽配置文件到编辑器窗口。
Config Editor is opened in browser. Please select or drag the config file to the editor window.
${cfgPath}
`)
  await fsPromises.writeFile(configEditorPath, String(configEditorHtml), 'utf8')
  opener(configEditorPath)
  if (!opts?.skipPrompt) {
    await enquirer.prompt({
      type: 'confirm',
      initial: true,
      name: 'answer',
      message: '修改后按回车继续 | Press Enter to Continue',
    })
  }
}
