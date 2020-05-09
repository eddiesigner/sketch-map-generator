import sketch from 'sketch/dom'

/**
 * 
 * @returns {Boolean}
 */
export const isSketchSupportedVersion = () => {
  const sketchVersion = sketch.version.sketch

  if (sketchVersion >= '53') {
    return true
  }

  return false
}

/**
 *
 * @returns {Boolean}
 */
export const isOneLayerSelected = (selection) => {
  if (selection.length === 1) {
    return true
  }

  return false
}

/**
 *
 * @returns {Boolean}
 */
export const isLayerShape = (layer) => {
  if (layer.type === 'Shape' || layer.type === 'ShapePath') {
    return true
  }

  return false
}
