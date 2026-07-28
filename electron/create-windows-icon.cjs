const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow } = require('electron')

const sizes = [16, 24, 32, 48, 64, 128, 256]
const projectRoot = path.resolve(__dirname, '..')
const sourcePath = path.join(projectRoot, 'public', 'assets', 'app-icon.svg')
const outputPath = path.join(projectRoot, 'resources', 'app-icon.ico')

function createIco(images) {
  const directory = Buffer.alloc(6 + images.length * 16)
  directory.writeUInt16LE(0, 0)
  directory.writeUInt16LE(1, 2)
  directory.writeUInt16LE(images.length, 4)

  let offset = directory.length
  for (const [index, image] of images.entries()) {
    const entry = 6 + index * 16
    directory.writeUInt8(image.size === 256 ? 0 : image.size, entry)
    directory.writeUInt8(image.size === 256 ? 0 : image.size, entry + 1)
    directory.writeUInt8(0, entry + 2)
    directory.writeUInt8(0, entry + 3)
    directory.writeUInt16LE(1, entry + 4)
    directory.writeUInt16LE(32, entry + 6)
    directory.writeUInt32LE(image.png.length, entry + 8)
    directory.writeUInt32LE(offset, entry + 12)
    offset += image.png.length
  }

  return Buffer.concat([directory, ...images.map((image) => image.png)])
}

app.whenReady().then(async () => {
  const svgDataUrl = `data:image/svg+xml;base64,${fs.readFileSync(sourcePath).toString('base64')}`
  const window = new BrowserWindow({
    show: false,
    width: 256,
    height: 256,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<img id="icon" src="${svgDataUrl}" />`)}`)
  const dataUrls = await window.webContents.executeJavaScript(`
    (async () => {
      const image = document.getElementById('icon')
      await image.decode()
      return ${JSON.stringify(sizes)}.map((size) => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        canvas.getContext('2d').drawImage(image, 0, 0, size, size)
        return canvas.toDataURL('image/png')
      })
    })()
  `)
  window.destroy()

  const images = sizes.map((size, index) => ({
    size,
    png: Buffer.from(dataUrls[index].split(',')[1], 'base64'),
  }))

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, createIco(images))
  app.quit()
}).catch((error) => {
  console.error(error)
  app.exit(1)
})
