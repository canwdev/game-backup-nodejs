import type { IConfigItem } from '../types/config'
import fsPromises from 'node:fs/promises'
import * as process from 'node:process'
import enquirer from 'enquirer'
import { VERSION } from '../types/version'
import { backupRestoreItem, readConfigFile } from '../utils/backup-restore'
import { checkEnv, openConfigEditor } from './non-interactive'

const basePath = process.cwd()

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

export async function runInteractiveLoop(configPath: string) {
  let isExit = false
  while (!isExit) {
    console.clear()
    console.log(`<-- 存档备份还原工具 v${VERSION} | Backup Restore Utility -->`)
    try {
      if (!checkEnv(['rclone'])) {
        await waitExit()
        return
      }

      const config = await readConfigFile(configPath)

      if (!config) {
        console.error(`\n配置文件不存在。Config file does not exist.`)
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
        const { answer }: { answer: boolean } = await enquirer.prompt({
          type: 'confirm',
          initial: true,
          name: 'answer',
          message: `是否创建示例配置文件？Create Demo Config File? \n${configPath}`,
        })
        if (answer) {
          await fsPromises.writeFile(configPath, JSON.stringify(demoContent, null, 2), 'utf8')
          console.log(`已创建示例配置文件。\nDemo config file has been created.`)
          continue
        }
        else {
          isExit = true
          continue
        }
      }
      console.log(`Config Loaded: ${configPath}\n`)

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
        await openConfigEditor({ configFilePath: configPath })
        continue
      }

      if (selectedFn === 'exit') {
        isExit = true
        continue
      }
      const isRestore = selectedFn === 'restore'

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
          await backupRestoreItem(item, { basePath, isRestore })
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
