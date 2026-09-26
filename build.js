import fs from 'fs'
import esbuild from 'esbuild'

const loadFile = path => fs.readFileSync(path, 'utf8')
const loadJSON = path => JSON.parse(loadFile(path))

const packageJson = loadJSON('./package.json')

const Loader = loadFile('./node_modules/lazy-module-loader/loader.js')

const targetDir = './dist'
const targetPath = `${targetDir}/toolkit-${packageJson.version}.js`
const esmTargetPath = `${targetDir}/toolkit-${packageJson.version}.esm.js`

const bundle = async (entryPoint, format) => {
  const {
    outputFiles: [output],
  } = await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    format,
    legalComments: 'none',
    write: false,
  })
  return output.text
}

/* Classic script exposing the loader and opr.Toolkit globals. */
const iife = await bundle('./src/release.js', 'iife')
const release = `${Loader}\n\n${iife}`

/* ES module exporting the Toolkit API. */
const esmRelease = await bundle('./src/index.js', 'esm')

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir)
}
fs.writeFileSync(targetPath, release, 'utf8')
fs.writeFileSync(esmTargetPath, esmRelease, 'utf8')

const formatNumber = number => String(number).replace(/(\d{3})$/g, ',$1')

const size = formatNumber(release.length)
const lines = formatNumber(release.split('\n').length)

console.log()
console.log('-------------------------------------------------------')
console.log(' Finished bundling release version of Toolkit X')
console.log('-------------------------------------------------------')
console.log(` => Target files: ${targetPath}, ${esmTargetPath}`)
console.log(` => Version: ${packageJson.version}`)
console.log(` => Lines: ${lines}`)
console.log(` => Size: ${size} bytes`)
console.log('-------------------------------------------------------')
console.log()
