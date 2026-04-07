# 更新日志

## [1.3.0] - 2026-04-07

### 新增

- 配置项 **`extraParams`**（可选）：在 `folder` 类型条目的 `rclone sync` 命令末尾追加额外参数（如 `--dry-run`、`--verbose` 等）。配置编辑器与 CLI 共用同一 JSON 字段。
- **`buildRcloneSyncCommand`**（`src/utils/rclone-sync-command.ts`）：将 `rclone sync` 命令字符串的生成逻辑独立为纯函数，CLI 的 `runRcloneSync` 与配置编辑器共用同一套拼接规则。
- 配置编辑器：编辑 **`folder`** 类型条目时，在弹窗底部展示**备份方向**（源 → 目标）的 **rclone 命令预览**，随表单实时更新。
- 新增常量 **`DEFAULT_RCLONE_TRANSFERS = 3`**、**`DEFAULT_RCLONE_CHECKERS = 8`**。
- 新增非交互式 CLI 运行模式，见 `--help` 输出。

### 变更（破坏性）

- 工作目录下的配置文件由 `config.json` 更名为 **`backup-config.json`**。若已有旧文件，请手动重命名后再运行 CLI。
- 配置编辑器「另存为 / 下载」的默认文件名为 **`backup-config.json`**，与 CLI 一致。
- **GitHub Actions**（`.github/workflows/release.yml`）：支持在推送 **`v*`** 标签或 **手动运行 workflow** 时执行根目录的 **`bun run build:auto`**（`docs/build.ts`：依赖安装、ESLint、前端构建至 `docs/`、CLI 构建至 `dist/`），随后部署 **GitHub Pages**，并上传/发布 **`dist/game-backup-cli.cjs`**（标签推送时附加到 Release）。

### 说明

- CLI 启动横幅中的版本号来自 `src/types/version.ts`，发布时请与 `package.json` 的 `version` 保持一致。
