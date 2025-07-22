const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fsPromises = require('fs').promises;
const { gitAutoBackup } = require('./git-auto-backup')

// 函数：替换环境变量
function replaceEnvVars(filePath) {
  if (filePath.includes('%USERPROFILE%')) {
    return filePath.replace('%USERPROFILE%', os.homedir());
  }
  // 可以根据需要添加更多环境变量替换逻辑
  return filePath;
}

// 函数：执行 rclone 命令，返回 Promise
function runRclone(sourcePath, destPath) {
  const command = `rclone sync "${sourcePath}" "${destPath}" --track-renames --track-renames-strategy modtime,leaf --progress -v --checkers 32  --exclude ".git/"`;
  // console.log(`执行命令: ${command}`);

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      // console.log(`stdout: ${stdout}`);
      resolve();
    });
  });
}

async function backupRestore({
  basePath,
  isRestore = false,
} = {}) {
  if (!basePath) {
    throw new Error('basePath 不能为空');
  }

  const configFilePath = path.join(basePath, 'config.json');

  try {
    // 读取配置文件
    const data = await fsPromises.readFile(configFilePath, 'utf8');
    const config = JSON.parse(data);

    for (const item of config) {
      try {
        const backupName = item.name;
        let srcPath = item.srcPath;
        const isGitBackup = item.isGitBackup;

        // 转换成绝对路径
        srcPath = replaceEnvVars(srcPath);

        // 检查源路径是否存在
        try {
          await fsPromises.access(srcPath);
        } catch (err) {
          console.error(`[${item.name}] 源路径不存在，跳过备份: ${srcPath}`);
          continue;
        }

        // 目标路径
        const destPath = item.destPath || path.join(basePath, 'backup', backupName);

        // 创建目标目录（如果不存在）
        await fsPromises.mkdir(destPath, { recursive: true });

        // 调用 rclone
        if (isRestore) {
          // 恢复时，将目标路径作为源路径，源路径作为目标路径
          await runRclone(destPath, srcPath);
          console.log(`[${item.name}] rclone 恢复完成: ${destPath} -> ${srcPath}`);
        } else {
          // if (isGitBackup) {
          //   await gitAutoBackup(destPath, `备份前`);
          // }

          await runRclone(srcPath, destPath);
          console.log(`[${item.name}] rclone 备份完成: ${srcPath} -> ${destPath}`);

          if (isGitBackup) {
            await gitAutoBackup(destPath, `自动备份`);
          }
        }
      } catch (error) {
        console.error(`[${item.name}] rclone 备份出错: ${error}`);
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`配置文件不存在，将创建一个空的 config.json 文件。`);
      // 创建空的 config.json 文件
      const demoContent = [
        {
          "name": "StardewValley",
          "srcPath": "%USERPROFILE%\\AppData\\Roaming\\StardewValley"
        },
        {
          // 名称
          "name": "pvzHE",
          // 源路径，绝对路径
          "srcPath": "C:\\ProgramData\\PopCap Games\\PlantsVsZombies\\pvzHE\\yourdata",
          // 备份到哪里，绝对路径，非必填
          "destPath": "D:\\GameSavesBackup\\pvzHEBackup",
          // 是否自动备份到 git
          "isGitBackup": true
        }
      ]
      await fsPromises.writeFile(configFilePath, JSON.stringify(demoContent, null, 2), 'utf8');
      console.log(`已创建示例配置文件。请修改该文件，然后重新运行本程序。`);
    } else if (err instanceof SyntaxError) {
      console.error(`解析 ${configFilePath} 出错: ${err.message}`);
    } else {
      console.error(`发生错误: ${err.message}`);
    }
  }

}

// 使程序不退出，除非按任意键
function waitExit() {
  console.log('\n');
  console.log('按任意键退出...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, 0));
}

module.exports = {
  backupRestore,
  runRclone,
  waitExit,
};