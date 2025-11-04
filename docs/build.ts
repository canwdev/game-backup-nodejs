import { spawn } from 'node:child_process'
import * as console from 'node:console'
import fs from 'node:fs/promises'
import path from 'node:path'
import { VERSION } from '../src/types/version'

function run(command: string, args: string[], cwd: string): Promise<void> {
  console.log(`\n> ${command} ${args.join(' ')}`) // 使用 > 符号，更像 shell 提示符
  return new Promise((resolve, reject) => {
    spawn(command, args, { cwd, stdio: 'inherit' })
      .on('close', (code) => {
        if (code === 0) {
          resolve()
        }
        else {
          reject(new Error(`Command failed with exit code: ${code}`))
        }
      })
      .on('error', reject)
  })
}

async function runInDir(title: string, cwd: string, commands: string[]) {
  console.log(`\n--- ${title} ---`)
  for (const cmdStr of commands) {
    const [command, ...args] = cmdStr.split(' ')
    await run(command as string, args, cwd)
  }
}

async function build() {
  const builderPath = __dirname

  const distDir = path.resolve(builderPath, '../dist')
  const backendPath = path.join(builderPath, '../')
  const frontendPath = path.join(builderPath, '../frontend')

  // 清理旧的构建产物
  await fs.rm(distDir, { recursive: true, force: true })
  console.log('Cleaned dist directory.')

  await runInDir('Installing dependencies...', backendPath, ['bun i'])
  await runInDir('Code checking...', backendPath, [
    'bunx eslint src/**/*.{ts,tsx,vue} frontend/**/*.{ts,tsx,vue} --fix',
  ])
  // 构建前端
  await runInDir('Building frontend, please wait...', frontendPath, [
    'bun i',
    'bun run frontend:build',
  ])
  // 构建后端
  await runInDir('Building backend...', backendPath, ['bun run build'])

  console.log(`>>> Update package.json version: ${VERSION}`)
  const pkgPath = path.join(builderPath, '../package.json')
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))
  pkg.version = VERSION
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2))
}
build()
