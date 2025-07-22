const { backupRestore, waitExit } = require('./utils/backup-restore')
const path = require('path')


console.log('按任意键开始恢复...');
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', async () => {
  try {
    await backupRestore({
      basePath: path.join(__dirname),
      isRestore: true,
    })
  } catch (err) {
    console.error(err);
  }

  waitExit()
});
