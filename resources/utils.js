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
  script.defer = true
  script.async = true
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapsCallback`
  script.onerror = rejectInitPromise
  document.head.appendChild(script)

  return initPromise
}

export const getGoogleCoordinates = (geocoder, address) => {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status !== 'OK' || !results[0]) {
        reject(status)
      }

      resolve(results[0].geometry.location)
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
