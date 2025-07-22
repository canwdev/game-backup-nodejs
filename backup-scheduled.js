const { backupRestore, waitExit } = require('./utils/backup-restore')
const path = require('path')

async function backupAndCommit() {
  try {
    await backupRestore({
      basePath: path.join(__dirname),
      isGitBackup: true,
    })
  } catch (err) {
    console.error(err);
  }

  console.log(`备份和提交完成！当前时间: ${new Date().toLocaleString()}`);

  const nextTime = new Date();
  const hours = 6;
  nextTime.setHours(nextTime.getHours() + hours);
  console.log(
    `将在 ${hours} 小时后自动执行备份和提交，下一次备份将在 ${nextTime.toLocaleString()} 执行`
  );
  setTimeout(() => {
    backupAndCommit();
  }, hours * 60 * 60 * 1000); // hours in milliseconds
}

backupAndCommit()