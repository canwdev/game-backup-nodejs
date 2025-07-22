# Node.js 游戏存档备份工具

- 也可用于备份其他文件
- 无需任何第三方依赖，直接安装 `nodejs` 和 `rclone` 即可运行
- 此工具使用 `rclone sync` 命令进行本地备份和恢复，所以需要安装 `rclone`
- 如需使用 `git` 功能，还需安装 `git`

初次运行，可直接执行 `node backup.js`，会在当前目录下生成 `config.json` 示例文件，修改后即可使用

此工具仅在 Windows 上测试过，其他平台未测试。
Windows 用户可直接右键 `backup.js` 选择打开方式为始终使用 `node.exe`，后续使用时直接双击即可。

## 如何安装 nodejs

前往 https://nodejs.org/zh-cn/download 下载对应操作系统的安装包，安装即可。

## 如何安装 rclone

前往 https://rclone.org/downloads/ 下载对应操作系统的 zip，解压后获得 `rclone.exe`，将文件复制到 `C:\Windows` 目录即可。

## 如何安装 git

前往 https://git-scm.com/downloads/win 下载对应操作系统的安装包，安装即可。

## 配置文件示例：

```json
[
  {
    "name": "StardewValley",
    "srcPath": "%USERPROFILE%\\AppData\\Roaming\\StardewValley"
  },
  {
    // 名称
    "name": "pvzHE",
    // 源路径，绝对路径
    "srcPath": "C:\\ProgramData\\PopCap Games\\PlantsVsZombies\\pvzHE\\yourdata",
    // 备份到哪里，绝对路径，非必填，默认备份到配置文件同目录下的 backup/${name} 文件夹
    "destPath": "D:\\GameSavesBackup\\pvzHEBackup",
    // 是否自动使用 git 备份，非必填，默认 false
    "isGitBackup": true
  }
]
```

## 如何查找游戏存档位置

- 使用 [Everything](https://www.voidtools.com/zh-cn/downloads/) 搜索游戏同名文件夹
- 一般可能位于以下文件夹中：
  - `%USERPROFILE%\AppData\Roaming`
  - `%USERPROFILE%\AppData\LocalLow`
  - `%USERPROFILE%\AppData\Local`
  - `%USERPROFILE%\Documents`
  - `%USERPROFILE%\Documents\My Games`
- 一些游戏会把存档放在游戏同名目录下，可以观察更新时间来判断
