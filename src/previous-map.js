import sketch from 'sketch/dom'
import UI from 'sketch/ui'
import Settings from 'sketch/settings'
import {
  isSketchSupportedVersion,
  isOneLayerSelected,
  isLayerShape,
  setLayerName,
  makeProviderImageUrl,
  getImageFromURL,
  fillLayer
} from './common'

export default () => {
  if (!isSketchSupportedVersion()) {
    UI.message('⚠️ This plugin only works on Sketch 53 or above.')
    return
  }

  const doc = sketch.getSelectedDocument()
  const selection = doc.selectedLayers

  if (!isOneLayerSelected(selection)) {
    UI.message('⚠️ Please select one layer.')
    return
  }

  const layer = selection.layers[0]

  if (!isLayerShape(layer)) {
    UI.message('⚠️ Please select a shape layer.')
    return
  }

  const lastProvider = Settings.settingForKey('map.lastprovider')

  if (!lastProvider) {
    UI.message('⚠️ First you must generate a map with either Google Maps or Mapbox.')
    return
  }

  const googleApiKey = Settings.settingForKey('google.token')
  const mapboxUsername = Settings.settingForKey('mapbox.username')
  const mapboxSecretToken = Settings.settingForKey('mapbox.token')

  if (lastProvider === 'google' && !googleApiKey) {
    UI.message('⚠️ Please make sure you have saved your Google API Key in the plugin settings.')
    return
  }

  if (lastProvider === 'mapbox' && (!mapboxUsername || !mapboxSecretToken)) {
    UI.message('⚠️ Please make sure you have saved your Mapbox username and your secret token in the plugin settings.')
    return
  }

  const address = Settings.settingForKey('map.address')
  const zoom = Settings.settingForKey('map.zoom')
  const googleStyle = Settings.settingForKey('google.style')
  const mapboxStyle = Settings.settingForKey('mapbox.style')
  const snazzy = Settings.settingForKey('google.snazzy')
  const location = Settings.settingForKey('mapbox.location')

  if (!address || !zoom || (lastProvider === 'mapbox' && !location)) {
    UI.message('⚠️ Please first generate a map with at least a location and a zoom value.')
    return
  }

  const data = {
    mapboxUsername: mapboxStyle.includes(' - ') ? mapboxUsername : 'mapbox',
    address,
    zoom,
    googleStyle,
    mapboxStyle,
    snazzy,
    location
  }

  const requestURL = makeProviderImageUrl(lastProvider, data, layer)

  if (!requestURL && lastProvider === 'mapbox') {
    UI.message('⚠️ Please make sure to enter a correct Mapbox secret token in the settings.')
    return
  }

  UI.message('⏰ Generating map...')

  getImageFromURL(requestURL)
    .then((imageData) => {
      fillLayer(layer, imageData)
      setLayerName(layer, data.address, data.zoom)
      UI.message('🎉 Map generated!')
    })
    .catch((error) => {
      console.log(error)
      UI.message(`⚠️ ${error}`)
    })
}
