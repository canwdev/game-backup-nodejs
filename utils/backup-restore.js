const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const fsPromises = require('fs').promises;
const { gitAutoBackup } = require('./git-auto-backup')

// 替换环境变量
const replaceEnvVars = (filePath) => {
  const env = process.env;
  let replacedPath = filePath;

  const homeDir = env.USERPROFILE || os.homedir()
  const winDir = env.SystemRoot || env.windir || 'C:\\Windows'
  const systemDrive = env.SystemDrive || 'C:'

  // 使用正则表达式进行全局替换，忽略大小写
  replacedPath = replacedPath.replace(/%USERPROFILE%/gi, homeDir);
  replacedPath = replacedPath.replace(/%APPDATA%/gi, env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'));
  replacedPath = replacedPath.replace(/%LOCALAPPDATA%/gi, env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'));

  replacedPath = replacedPath.replace(/%SystemRoot%/gi, winDir);
  replacedPath = replacedPath.replace(/%windir%/gi, winDir);
  replacedPath = replacedPath.replace(/%SystemDrive%/gi, systemDrive);

  replacedPath = replacedPath.replace(/%ProgramData%/gi, env.ProgramData || 'C:\\ProgramData');
  replacedPath = replacedPath.replace(/%ProgramFiles%/gi, env.ProgramFiles || 'C:\\Program Files');
  replacedPath = replacedPath.replace(/%ProgramFiles\(x86\)%/gi, env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)');

  // 将末尾的斜杠去除
  if (replacedPath.endsWith('/') || replacedPath.endsWith('\\')) {
    return replacedPath.slice(0, -1);
  }
  return replacedPath;
}

// 执行 rclone 命令，返回 Promise
const runRclone = (
  sourcePath,
  destPath,
  {
    transfers = 32,
    checkers = 64,
    exclude = '',
    include = '',
  }) => {
  let command = `rclone sync "${sourcePath}" "${destPath}" --transfers ${transfers} --checkers ${checkers} --track-renames --track-renames-strategy modtime,leaf`;
  // --progress -v

  if (exclude) {
    if (!Array.isArray(exclude)) {
      exclude = [exclude];
    }
    exclude.forEach((ex) => {
      command += ` --exclude "${ex}"`;
    });
  }
  if (include) {
    if (!Array.isArray(include)) {
      include = [include];
    }
    include.forEach((inl) => {
      command += ` --include "${inl}"`;
    });
  }
  console.log(`执行命令: ${command}`);

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

// 读取配置文件
const readConfigFile = async (configFilePath) => {
  try {
    // 读取配置文件
    const data = await fsPromises.readFile(configFilePath, 'utf8');
    return JSON.parse(data);
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
          "srcPath": "C:\\ProgramData\\PopCap Games\\PlantsVsZombies\\pvzHE\\yourdata"
        }
      ]
      await fsPromises.writeFile(configFilePath, JSON.stringify(demoContent, null, 2), 'utf8');
      console.log(`已创建示例配置文件。请修改该文件，然后重新运行本程序。`);
      return null
    }
    if (err instanceof SyntaxError) {
      console.error(`解析 ${configFilePath} 出错: ${err.message}`);
    }
    throw err;
  }
}

// 备份单个项目
const backupRestoreSingleItem = async (item, { basePath, isRestore = false }) => {
  let {
    name,
    // 是否自动备份到 git
    isGitBackup,
    // 源路径
    srcPath,
    // 排除的文件或目录
    exclude,
    // 包含的文件或目录
    include,
    // 是否禁用
    disabled = false,
    // 是否忽略本地路径检查（如果路径是rclone远程路径，可以传入true）
    ignorePathCheck = false,
    transfers = 32,
    checkers = 64,
  } = item;
  if (disabled) {
    console.log(`[${item.name}] 已禁用，跳过备份`);
    return;
  }
  if (isGitBackup && !exclude) {
    // 如果是git备份，默认排除 .git 目录
    exclude = '.git/';
  }

  // 替换环境变量
  srcPath = replaceEnvVars(srcPath);

  if (!ignorePathCheck) {
    // 检查源路径是否存在
    try {
      await fsPromises.access(srcPath);
    } catch (err) {
      console.error(`[${item.name}] 源路径不存在，跳过备份: ${srcPath}`);
      return;
    }
  }

  // 目标路径
  let destPath = replaceEnvVars(item.destPath || path.join(basePath, 'backup', name))

  if (!ignorePathCheck) {
    // 创建目标目录（如果不存在）
    await fsPromises.mkdir(destPath, { recursive: true });
  }

  const rcloneConfig = {
    transfers,
    checkers,
    exclude,
    include
  }
  if (isRestore) {
    // 恢复时，将目标路径作为源路径，源路径作为目标路径
    console.log(`[${item.name}] rclone 正在恢复: ${destPath} -> ${srcPath}`);
    await runRclone(destPath, srcPath, rcloneConfig);
    console.log(`[${item.name}] rclone 恢复完成`);
  } else {
    console.log(`[${item.name}] rclone 正在备份: ${srcPath} -> ${destPath}`);
    await runRclone(srcPath, destPath, rcloneConfig);
    console.log(`[${item.name}] rclone 备份完成`);

    if (isGitBackup) {
      await gitAutoBackup(destPath);
    }
  }
}

const backupRestore = async ({
  // 备份配置文件所在的目录
  basePath,
  // 是否为恢复模式
  isRestore = false,
} = {}) => {
  if (!basePath) {
    throw new Error('basePath 不能为空');
  }

  const configFilePath = path.join(basePath, 'config.json');

  try {
    const config = await readConfigFile(configFilePath);
    if (!config) {
      return;
    }
    for (const item of config) {
      console.log('\n');
      try {
        await backupRestoreSingleItem(item, { basePath, isRestore })
      } catch (error) {
        console.error(`[${item.name}] 错误: ${error}`);
      }
    }
  } catch (err) {
    console.error(`发生错误: ${err.message}`);
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
  replaceEnvVars,
  readConfigFile,
  backupRestoreSingleItem,
  backupRestore,
  runRclone,
  waitExit,
};