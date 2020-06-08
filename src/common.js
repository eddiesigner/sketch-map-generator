import sketch from 'sketch/dom'

export const isSketchSupportedVersion = () => {
  const sketchVersion = sketch.version.sketch

  if (sketchVersion >= '53') {
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
  layer.name = `Address: - ${address} Zoom: ${zoom}`
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

      for (let x = 0, sl = stylers.length; x < sl; x++) {
        const styleItem = stylers[x]
        const key = Object.keys(styleItem)[0]

        style = (style) ? `${style}${separator}` : ''
        style += `${key}:${(isColor(styleItem[key]) ? toColor(styleItem[key]) : styleItem[key])}`
      }

      items.push(`${target}${separator}${style}`)
    }
  }

  return `&style=${items.join('&style=')}`
}
