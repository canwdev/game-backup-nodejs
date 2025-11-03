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

// rclone copyto：适用于复制 单个文件，且可以直接 重命名 目标文件。
// rclone copy：适用于复制 整个目录或多个文件。
export async function runRcloneCopyTo(fromPath: string, toPath: string) {
  return new Promise<void>((resolve, reject) => {
    const command = `rclone copyto "${fromPath}" "${toPath}"`
    console.log(`>>> ${command}`)
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

// 执行 rclone 命令，返回 Promise
export async function runRcloneSync(fromPath: string, toPath: string, {
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
  let command = `rclone sync "${fromPath}" "${toPath}" --transfers ${transfers} --checkers ${checkers} --track-renames --track-renames-strategy modtime,leaf`
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
  console.log(`>>> ${command}`)

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

// 备份/还原单个项目
export async function backupRestoreItem(item: IConfigItem, { basePath, isRestore = false }: { basePath: string, isRestore?: boolean }) {
  let {
    type,
    srcFiles,
    name,
    srcPath,
    destPath,
    isGitBackup,
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
  if (type === 'files') {
    await backRestoreFiles(item, { basePath, isRestore })
    return
  }

  if (isGitBackup && !exclude) {
    // 如果是git备份，默认排除 .git 目录
    exclude = ['.git/']
  }

  // 替换环境变量
  srcPath = replaceEnvVars(srcPath)

  // 目标路径
  destPath = replaceEnvVars(destPath || path.join(basePath, 'backup', name))

  if (!ignorePathCheck) {
    const checkPath = isRestore ? destPath : srcPath
    // 检查源路径是否存在
    try {
      await fsPromises.access(checkPath)
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (err) {
      console.error(`[${item.name}] 路径不存在，跳过${isRestore ? '还原' : '备份'}: ${checkPath}`)
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
    // 还原时，将目标路径作为源路径，源路径作为目标路径
    console.log(`[${item.name}] 正在还原: ${destPath} -> ${srcPath}`)
    await runRcloneSync(destPath, srcPath, rcloneConfig)
    console.log(`[${item.name}] 还原完成`)
  }
  else {
    console.log(`[${item.name}] 正在备份: ${srcPath} -> ${destPath}`)
    await runRcloneSync(srcPath, destPath, rcloneConfig)
    console.log(`[${item.name}] 备份完成`)

    if (isGitBackup) {
      await gitAutoBackup(destPath)
    }
  }
}

async function backRestoreFiles(item: IConfigItem, { basePath, isRestore = false }: { basePath: string, isRestore?: boolean }) {
  let {
    type,
    srcFiles,
    destPath,
    name,
    isGitBackup,
    disabled = false,
  } = item
  if (disabled || type !== 'files' || !srcFiles || srcFiles.length === 0) {
    return
  }
  srcFiles = srcFiles.map(srcPath => replaceEnvVars(srcPath))
  destPath = replaceEnvVars(destPath || path.join(basePath, 'backup', name))

  if (isRestore) {
    // 还原逻辑
    let index = 0
    for (const srcPath of srcFiles) {
      const backupAbsPath = path.join(destPath, path.basename(srcPath))
      console.log(`[${name}][${index + 1}/${srcFiles.length}] 正在还原: ${backupAbsPath} -> ${srcPath}`)
      try {
        await runRcloneCopyTo(backupAbsPath, srcPath)
      }
      catch (error: any) {
        console.error(`[${name}][${index + 1}/${srcFiles.length}] 还原失败: ${error}`)
      }
      index++
    }
  }
  else {
    // 备份逻辑
    await fsPromises.mkdir(destPath, { recursive: true })
    let index = 0
    for (const srcPath of srcFiles) {
      const destAbsPath = path.join(destPath, path.basename(srcPath))
      console.log(`[${name}][${index + 1}/${srcFiles.length}] 正在备份: ${srcPath} -> ${destAbsPath}`)
      try {
        await runRcloneCopyTo(srcPath, destAbsPath)
      }
      catch (error: any) {
        console.error(`[${name}][${index + 1}/${srcFiles.length}] 备份失败: ${error}`)
      }
      index++
    }
    if (isGitBackup) {
      await gitAutoBackup(destPath)
    }
  }
}
