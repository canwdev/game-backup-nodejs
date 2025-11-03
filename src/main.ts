import type { IConfigItem } from './types/config'
// import { existsSync } from 'node:fs'
import fsPromises from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import * as process from 'node:process'
import enquirer from 'enquirer'
import which from 'which'
// @ts-ignore-next-line
import configEditorHtml from '../docs/index.html' with { type: 'text' }
import { VERSION } from './types/version'
import { backupRestoreSingleItem, readConfigFile } from './utils/backup-restore'
import { opener } from './utils/opener'

// 检测部署环境必要命令
function checkEnv(commands: string[] = []) {
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

const basePath = process.cwd() // path.resolve(__dirname)
// OS Temp Path
const tempDirPath = os.tmpdir()
const configFilePath = path.join(basePath, 'config.json')

async function main() {
  let isExit = false
  while (!isExit) {
    console.clear()
    console.log(`<--===([ Game Backup CLI ])===-->
    存档备份还原工具 v${VERSION}
`)
    try {
      if (!checkEnv(['rclone'])) {
        await waitExit()
        return
      }

      // console.log(configFilePath);
      const config = await readConfigFile(configFilePath)

      if (!config) {
        console.error(`配置文件不存在，将创建一个空的 config.json 文件。\nConfig file does not exist. An empty config.json file will be created.`)
        // 创建空的 config.json 文件
        const demoContent: IConfigItem[] = [
          {
            name: 'StardewValley',
            srcPath: '%USERPROFILE%\\AppData\\Roaming\\StardewValley',
          },
          {
            name: 'pvzHE',
            srcPath: 'C:\\ProgramData\\PopCap Games\\PlantsVsZombies\\pvzHE\\yourdata',
          },
        ]
        // 询问是否创建示例配置文件
        const { answer }: { answer: boolean } = await enquirer.prompt({
          type: 'confirm',
          initial: true,
          name: 'answer',
          message: '是否创建示例配置文件？\nCreate Demo Config File?',
        })
        if (answer) {
          await fsPromises.writeFile(configFilePath, JSON.stringify(demoContent, null, 2), 'utf8')
          console.log(`已创建示例配置文件。\nDemo config file has been created.`)
          continue
        }
        else {
          isExit = true
          continue
        }
      }

      type FnType = 'backup' | 'restore' | 'configEditor' | 'exit' | 'reload'
      const { selectedFn }: { selectedFn: FnType } = await enquirer.prompt([{
        type: 'select',
        name: 'selectedFn',
        message: '选择功能 | Select Function',
        choices: [
          { message: '备份 | Backup', name: 'backup' },
          { message: '还原 | Restore', name: 'restore' },
          { message: '配置编辑器 | Config Editor', name: 'configEditor' },
          { message: '重新加载 | Reload', name: 'reload' },
          { message: '退出 | Exit', name: 'exit' },
        ],
      }])

      if (selectedFn === 'reload') {
        continue
      }

      if (selectedFn === 'configEditor') {
        await openConfigEditor()
        continue
      }

      if (selectedFn === 'exit') {
        isExit = true
        continue
      }
      const isRestore = selectedFn === 'restore' // 'backup'

      if (!config.length) {
        throw new Error('无可用配置项。\nNo available config items.')
      }

      const { backupTargets }: { backupTargets: string[] } = await enquirer.prompt([
        {
          type: 'multiselect',
          name: 'backupTargets',
          message: `${isRestore ? '还原' : '备份'}: 请选择项目(空格切换选中，按A切换全选，默认全部)
${isRestore ? 'Restore' : 'Backup'}: Select items(space to toggle, "A" to toggle all, default all)`,
          choices: config.map((item) => {
            return {
              message: `${item.name}`,
              name: item.name,
              disabled: item.disabled,
            }
          }),
        },
      ])

      let list: IConfigItem[] = []
      if (backupTargets.length === 0) {
        console.log('默认选中所有项目\nDefault select all items')
        list = config
      }
      else {
        const nameMap: Record<string, boolean> = {}
        backupTargets.forEach((item) => {
          nameMap[item] = true
        })
        list = config.filter((item) => {
          return nameMap[item.name]
        })
      }
      if (!list.length) {
        console.log('未选中任何项目\nNo items selected')
        continue
      }

      for (const item of list) {
        console.log('')
        try {
          await backupRestoreSingleItem(item, { basePath, isRestore })
        }
        catch (error: any) {
          console.error(`[${item.name}] Error: ${error}`)
        }
      }
    }
    catch (error) {
      console.error(`main: ${error}`)
    }
    console.log('')
    await waitExit()
  }
  process.exit(0)
}

main()

async function openConfigEditor() {
  const configEditorPath = path.join(tempDirPath, 'gbn-config-editor.html')

  console.log(`
配置编辑器已在浏览器中打开。请选择或拖拽配置文件到编辑器窗口。
Config Editor is opened in browser. Please select or drag the config file to the editor window.
配置文件路径 | Config File Path：${configFilePath}
`)
  await fsPromises.writeFile(configEditorPath, String(configEditorHtml), 'utf8')
  opener(configEditorPath)
  await enquirer.prompt({
    type: 'confirm',
    initial: true,
    name: 'answer',
    message: '修改后按回车继续 | Press Enter to Continue',
  })
}

export async function waitExit() {
  try {
    const { answer }: { answer: boolean } = await enquirer.prompt({
      type: 'confirm',
      initial: true,
      name: 'answer',
      message: '按回车键退出 | Press Enter to Exit',
    })
    if (answer) {
      process.exit(0)
    }
  }
  catch (error) {
    console.error(`waitExit: ${error}`)
    process.exit(1)
  }
}
