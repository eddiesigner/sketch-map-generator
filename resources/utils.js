export const initGoogleMapsScript = (apiKey) => {
  let initialized = !!window.google
  let resolveInitPromise
  let rejectInitPromise

  const initPromise = new Promise((resolve, reject) => {
    resolveInitPromise = resolve
    rejectInitPromise = reject
  })

  if (initialized) return initPromise

  initialized = true

  window.initGoogleMapsCallback = () => resolveInitPromise(window.google)

  const script = document.createElement('script')
  script.id = 'google-maps-script'
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsCallback`
  script.onerror = rejectInitPromise
  document.head.appendChild(script)

  return initPromise
}

export const getGoogleCoordinates = (geocoder, address) => {
  return new Promise((resolve, reject) => {
    if (!address) {
      reject('Please enter an address first.')
    }

    geocoder.geocode({ address }, (results, status) => {
      if (status !== 'OK' || !results[0]) {
        reject(status)
      }

      resolve(results[0].geometry.location)
    })
  })
}

export const getMapboxCoordinates = (secretToken, address) => {
  return new Promise((resolve, reject) => {
    if (!secretToken) {
      reject('Please save your secret token in the settings.')
    }

    if (!address) {
      reject('Please enter an address first.')
    }

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${address}.json?access_token=${secretToken}&limit=1`
    )
      .then((response) => response.json())
      .then((result) => {
        if (!result.message && result.features[0]) {
          resolve({
            lat: result.features[0].center[1],
            lng: result.features[0].center[0]
          })
        } else {
          reject(result.message)
        }
      })
      .catch((error) => {
        reject(error)
      })
  })
}

export const getGoogleAddress = (geocoder, marker) => {
  return new Promise((resolve, reject) => {
    const coordinates = {
      lat: marker.getPosition().lat(),
      lng: marker.getPosition().lng()
    }

    geocoder.geocode({ location: coordinates }, (results, status) => {
      if (status !== 'OK' || !results[0]) {
        reject(status)
      }

      resolve(results[0].formatted_address)
    })
  })
}

export const getMapboxAddress = (secretToken, marker) => {
  return new Promise((resolve, reject) => {
    const coordinates = marker.getLngLat()

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?access_token=${secretToken}&limit=1`
    )
      .then((response) => response.json())
      .then((result) => {
        if (result && result.features[0]) {
          resolve(result.features[0].place_name)
        }
      })
      .catch((error) => {
        reject(error)
      })
  })
}

export const getMapboxUserStyles = (secretToken, username) => {
  return new Promise((resolve, reject) => {
    fetch(
      `https://api.mapbox.com/styles/v1/${username}?access_token=${secretToken}`
    )
      .then((response) => response.json())
      .then((result) => {
        if (result.length > 0) {
          const styles = result.map((style) => {
            return `${style.name} - ${style.id}`
          })

          resolve(styles)
        } else {
          resolve([])
        }
      })
      .catch((error) => {
        reject(error)
      })
  })
}
