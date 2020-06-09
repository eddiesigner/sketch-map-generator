import sketch from 'sketch/dom'
import Settings from 'sketch/settings'

export const isSketchSupportedVersion = () => {
  const sketchVersion = sketch.version.sketch

  if (sketchVersion >= '53') {
    return true
  }

  return false
}

export const hasSketchFillTypeSupport = () => {
  const sketchVersion = sketch.version.sketch

  if (sketchVersion >= '55') {
    return true
  }

  return false
}

export const isOneLayerSelected = (selection) => {
  if (selection.length === 1) {
    return true
  }

  return false
}

export const isLayerShape = (layer) => {
  if (layer.type === 'Shape' || layer.type === 'ShapePath') {
    return true
  }

  return false
}

export const setLayerName = (layer, address, zoom) => {
  layer.name = `Address: ${address} - Zoom: ${zoom}`
}

export const makeProviderImageUrl = (provider, data, layer) => {
  const token =
    provider === 'google' ?
    Settings.settingForKey('google.token') :
    Settings.settingForKey('mapbox.token')

  let requestURL = ''

  if (provider === 'google') {
    requestURL = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(data.address)}&zoom=${data.zoom}&size=${parseInt(layer.frame.width)}x${parseInt(layer.frame.height)}&maptype=${data.googleStyle}&scale=2${parseStyle(data.snazzy)}&key=${token}`
  } else {
    const mapboxStyle =
      data.mapboxStyle.includes(' - ') ?
      data.mapboxStyle.split(' - ')[1] :
      data.mapboxStyle

    requestURL = `https://api.mapbox.com/styles/v1/${data.mapboxUsername}/${mapboxStyle}/static/${data.location.lng},${data.location.lat},${data.zoom},0,0/${parseInt(layer.frame.width)}x${parseInt(layer.frame.height)}@2x?access_token=${token}`
  }

  return requestURL
}

export const getImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => response.blob())
      .then((image) => {
        resolve(image)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

export const fillLayer = (layer, imageData) => {
  const Style = sketch.Style
  const imageFile = NSImage.alloc().initWithData(imageData)
  const image = MSImageData.alloc().initWithImage(imageFile)
  const fillTypeName = hasSketchFillTypeSupport() ? 'fillType' : 'fill'

  layer.style.fills = [
    {
      [`${fillTypeName}`]: 'Pattern',
      pattern: {
        patternType: Style.PatternFillType.Fill,
        image
      }
    }
  ]
}

export const isColor = (value) => {
  return /^#[0-9a-f]{6}$/i.test(value.toString())
}

export const toColor = (value) => {
  return `0x${value.slice(1)}`
}

export const parseJSON = (jsonString) => {
  try {
    const o = JSON.parse(jsonString)

    if (o && typeof o === 'object' && o !== null) {
      return o
    }
  }
  catch (error) {
    console.log(error)
    return null
  }
}

export const parseStyle = (jsonString) => {
  const items = []
  const separator = '%7C'
  let json

  json = parseJSON(jsonString)

  items.length = 0

  for (let i = 0, l = json.length; i < l; i++) {
    const item = json[i]
    const hasFeature = item.hasOwnProperty('featureType')
    const hasElement = item.hasOwnProperty('elementType')
    const stylers = item.stylers
    let target = ''
    let style = ''

    if (!hasFeature && !hasElement) {
      target = 'feature:all'
    } else {
      if (hasFeature) {
        target = `feature:${item.featureType}`
      }

      if (hasElement) {
        target = (target) ? `${target}${separator}` : ''
        target += `element:${item.elementType}`
      }
    }

    for (let x = 0, sl = stylers.length; x < sl; x++) {
      const styleItem = stylers[x]
      const key = Object.keys(styleItem)[0]

      style = (style) ? `${style}${separator}` : ''
      style += `${key}:${(isColor(styleItem[key]) ? toColor(styleItem[key]) : styleItem[key])}`
    }

    items.push(`${target}${separator}${style}`)
  }

  return `&style=${items.join('&style=')}`
}
