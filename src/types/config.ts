export interface IConfigItem {
  // 项目名称，必填
  name: string
  // 源路径，绝对路径（可使用环境变量），必填
  srcPath: string
  // 目标路径，可选，不传默认使用 ./backup/<name> 作为目标路径
  destPath?: string
  // 是否自动创建 git 仓库并提交备份，默认 false
  isGitBackup?: boolean
  // 排除的文件或目录
  exclude?: string | string[]
  // 包含的文件或目录
  include?: string | string[]
  // 是否禁用
  disabled?: boolean
  // 是否忽略本地路径检查（如果路径是rclone远程路径，可以传入true）
  ignorePathCheck?: boolean
  // 默认 32
  transfers?: number
  // 默认 64
  checkers?: number
}
