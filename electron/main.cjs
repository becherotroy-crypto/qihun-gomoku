const { app, BrowserWindow, net, protocol, shell, session } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const appScheme = 'qihun'
const appHost = 'app'

protocol.registerSchemesAsPrivileged([
  {
    scheme: appScheme,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

function getRendererFile(requestUrl) {
  const url = new URL(requestUrl)
  if (url.hostname !== appHost) {
    return null
  }

  const rendererRoot = path.resolve(__dirname, '..', 'dist')
  const pathname = decodeURIComponent(url.pathname)
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '')
  const filePath = path.resolve(rendererRoot, relativePath)

  if (!filePath.startsWith(`${rendererRoot}${path.sep}`) || !fs.existsSync(filePath)) {
    return null
  }

  return filePath
}

function createWindow() {
  const window = new BrowserWindow({
    width: 560,
    height: 860,
    minWidth: 420,
    minHeight: 640,
    show: false,
    title: '棋魂五子棋',
    backgroundColor: '#0d0f0f',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'resources', 'app-icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  window.once('ready-to-show', () => window.show())
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${appScheme}://${appHost}/`)) {
      return
    }

    event.preventDefault()
    if (url.startsWith('https://')) {
      void shell.openExternal(url)
    }
  })

  void window.loadURL(`${appScheme}://${appHost}/index.html`)
}

app.setName('棋魂五子棋')
app.setAppUserModelId('com.qihun.gomoku.desktop')

app.whenReady().then(async () => {
  await protocol.handle(appScheme, (request) => {
    const filePath = getRendererFile(request.url)
    if (!filePath) {
      return new Response('Not found', { status: 404 })
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
