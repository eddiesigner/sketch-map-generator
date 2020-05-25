import sketch from 'sketch/dom'
import UI from 'sketch/ui'
import Settings from 'sketch/settings'
import BrowserWindow from 'sketch-module-web-view'
import { getWebview } from 'sketch-module-web-view/remote'
import { isSketchSupportedVersion } from './common'

const webviewIdentifier = 'sketch-map-generator.webview'
const doc = sketch.getSelectedDocument()

const closeWwebView = () => {
  const existingWebview = getWebview(webviewIdentifier)
  if (existingWebview) {
    existingWebview.close()
  }
}

// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  closeWwebView()
}

export function onGoogleRun() {
  createMapUI('google')
}

export function onMapboxRun() {
  createMapUI('mapbox')
}

/**
 * 
 * @param {String} provider 
 */
const createMapUI = (provider) => {
  if (!isSketchSupportedVersion()) {
    UI.message('⚠️ This plugin only works on Sketch 53 or above.')
    return
  }

  const googleApiKey = Settings.settingForKey('google.token')
  const mapboxUsername = Settings.settingForKey('mapbox.username')
  const mapboxPublicToken = Settings.settingForKey('mapbox.publictoken')
  const mapboxSecretToken = Settings.settingForKey('mapbox.token')

  const data = {
    provider,
    googleApiKey,
    mapboxUsername,
    mapboxPublicToken,
    mapboxSecretToken
  }

  const windowOptions = {
    identifier: webviewIdentifier,
    parent: doc,
    width: 1160,
    minWidth: 900,
    maxWidth: 1320,
    height: 800,
    minHeight: 620,
    maxHeight: 900,
    titleBarStyle: 'hidden',
    show: false,
    fullscreenable: false,
    hidesOnDeactivate: false,
    remembersWindowFrame: true,
    webPreferences: {
      devTools: true
    }
  }

  const browserWindow = new BrowserWindow(windowOptions)

  // only show the window when the page has loaded to avoid a white flash
  browserWindow.once('ready-to-show', () => {
    browserWindow.show()
  })

  const webContents = browserWindow.webContents

  webContents.on('externalLinkClicked', (url) => {
    NSWorkspace.sharedWorkspace().openURL(NSURL.URLWithString(url))
  })

  webContents.on('closeWindow', () => {
    closeWwebView()
  })

  webContents.on('generateMap', () => {
    closeWwebView()
  })

  webContents.on('saveSettings', (data) => {
    Settings.setSettingForKey(
      'google.token',
      data.googleApiKey
    )
    Settings.setSettingForKey(
      'mapbox.username',
      data.mapboxUsername
    )
    Settings.setSettingForKey(
      'mapbox.publictoken',
      data.mapboxPublicToken
    )
    Settings.setSettingForKey(
      'mapbox.token',
      data.mapboxSecretToken
    )
  })

  webContents.executeJavaScript(
    `createMapUI(
      ${JSON.stringify(data)}
    )`
  )
    .then((res) => {
      console.log(res)
    })
    .catch((error) => {
      console.log(error)
    })

  browserWindow.loadURL(require('../resources/webview.html'))
}
