import type { ChildProcess } from 'node:child_process'
import { execFile } from 'node:child_process'
import { release } from 'node:os'
import * as process from 'node:process'

/**
 * 跨平台地打开一个文件或 URL。
 */
export function opener(args: string | string[], options?: any, callback?: any): ChildProcess {
  let platform = process.platform

  // 检测 WSL (Windows Subsystem for Linux) 并将其视为 Windows
  if (platform === 'linux' && release().includes('Microsoft')) {
    platform = 'win32'
  }

  const commandMap: { [key: string]: string } = {
    win32: 'cmd.exe',
    darwin: 'open',
  }
  let command = commandMap[platform] || 'xdg-open' // 默认为 'xdg-open'

  // 统一将 args 处理为数组
  let finalArgs = Array.isArray(args) ? [...args] : [args]

  // 处理函数重载：当第二个参数是函数时，它就是 callback
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  // 允许通过 options.command 覆盖默认命令
  if (options?.command) {
    if (platform === 'win32') {
      // 在 Windows 上，自定义命令作为 `cmd.exe` 的参数
      finalArgs.unshift(options.command)
    }
    else {
      command = options.command
    }
  }

  // 为 Windows 平台准备特定的参数
  if (platform === 'win32') {
    // 为 `start` 命令转义特殊字符
    finalArgs = finalArgs.map(value => value.replace(/[&^]/g, '^$&'))
    // 添加 `cmd.exe` 执行 `start` 命令所需的前缀参数
    finalArgs.unshift('/c', 'start', '""')
  }

  return execFile(command, finalArgs, options, callback)
}
