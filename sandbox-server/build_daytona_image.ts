import { Daytona, Image } from '@daytonaio/sdk'
import packageJson from './package.json'

async function main() {
    const snapshotName = `oscar-sandbox-server:${packageJson.version}`
    const daytona = new Daytona()

    const image = Image.debianSlim('3.12')
        .runCommands(
            'apt-get update && apt-get install -y git curl',
            'curl -fsSL https://deb.nodesource.com/setup_20.x | bash -',
            'apt-get install -y nodejs',
            'mkdir -p /home/daytona/workspace/sandbox-server')
        .workdir('/home/daytona/workspace')
        .addLocalDir('src', '/home/daytona/workspace/sandbox-server/src')
        .addLocalFile('package.json', '/home/daytona/workspace/sandbox-server/package.json')
        .addLocalFile('tsconfig.json', '/home/daytona/workspace/sandbox-server/tsconfig.json')
        .workdir('/home/daytona/workspace/sandbox-server')
        .runCommands('npm install')

    console.log(`=== Creating Snapshot: ${snapshotName} ===`)
    await daytona.snapshot.create(
        {
            name: snapshotName,
            image,
            resources: {
            cpu: 1,
            memory: 1,
            disk: 3,
            },
        },
        {
            onLogs: console.log,
        },
    )  
}

main().catch(console.error)