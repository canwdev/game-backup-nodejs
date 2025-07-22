const { backupRestore, waitExit } = require('./utils/backup-restore')
const path = require('path')

async function main() {
  await backupRestore({
    basePath: path.join(__dirname),
    isGitBackup: true,
  })

  waitExit()
}

main()