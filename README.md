# Node.js 游戏存档备份工具

- 也可用于备份其他文件
- 无需任何第三方依赖，直接安装 `nodejs` 和 `rclone` 即可运行
- 使用 `rclone` 进行备份和恢复，所以需要安装 `rclone`
- 如需使用 `git` 功能，还需安装 `git`

初次运行，可直接执行 `node backup.js`，会在当前目录下生成 `config.json` 示例文件，修改后即可使用

此工具仅在 Windows 上测试过，其他平台未测试。
Windows 用户可直接右键 `backup.js` 选择打开方式为始终使用 `node.exe`，后续使用时直接双击即可。
