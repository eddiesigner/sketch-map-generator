import sketch from 'sketch/dom'
import UI from 'sketch/ui'
import Settings from 'sketch/settings'
import BrowserWindow from 'sketch-module-web-view'
import { getWebview } from 'sketch-module-web-view/remote'
import {
  isSketchSupportedVersion,
  isOneLayerSelected,
  isLayerShape
} from './common'

const webviewIdentifier = 'sketch-dark-mode.webview'
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

  const selection = doc.selectedLayers

  if (!isOneLayerSelected(selection)) {
    UI.message('⚠️ You have to select one layer.')
    return
  }

  const layer = selection.layers[0]

  if (!isLayerShape(layer)) {
    UI.message('⚠️ You have to select a shape layer.')
    return
  }

  const windowOptions = {
    identifier: webviewIdentifier,
    parent: doc,
    width: 800,
    minWidth: 800,
    maxWidth: 800,
    height: 800,
    minHeight: 800,
    maxHeight: 800,
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

  webContents.executeJavaScript(
    `createMapUI(
      ${JSON.stringify(provider)}
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
