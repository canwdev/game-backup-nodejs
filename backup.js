const { backupRestore, waitExit } = require('./utils/backup-restore')
const path = require('path')

async function main() {
  try {
    await backupRestore({
      basePath: path.join(__dirname),
      isGitBackup: true,
    })
  } catch (err) {
    console.error(err);
  }

  waitExit()
}

main()