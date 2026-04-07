/** rclone `--transfers` 未配置时的默认值（与 CLI、编辑器一致） */
export const DEFAULT_RCLONE_TRANSFERS = 3

/** rclone `--checkers` 未配置时的默认值（与 CLI、编辑器一致） */
export const DEFAULT_RCLONE_CHECKERS = 8

export interface RcloneSyncCommandOptions {
  transfers?: number
  checkers?: number
  exclude?: string | string[]
  include?: string | string[]
  extraParams?: string
}

/**
 * 生成与 CLI `runRcloneSync` 一致的 `rclone sync` 命令字符串（不含执行）。
 */
export function buildRcloneSyncCommand(
  fromPath: string,
  toPath: string,
  {
    transfers = DEFAULT_RCLONE_TRANSFERS,
    checkers = DEFAULT_RCLONE_CHECKERS,
    exclude = '',
    include = '',
    extraParams = '',
  }: RcloneSyncCommandOptions = {},
): string {
  let command = `rclone sync "${fromPath}" "${toPath}" --transfers ${transfers} --checkers ${checkers} --track-renames --track-renames-strategy modtime,leaf`

  if (exclude) {
    const list = Array.isArray(exclude) ? exclude : [exclude]
    for (const ex of list) {
      command += ` --exclude "${ex}"`
    }
  }
  if (include) {
    const list = Array.isArray(include) ? include : [include]
    for (const inl of list) {
      command += ` --include "${inl}"`
    }
  }
  const trimmedExtra = extraParams?.trim()
  if (trimmedExtra) {
    command += ` ${trimmedExtra}`
  }
  return command
}
