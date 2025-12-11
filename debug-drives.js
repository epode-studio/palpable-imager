const drivelist = require('drivelist')

async function listDrives() {
  const drives = await drivelist.list()
  console.log('All drives detected by drivelist:')
  console.log(JSON.stringify(drives, null, 2))
}

listDrives().catch(console.error)
