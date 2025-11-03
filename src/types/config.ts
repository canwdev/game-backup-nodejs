export interface IConfigItem {
  // 项目名称，必填
  name: string
  // 备份类型，默认 folder
  type?: 'folder' | 'files'
  // 仅在 type 为 files 时生效，源路径，绝对路径（可使用环境变量），必填(二选一)
  srcPath: string
  // 仅在 type 为 files 时生效，指定要备份的文件列表(绝对路径)，必填(二选一)
  srcFiles?: string[]
  // 目标路径，可选，不传默认使用 ./backup/<name> 作为目标路径
  destPath?: string
  // 是否自动创建 git 仓库并提交备份，默认 false
  isGitBackup?: boolean
  // 支持排除多个文件或文件夹，可选
  exclude?: string[]
  // 包含的文件或目录，可选
  include?: string[]
  // 是否禁用，默认 false
  disabled?: boolean
  // 是否忽略本地路径检查（如果路径是rclone远程路径，可以传入true），默认 false
  ignorePathCheck?: boolean
  // 默认 32
  transfers?: number
  // 默认 64
  checkers?: number
}
