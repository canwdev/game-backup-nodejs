import type { IConfigItem } from '../types/config'
import { exec } from 'node:child_process'
import * as fsPromises from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import * as process from 'node:process'
import { gitAutoBackup } from './git-auto-backup'

// 替换环境变量
export function replaceEnvVars(filePath: string) {
  const env = process.env
  let replacedPath = filePath

  const homeDir = env.USERPROFILE || os.homedir()
  const winDir = env.SystemRoot || env.windir || 'C:\\Windows'
  const systemDrive = env.SystemDrive || 'C:'

  // 使用正则表达式进行全局替换，忽略大小写
  replacedPath = replacedPath.replace(/%USERPROFILE%/gi, homeDir)
  replacedPath = replacedPath.replace(/%APPDATA%/gi, env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'))
  replacedPath = replacedPath.replace(/%LOCALAPPDATA%/gi, env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'))

  replacedPath = replacedPath.replace(/%SystemRoot%/gi, winDir)
  replacedPath = replacedPath.replace(/%windir%/gi, winDir)
  replacedPath = replacedPath.replace(/%SystemDrive%/gi, systemDrive)

  replacedPath = replacedPath.replace(/%ProgramData%/gi, env.ProgramData || 'C:\\ProgramData')
  replacedPath = replacedPath.replace(/%ProgramFiles%/gi, env.ProgramFiles || 'C:\\Program Files')
  replacedPath = replacedPath.replace(/%ProgramFiles\(x86\)%/gi, env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)')

  // 将末尾的斜杠去除
  if (replacedPath.endsWith('/') || replacedPath.endsWith('\\')) {
    return replacedPath.slice(0, -1)
  }
  return replacedPath
}

// 执行 rclone 命令，返回 Promise
export async function runRclone(sourcePath: string, destPath: string, {
  transfers = 32,
  checkers = 64,
  exclude = '',
  include = '',
}: {
  transfers?: number
  checkers?: number
  exclude?: string | string[]
  include?: string | string[]
}) {
  let command = `rclone sync "${sourcePath}" "${destPath}" --transfers ${transfers} --checkers ${checkers} --track-renames --track-renames-strategy modtime,leaf`
  // --progress -v

  if (exclude) {
    if (!Array.isArray(exclude)) {
      exclude = [exclude]
    }
    exclude.forEach((ex) => {
      command += ` --exclude "${ex}"`
    })
  }
  if (include) {
    if (!Array.isArray(include)) {
      include = [include]
    }
    include.forEach((inl) => {
      command += ` --include "${inl}"`
    })
  }
  console.log(`执行命令: ${command}`)

  return new Promise<void>((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`stderr: ${stderr}`)
        reject(error)
        return
      }
      // console.log(`stdout: ${stdout}`);
      resolve()
    })
  })
}

// 读取配置文件
export async function readConfigFile(configFilePath: string): Promise<IConfigItem[] | null> {
  try {
    // 读取配置文件
    const data = await fsPromises.readFile(configFilePath, 'utf8')
    return JSON.parse(data) as IConfigItem[]
  }
  catch (err: any) {
    if (err.code === 'ENOENT') {
      return null
    }
    if (err instanceof SyntaxError) {
      console.error(`解析 ${configFilePath} 出错: ${err.message}`)
    }
    throw err
  }
}

// 备份单个项目
export async function backupRestoreSingleItem(item: IConfigItem, { basePath, isRestore = false }: { basePath: string, isRestore?: boolean }) {
  let {
    name,
    isGitBackup,
    srcPath,
    exclude,
    include,
    disabled = false,
    ignorePathCheck = false,
    transfers = 32,
    checkers = 64,
  } = item
  if (disabled) {
    console.log(`[${item.name}] 已禁用，跳过备份`)
    return
  }
  if (isGitBackup && !exclude) {
    // 如果是git备份，默认排除 .git 目录
    exclude = '.git/'
  }

  // 替换环境变量
  srcPath = replaceEnvVars(srcPath)

  // 目标路径
  const destPath = replaceEnvVars(item.destPath || path.join(basePath, 'backup', name))

  if (!ignorePathCheck) {
    const checkPath = isRestore ? destPath : srcPath
    // 检查源路径是否存在
    try {
      await fsPromises.access(checkPath)
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (err) {
      console.error(`[${item.name}] 路径不存在，跳过${isRestore ? '恢复' : '备份'}: ${checkPath}`)
      return
    }
  }

  if (!ignorePathCheck) {
    // 创建目标目录（如果不存在）
    await fsPromises.mkdir(destPath, { recursive: true })
  }

  const rcloneConfig = {
    transfers,
    checkers,
    exclude,
    include,
  }
  if (isRestore) {
    // 恢复时，将目标路径作为源路径，源路径作为目标路径
    console.log(`[${item.name}] rclone 正在恢复: ${destPath} -> ${srcPath}`)
    await runRclone(destPath, srcPath, rcloneConfig)
    console.log(`[${item.name}] rclone 恢复完成`)
  }
  else {
    console.log(`[${item.name}] rclone 正在备份: ${srcPath} -> ${destPath}`)
    await runRclone(srcPath, destPath, rcloneConfig)
    console.log(`[${item.name}] rclone 备份完成`)

    if (isGitBackup) {
      await gitAutoBackup(destPath)
    }
  }
}
