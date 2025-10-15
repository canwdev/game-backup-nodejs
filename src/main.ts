import type { IConfigItem } from './types/config'
import { existsSync } from 'node:fs'
import fsPromises from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import * as process from 'node:process'
import enquirer from 'enquirer'
import which from 'which'
// @ts-ignore-next-line
import configEditorHtml from './config-editor.html' with { type: 'text' }
import { backupRestoreSingleItem, readConfigFile, waitExit } from './utils/backup-restore'
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
  console.log(`<--===([ Game Backup CLI ])===-->
         存档备份还原工具
`)
  try {
    if (!checkEnv(['rclone'])) {
      waitExit()
      return
    }

    // console.log(configFilePath);
    const config = await readConfigFile(configFilePath)

    if (!config) {
      console.error(`配置文件不存在，将创建一个空的 config.json 文件。`)
      // 创建空的 config.json 文件
      const demoContent: IConfigItem[] = [
        {
          name: 'StardewValley',
          srcPath: '%USERPROFILE%\\AppData\\Roaming\\StardewValley',
        },
        {
          // 名称
          name: 'pvzHE',
          // 源路径，绝对路径
          srcPath: 'C:\\ProgramData\\PopCap Games\\PlantsVsZombies\\pvzHE\\yourdata',
        },
      ]
      // 询问是否创建示例配置文件
      const answer = await enquirer.prompt({
        type: 'confirm',
        initial: true,
        name: 'createDemo',
        message: '是否创建示例配置文件？',
      })
      if (answer) {
        await fsPromises.writeFile(configFilePath, JSON.stringify(demoContent, null, 2), 'utf8')
        console.log(`已创建示例配置文件。请修改该文件，然后重新运行本程序。`)
        await openConfigEditor()
      }
      return
    }

    type FnType = 'backup' | 'restore' | 'configEditor' | 'exit'
    const { selectedFn }: { selectedFn: FnType } = await enquirer.prompt([{
      type: 'select',
      name: 'selectedFn',
      message: '选择功能',
      choices: [
        { message: '备份', name: 'backup' },
        { message: '还原', name: 'restore' },
        { message: '配置编辑器', name: 'configEditor' },
        { message: '退出', name: 'exit' },
      ],
    }])

    if (selectedFn === 'configEditor') {
      await openConfigEditor()
      process.exit(0)
    }
    if (selectedFn === 'exit') {
      process.exit(0)
    }
    const { backupTargets }: { backupTargets: string[] } = await enquirer.prompt([
      {
        type: 'multiselect',
        name: 'backupTargets',
        message: `请选择${selectedFn === 'backup' ? '备份' : '还原'}项目(可多选，按 a 切换全选)`,
        choices: config.map((item) => {
          return {
            message: `${item.name}`,
            name: item.name,
            disabled: item.disabled,
          }
        }),
      },
    ])

    const isRestore = selectedFn === 'restore'

    let list = []
    if (backupTargets.length === 0) {
      console.log('默认选中所有项目')
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
    // console.log({ isRestore, list });

    for (const item of list) {
      console.log('\n')
      try {
        await backupRestoreSingleItem(item, { basePath, isRestore })
      }
      catch (error: any) {
        console.error(`[${item.name}] Error: ${error}`)
      }
    }

    waitExit()
  }
  catch (error) {
    console.error(error)
    waitExit()
  }
}

main()

async function openConfigEditor() {
  const configEditorPath = path.join(tempDirPath, 'gbn-config-editor.html')

  console.log(`
配置编辑器已在浏览器中打开。请选择或拖拽配置文件到编辑器窗口。
HTML文件路径：${configEditorPath}
配置文件路径：${configFilePath}
保存后请重新运行本程序。`)

  if (!existsSync(configEditorPath)) {
    await fsPromises.writeFile(configEditorPath, String(configEditorHtml), 'utf8')
  }
  opener(configEditorPath)
  await new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
}
