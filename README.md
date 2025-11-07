# Node.js 游戏存档备份工具

- 也可用于备份配置文件
- 此工具使用 `rclone sync` 命令进行本地备份和还原
- 如需使用 `git` 存档功能，还需安装 `git`

## 1. 安装

### 1.1 安装 nodejs

前往 https://nodejs.org/zh-cn/download 下载对应操作系统的安装包，安装即可。

### 1.2 安装 rclone

前往 https://rclone.org/downloads/ 下载对应操作系统的 zip，解压后获得 `rclone.exe`，将文件复制到 `C:\Windows` 目录即可。

### 1.3 安装 git（可选）

前往 https://git-scm.com/downloads/win 下载安装即可。

## 2. 初次使用

### 手动下载运行

- 去 [Releases](https://github.com/canwdev/game-backup-cli/releases) 页面下载最新版本的 `game-backup-cli.cjs`
- Windows 用户可直接右键 `game-backup-cli.cjs` 选择打开方式为始终使用 `node.exe`，后续使用时直接双击即可。
- 备份的数据会放在当前目录的 `./backup` 文件夹下

### 或 npm 全局安装

```bash
npm install -g @canwdev/game-backup-cli
# 运行
game-backup-cli
```


### 2.1 最简单的配置

注意：标准 JSON 不支持注释，请在使用时删除注释。

```json
[
  {
    // 名称
    "name": "StardewValley",
    // 源路径，绝对路径
    "srcPath": "%USERPROFILE%\\AppData\\Roaming\\StardewValley"
  }
]
```

### 2.2 高级配置

- [配置编辑器，在线](https://canwdev.github.io/game-backup-cli/)
- [配置编辑器，本地](./docs/index.html)
- 配置定义：[config.ts](./src/types/config.ts)

## 其他

### 如何查找存档位置

- 使用 [Everything](https://www.voidtools.com/zh-cn/downloads/) 搜索游戏同名文件夹
- 一般可能位于以下文件夹中：
  - `%USERPROFILE%\AppData\Roaming`
  - `%USERPROFILE%\AppData\LocalLow`
  - `%USERPROFILE%\AppData\Local`
  - `%USERPROFILE%\Documents`
  - `%USERPROFILE%\Documents\My Games`
- 一些游戏会把存档放在游戏同名目录下，可以观察更新时间来判断

### Windows 常用路径变量

使用`运行`输入以下变量可快速定位到对应文件夹

```
%USERPROFILE% = C:\Users\用户名
%APPDATA% = C:\Users\用户名\AppData\Roaming
%LOCALAPPDATA% = C:\Users\用户名\AppData\Local
%SystemRoot% = C:\WINDOWS
%windir% = C:\WINDOWS
%SystemDrive% = C:
%ProgramData% = C:\ProgramData
%ProgramFiles% = C:\Program Files
%ProgramFiles(x86)% = C:\Program Files (x86)
```

## 开发

```bash
bun i
bun dev

# 前端
cd frontend
bun i
bun run frontend:dev

# 自动编译
bun run build:auto

# 发布npm
npm login
npm publish  --access public
```