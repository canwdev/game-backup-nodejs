# Node.js 游戏存档备份工具

- 也可用于备份配置文件
- 此工具使用 `rclone sync` 命令进行本地备份和恢复
- 如需使用 `git` 存档功能，还需安装 `git`

## 1. 安装

### 1.1 安装 nodejs

前往 https://nodejs.org/zh-cn/download 下载对应操作系统的安装包，安装即可。

### 1.2 安装 rclone

前往 https://rclone.org/downloads/ 下载对应操作系统的 zip，解压后获得 `rclone.exe`，将文件复制到 `C:\Windows` 目录即可。

### 1.3 安装 git（可选）

前往 https://git-scm.com/downloads/win 下载安装即可。

## 2. 初次使用

- Windows 用户可直接右键 `game-backup-cli.cjs` 选择打开方式为始终使用 `node.exe`，后续使用时直接双击即可。
- 备份的数据会放在 `./backup` 文件夹下

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

- 配置定义：[config.ts](./src/types/config.ts)
- [配置编辑器，使用浏览器打开](./src/config-editor.html)

```json
[
  {
    "name": "pvzHE",
    "srcPath": "C:\\ProgramData\\PopCap Games\\PlantsVsZombies\\pvzHE\\yourdata",
    // 备份到哪里，绝对路径，非必填，默认备份到配置文件同目录下的 ./backup/${name} 文件夹
    "destPath": "D:\\GameSavesBackup\\pvzHEBackup",
    // 是否自动使用 git 备份，非必填，默认 false
    "isGitBackup": true
  },
  {
    "name": "Everything",
    "srcPath": "%USERPROFILE%\\AppData\\Roaming\\Everything",
    // 支持排除单个文件或文件夹，参考 https://rclone.org/filtering/
    "exclude": "Run History.csv"
  },
  {
    "name": "Listary",
    "srcPath": "%USERPROFILE%\\AppData\\Roaming\\Listary",
    // 支持排除多个文件或文件夹
    "exclude": ["**/Cache/*", "History_*.*", "DiskSearch.db"]
  },
  {
    // 禁用这条同步规则
    "disabled": true,
    "name": "home",
    "srcPath": "%USERPROFILE%",
    // 首先排除所有文件
    "exclude": "**",
    // 然后只包含以下文件
    "include": [
      ".gitconfig",
      ".ssh/**"
    ]
    // 由于 rclone 必须先遍历（检查）整个源目录，构建一个完整的文件列表，然后才能对这个列表应用你的 --include 和 --exclude 规则。
    // 这意味着，如果你有很多文件，并且你只需要同步其中的一小部分，那么 rclone 将会花费很长时间来遍历整个源目录。
    // 所以尽量不要在大型目录使用 exclude + include 功能
  }
]
```

## 3. 其他

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
