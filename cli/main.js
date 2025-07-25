const which = require('which');
const {readConfigFile, backupRestoreSingleItem, waitExit} = require('../utils/backup-restore')
const {prompt} = require('enquirer');
const path = require('path')


// 检测部署环境必要命令
const checkEnv = (commands = []) => {
  if (!commands.length) return true

  let cmdNotFound = null
  commands.forEach(command => {
    try {
      const resolved = which.sync(command)
      // console.log(resolved)
    } catch (e) {
      cmdNotFound = command
    }
  })

  if (cmdNotFound) {
    console.error(`错误：运行此脚本需要的命令 '${cmdNotFound}' 未找到，请安装这些软件包，然后重试。`)
    return false
  }
  return true
}

const basePath = process.cwd() // path.resolve(__dirname)
const configFilePath = path.join(basePath, 'config.json');

const main = async () => {
  console.log(`<--===([ Game Backup CLI ])===-->
         存档备份还原工具
`)
  try {

    if (!await checkEnv(['rclone'])) {
      waitExit()
      return
    }

    // console.log(configFilePath);
    const config = await readConfigFile(configFilePath)

    if (!config) {
      waitExit()
      return
    }

    const questions = [
      {
        type: 'select',
        name: 'selectFn',
        message: '选择功能',
        choices: [
          {message: '备份', name: 'backup'},
          {message: '还原', name: 'restore'},
          {message: '退出', name: 'exit'}
        ],
        validate(value) {
          if (value === 'exit') {
            process.exit(0)
            return false
          }
          return true
        }
      },
      {
        type: 'multiselect',
        name: 'backupTargets',
        message: '请选择项目(可多选，按 a 切换全选)',
        choices: config.map((item) => {
          return {
            message: `${item.name}`,
            name: item.name,
            disabled: item.disabled
          }
        })
      }
    ];

    const answers = await prompt(questions);
    // console.log('Answers:', answers);

    const {selectFn, backupTargets} = answers

    const isRestore = selectFn === 'restore'

    let list = []
    if (backupTargets.length === 0) {
      console.log('默认选中所有项目');
      list = config
    } else {
      const nameMap = {}
      backupTargets.forEach((item) => {
        nameMap[item] = true
      })
      list = config.filter((item) => {
        return nameMap[item.name]
      })
    }
    // console.log({ isRestore, list });

    for (const item of list) {
      console.log('\n');
      try {
        await backupRestoreSingleItem(item, {basePath, isRestore})
      } catch (error) {
        console.error(`[${item.name}] 错误: ${error}`);
      }
    }

    waitExit()
  } catch (error) {
    console.error(error);
    waitExit()
  }

}

main()