import { exec } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as process from 'node:process'

// 封装执行 shell 命令的函数
async function execPromise(command: string, options = {}) {
  return new Promise((resolve) => {
    exec(command, options, (error, stdout, stderr) => {
      resolve({ stdout, stderr, error })
    })
  })
}

/**
 * 自动备份指定目录下的文件到 Git 仓库。
 * 如果目录不是 Git 仓库，会自动初始化。
 *
 * @param {string} absolutePath 要备份的目录的绝对路径。
 * @param commitMessage 提交信息
 */
export async function gitAutoBackup(absolutePath: string, commitMessage = `Auto Backup - ${new Date().toLocaleString()}`) {
  // console.log(`[INFO] Starting git backup process for: ${absolutePath}`);

  try {
    // 步骤 0: 检查路径是否存在且为目录
    try {
      const stats = await fs.stat(absolutePath)
      if (!stats.isDirectory()) {
        throw new Error(`Path "${absolutePath}" is not a directory.`)
      }
    }
    catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory "${absolutePath}" does not exist.`)
      }
      throw error
    }

    const gitPath = path.join(absolutePath, '.git')
    const execOptions = {
      cwd: absolutePath, // 指定命令执行的当前工作目录
      env: {
        ...process.env, // 继承当前进程的环境变量
        GIT_TERMINAL_PROMPT: '0', // <-- 关键：禁止 Git 弹出任何交互式提示
      },
    }

    // 步骤 1: 检测 .git 目录是否存在
    try {
      await fs.stat(gitPath)
      // console.log('[INFO] Git repository already exists.');
    }
    catch (error: any) {
      // 如果 stat 失败且错误码为 ENOENT，说明 .git 目录不存在
      if (error.code === 'ENOENT') {
        console.log('[INFO] No .git directory found. Initializing a new repository...')
        // 执行 git init
        const { stdout } = await execPromise('git init', execOptions) as any
        console.log(`[SUCCESS] Git repository initialized. ${stdout.trim()}`)
      }
      else {
        throw error
      }
    }

    // 步骤 2: 执行 git add .
    // console.log('[INFO] Adding all files to staging area...');
    await execPromise('git add .', execOptions)

    // 步骤 3: 执行 git commit
    // console.log('[INFO] Committing changes...');
    const commitCommand = `git commit -m "${commitMessage}"`

    try {
      const { stdout } = (await execPromise(commitCommand, execOptions)) as any
      console.log(`[SUCCESS] Git Commit successful.\n${stdout}`)
    }
    catch (error: any) {
      // 特殊情况处理：如果没有东西可提交，git commit 会返回非 0 退出码
      // 我们需要捕获这个“错误”，并将其视为正常情况
      if (error.stdout && error.stdout.includes('nothing to commit')) {
        console.log(`[INFO] Git: ${error.stdout}`)
      }
      else {
        throw error
      }
    }

    // console.log(`[COMPLETE] git backup process for ${absolutePath} finished successfully.`);
  }
  catch (error) {
    console.error('[ERROR]', error)
    // 可以选择在这里退出进程或向上层抛出异常
    // process.exit(1);
  }
}
