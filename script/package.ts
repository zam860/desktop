/* eslint-disable no-sync */

import * as fs from 'fs-extra'
import * as cp from 'child_process'
import * as path from 'path'
import * as crypto from 'crypto'
import * as electronInstaller from 'electron-winstaller'
import * as glob from 'glob'
const rimraf = require('rimraf')

import { getProductName, getCompanyName, getVersion } from '../app/package-info'
import {
  getDistPath,
  getDistRoot,
  getOSXZipPath,
  getWindowsIdentifierName,
  getWindowsStandaloneName,
  getWindowsInstallerName,
  shouldMakeDelta,
  getUpdatesURL,
} from './dist-info'
import { isAppveyor } from './build-platforms'

const distPath = getDistPath()
const productName = getProductName()
const outputDir = path.join(distPath, '..', 'installer')

if (process.platform === 'darwin') {
  packageOSX()
} else if (process.platform === 'win32') {
  packageWindows()
} else if (process.platform === 'linux') {
  packageLinux()
} else {
  console.error(`I dunno how to package for ${process.platform} :(`)
  process.exit(1)
}

function packageOSX() {
  const dest = getOSXZipPath()
  fs.removeSync(dest)

  cp.execSync(
    `ditto -ck --keepParent "${distPath}/${productName}.app" "${dest}"`
  )
  console.log(`Zipped to ${dest}`)
}

function packageWindows() {
  const setupCertificatePath = path.join(
    __dirname,
    'setup-windows-certificate.ps1'
  )
  const cleanupCertificatePath = path.join(
    __dirname,
    'cleanup-windows-certificate.ps1'
  )

  if (isAppveyor()) {
    cp.execSync(`powershell ${setupCertificatePath}`)
  }

  const iconSource = path.join(
    __dirname,
    '..',
    'app',
    'static',
    'logos',
    'icon-logo.ico'
  )

  if (!fs.existsSync(iconSource)) {
    console.error(`expected setup icon not found at location: ${iconSource}`)
    process.exit(1)
  }

  const splashScreenPath = path.resolve(
    __dirname,
    '../app/static/logos/win32-installer-splash.gif'
  )

  if (!fs.existsSync(splashScreenPath)) {
    console.error(
      `expected setup splash screen gif not found at location: ${splashScreenPath}`
    )
    process.exit(1)
  }

  const iconUrl = 'https://desktop.githubusercontent.com/app-icon.ico'

  const nugetPkgName = getWindowsIdentifierName()
  const options: electronInstaller.Options = {
    name: nugetPkgName,
    appDirectory: distPath,
    outputDirectory: outputDir,
    authors: getCompanyName(),
    iconUrl: iconUrl,
    setupIcon: iconSource,
    loadingGif: splashScreenPath,
    exe: `${nugetPkgName}.exe`,
    title: productName,
    setupExe: getWindowsStandaloneName(),
    setupMsi: getWindowsInstallerName(),
  }

  if (shouldMakeDelta()) {
    options.remoteReleases = getUpdatesURL()
  }

  if (isAppveyor()) {
    const certificatePath = path.join(__dirname, 'windows-certificate.pfx')
    options.signWithParams = `/f ${certificatePath} /p ${
      process.env.WINDOWS_CERT_PASSWORD
    } /tr http://timestamp.digicert.com /td sha256`
  }

  electronInstaller
    .createWindowsInstaller(options)
    .then(() => {
      console.log(`Installers created in ${outputDir}`)
      cp.execSync(`powershell ${cleanupCertificatePath}`)
    })
    .catch(e => {
      cp.execSync(`powershell ${cleanupCertificatePath}`)
      console.error(`Error packaging: ${e}`)
      process.exit(1)
    })
}

function getSha256Checksum(fullPath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const algo = 'sha256'
    const shasum = crypto.createHash(algo)

    const s = fs.createReadStream(fullPath)
    s.on('data', function(d) {
      shasum.update(d)
    })
    s.on('error', err => {
      reject(err)
    })
    s.on('end', function() {
      const d = shasum.digest('hex')
      resolve(d)
    })
  })
}

async function buildSnapPackage() {
  const sourceDir = path.join(__dirname, 'linux')
  const distDir = getDistRoot()

  // create temp directory
  const tmpDir = path.join(getDistRoot(), 'temp', 'desktop-snap-dir')

  // TODO: handle missing directory/dirty directory/other states that Docker isn't wild about right now

  const exists = await fs.pathExists(tmpDir)
  if (exists) {
    console.log(`cleaning up old directory: ${tmpDir}`)
    rimraf.sync(tmpDir)
  }

  console.log(`creating temp directory: ${tmpDir}`)
  await fs.mkdirp(tmpDir)

  // copy snapcraft.yml into $temp
  await fs.copy(
    path.join(sourceDir, 'snapcraft.yaml'),
    path.join(tmpDir, 'snap', 'snapcraft.yaml')
  )

  // copy deb into $temp
  const debInstallerPath = path.join(
    distDir,
    `GitHubDesktop-linux-${getVersion()}.deb`
  )
  const debInstallerDestination = path.join(
    tmpDir,
    `GitHubDesktop-linux-${getVersion()}.deb`
  )
  await fs.copy(debInstallerPath, debInstallerDestination)

  // copy electron-launch into `$temp/files/bin`
  const launchFileDestination = path.join(tmpDir, 'files', 'bin')
  await fs.mkdirp(launchFileDestination)
  await fs.copy(
    path.join(sourceDir, 'electron-launch'),
    path.join(launchFileDestination, 'electron-launch')
  )

  //spawn snapcraft tooling
  console.log(`spawn snapcraft tooling at: ${tmpDir}`)

  const { error } = cp.spawnSync('snapcraft', { stdio: 'inherit', cwd: tmpDir })
  if (error != null) {
    throw error
  }

  // move snap into dist output directory
  const installerSource = path.join(
    tmpDir,
    `GitHubDesktop-linux-${getVersion()}.snap`
  )

  const installerExists = await fs.pathExists(installerSource)
  if (!installerExists) {
    throw new Error(
      'Snap was not created at expected location, check what happened'
    )
  }

  const installerDestination = path.join(
    getDistRoot(),
    `GitHubDesktop-linux-${getVersion()}.snap`
  )

  await fs.copy(installerSource, installerDestination)
}

function generateChecksums() {
  const distRoot = getDistRoot()

  const installersPath = `${distRoot}/GitHubDesktop-linux-*`

  glob(installersPath, async (error, files) => {
    if (error != null) {
      throw error
    }

    const checksums = new Map<string, string>()

    for (const f of files) {
      const checksum = await getSha256Checksum(f)
      checksums.set(f, checksum)
    }

    let checksumsText = `Checksums: \n`

    for (const [fullPath, checksum] of checksums) {
      const fileName = path.basename(fullPath)
      checksumsText += `${checksum} - ${fileName}\n`
    }

    const checksumFile = path.join(distRoot, 'checksums.txt')

    fs.writeFile(checksumFile, checksumsText)
  })
}

function packageLinux() {
  const electronBuilder = path.resolve(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    'electron-builder'
  )

  const configPath = path.resolve(__dirname, 'electron-builder-linux.yml')

  const args = [
    'build',
    '--prepackaged',
    distPath,
    '--x64',
    '--config',
    configPath,
  ]

  const { error } = cp.spawnSync(electronBuilder, args, { stdio: 'inherit' })

  if (error != null) {
    throw error
  }

  buildSnapPackage()

  generateChecksums()
}
