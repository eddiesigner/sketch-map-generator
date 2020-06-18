import Vue from './vue'
import {
  initGoogleMapsScript,
  getGoogleCoordinates,
  getMapboxCoordinates,
  getGoogleAddress,
  getMapboxAddress,
  getMapboxUserStyles
} from './utils'

const interceptClickEvent = (event) => {
  const target = event.target.closest('a')

  if (target && target.getAttribute('target') === '_blank') {
    event.preventDefault()
    window.postMessage('externalLinkClicked', target.href)
  }
}

window.createMapUI = (data) => {
  app = new Vue({
    el: '#app',
    data() {
      return {
        currentProvider: data.provider ? data.provider : 'google',
        googleApiKey: data.googleApiKey ? data.googleApiKey : '',
        mapboxUsername: data.mapboxUsername ? data.mapboxUsername : '',
        mapboxPublicToken: data.mapboxPublicToken ? data.mapboxPublicToken : '',
        mapboxSecretToken: data.mapboxSecretToken ? data.mapboxSecretToken : '',
        remember: data.remember ? data.remember : false,
        address: '',
        zoom: '',
        defaultZoom: 15,
        googleDefaultStyle: 'roadmap',
        mapboxDefaultStyle: 'streets-v11',
        googleStyle: '',
        mapboxStyle: '',
        googleStyles: [
          'roadmap',
          'satellite',
          'hybrid',
          'terrain'
        ],
        userMapboxStyles: [],
        snazzy: '',
        showSettings: data.provider ? false : true,
        areSettingsSaved: false,
        loadingPreview: false,
        googleErrorLoadingPreview: false,
        mapboxErrorLoadingPreview: false,
        googlePreviewErrorMessage: '',
        mapboxPreviewErrorMessage: '',
        googleMap: null,
        mapboxMap: null,
        googleMarker: null,
        mapboxMarker: null,
        timer: null,
        googleGeocoder: null
      }
    },
    computed: {
      isGoogleProviderSelected() {
        return this.currentProvider === 'google'
      },
      zoomLevels() {
        const minZoomLevel = 1
        const maxZoomLevel = 20
        const levels = []

        for (let i = minZoomLevel; i <= maxZoomLevel; i++) {
          levels.push(i)
        }

        return levels
      },
      mapboxStyles() {
        const defaultMapboxStyles = [
          'streets-v11',
          'outdoors-v11',
          'light-v10',
          'dark-v10',
          'satellite-v9',
          'satellite-streets-v11',
          'navigation-preview-day-v4',
          'navigation-preview-night-v4',
          'navigation-guidance-day-v4',
          'navigation-guidance-night-v4'
        ]

        return this.userMapboxStyles.concat(defaultMapboxStyles)
      },
      mapboxUsernameForStyle() {
        return this.mapboxStyle.includes(' - ') ? this.mapboxUsername : 'mapbox'
      },
      mapboxUserStyle() {
        if (this.mapboxUsernameForStyle !== 'mapbox') {
          return this.mapboxStyle.split(' - ')[1]
        }

        return this.mapboxStyle
      },
      mapboxCurrentStyle() {
        return `mapbox://styles/${this.mapboxUsernameForStyle}/${this.mapboxUserStyle}`
      },
      isGoogleConfigurated() {
        return this.googleApiKey
      },
      isMapboxConfigurated() {
        return this.mapboxUsername &&
          this.mapboxPublicToken &&
          this.mapboxSecretToken
      },
      errorMessage() {
        if (
          this.isGoogleProviderSelected && !this.isGoogleConfigurated
        ) {
          return '💡 Please save your Google API Key in the settings.'
        } else if (
          !this.isGoogleProviderSelected && !this.isMapboxConfigurated
        ) {
          return '💡 Please save your Mapbox username, public token and secret token in the settings.'
        }

        return ''
      },
      disableGenerateMapButton() {
        return this.address.length === 0 || this.errorMessage.length > 0
      },
      previewTitle() {
        if (this.loadingPreview) {
          return 'Loading preview...'
        }

        return 'Nothing to preview'
      }
    },
    watch: {
      currentProvider(newValue) {
        if (!this[`${newValue}Map`]) {
          if (!this.isGoogleProviderSelected) {
            this.getUserOwnStyles()
          }

          this.initMap()
        }
      },
      remember() {
        window.postMessage('toggleRemember', this.remember)
      },
      address(newValue) {
        if (newValue) {
          if (
            !this[`${this.currentProvider}Map`] &&
            (
              !this.remember ||
              this[`${this.currentProvider}ErrorLoadingPreview`]
            )
          ) {
            this.initMap()
          }

          if (this.timer) {
            clearTimeout(this.timer)
          }

          this.timer = setTimeout(() => {
            if (this.isGoogleProviderSelected && this.isGoogleConfigurated) {
              getGoogleCoordinates(this.googleGeocoder, newValue)
                .then((location) => {
                  if (this.googleMap) {
                    this.googleMap.setCenter(location)
                    this.googleMarker.setPosition(location)
                  } else {
                    this.createGoogleMapInstance(location)
                  }
                })
                .catch((error) => {
                  this.loadingPreview = false
                  this.googleErrorLoadingPreview = true
                  this.googlePreviewErrorMessage = error
                })
            } else if (
              !this.isGoogleProviderSelected && this.isMapboxConfigurated
            ) {
              getMapboxCoordinates(this.mapboxSecretToken, newValue)
                .then((location) => {
                  if (this.mapboxMap) {
                    this.mapboxMap.setCenter(location)
                    this.mapboxMarker.setLngLat([location.lng, location.lat])
                  } else {
                    this.createMapboxMapInstance(location)
                  }
                })
                .catch((error) => {
                  this.loadingPreview = false
                  this.mapboxErrorLoadingPreview = true
                  this.mapboxPreviewErrorMessage = error
                })
            }
          }, 1000)
        }
      },
      zoom(newValue) {
        if (!this[`${this.currentProvider}Map`]) {
          return
        }

        this[`${this.currentProvider}Map`].setZoom(parseInt(newValue))
      },
      googleStyle(newValue) {
        if (!this.googleMap) {
          return
        }

        if (this.isGoogleProviderSelected) {
          this.googleMap.setMapTypeId(newValue)
        }
      },
      mapboxStyle() {
        if (!this.mapboxMap) {
          return
        }

        if (!this.isGoogleProviderSelected) {
          this.mapboxMap.setStyle(this.mapboxCurrentStyle)
        }
      },
      snazzy(newValue) {
        if (!this.googleMap) {
          return
        }

        if (this.isGoogleProviderSelected) {
          try {
            const styles = JSON.parse(newValue)

            if (!Array.isArray(styles)) {
              return
            }

            this.googleMap.setOptions({ styles })
          } catch (error) {
            console.log(error)
          }
        }
      }
    },
    created() {
      this.setMapData(data)

      if (!this.isGoogleProviderSelected) {
        this.getUserOwnStyles()
      }
    },
    mounted() {
      this.initMap()

      window.gm_authFailure = () => {
        this.loadingPreview = false
        this.googleErrorLoadingPreview = true
        this.googlePreviewErrorMessage = 'Google Maps JavaScript API error: Invalid Key'
      }
    },
    methods: {
      selectProvider(provider) {
        this.currentProvider = provider
        this.showSettings = false
      },
      displaySettings() {
        this.showSettings = true
      },
      setMapData(data) {
        if (this.remember) {
          this.address = data.address ? data.address : ''
          this.zoom = data.zoom ? data.zoom : this.defaultZoom
          this.googleStyle =
            data.googleStyle ? data.googleStyle : this.googleDefaultStyle
          this.mapboxStyle =
            data.mapboxStyle ? data.mapboxStyle : this.mapboxDefaultStyle
          this.snazzy = data.snazzy ? data.snazzy : ''
        } else {
          this.zoom = this.defaultZoom
          this.googleStyle = this.googleDefaultStyle
          this.mapboxStyle = this.mapboxDefaultStyle
        }
      },
      initMap() {
        if (!this.address) {
          return
        }

        if (this.isGoogleProviderSelected && this.isGoogleConfigurated) {
          this.loadGoogleMaps()
        } else if (this.isMapboxConfigurated) {
          this.initMapboxMap()
        }
      },
      loadGoogleMaps() {
        initGoogleMapsScript(this.googleApiKey)
          .then((response) => {
            this.loadingPreview = false
            this.initGoogleMap(response)
          })
          .catch((error) => {
            this.loadingPreview = false
            this.googleErrorLoadingPreview = true
            this.googlePreviewErrorMessage = error
          })
      },
      initGoogleMap(google) {
        this.loadingPreview = true
        this.googleGeocoder = new google.maps.Geocoder()

        getGoogleCoordinates(this.googleGeocoder, this.address)
          .then((location) => {
            this.createGoogleMapInstance(location)
          })
          .catch((error) => {
            this.loadingPreview = false
            this.googleErrorLoadingPreview = true
            this.googlePreviewErrorMessage = error
          })
      },
      createGoogleMapInstance(location) {
        this.loadingPreview = false
        this.googleErrorLoadingPreview = false
        this.googlePreviewErrorMessage = ''

        const mapElement = document.getElementById('google-map')
        let options

        try {
          options = {
            center: location,
            zoom: parseFloat(this.zoom),
            mapTypeId: this.googleStyle,
            streetViewControl: false,
            mapTypeControl: false,
            styles: this.snazzy.length > 0 ? JSON.parse(this.snazzy) : ''
          }
        } catch (error) {
          console.log(error)
          return
        }

        this.googleMap = new google.maps.Map(mapElement, options)

        this.googleMarker = new google.maps.Marker({
          map: this.googleMap,
          position: location,
          draggable: true,
          title: 'Drag me!'
        })

        google.maps.event.addListener(this.googleMarker, 'dragend', () => {
          getGoogleAddress(this.googleGeocoder, this.googleMarker)
            .then((address) => {
              this.address = address
            })
            .catch((error) => {
              console.log(error)
            })
        })

        this.googleMap.addListener('zoom_changed', () => {
          this.zoom = this.googleMap.getZoom()
        })
      },
      initMapboxMap() {
        this.loadingPreview = true

        getMapboxCoordinates(this.mapboxSecretToken, this.address)
          .then((location) => {
            this.createMapboxMapInstance(location)
          })
          .catch((error) => {
            this.loadingPreview = false
            this.mapboxErrorLoadingPreview = true
            this.mapboxPreviewErrorMessage = error
          })
      },
      createMapboxMapInstance(location) {
        this.loadingPreview = false
        this.mapboxErrorLoadingPreview = false
        this.mapboxPreviewErrorMessage = ''

        mapboxgl.accessToken = this.mapboxPublicToken

        const options = {
          container: 'mapbox-map',
          style: this.mapboxCurrentStyle,
          center: [location.lng, location.lat],
          zoom: parseInt(this.zoom)
        }

        this.mapboxMap = new mapboxgl.Map(options)

        setTimeout(() => {
          window.dispatchEvent(new Event('resize'))
        }, 10)

        this.mapboxMap.addControl(
          new mapboxgl.NavigationControl(),
          'bottom-right'
        )

        this.mapboxMap.on('zoomend', () => {
          this.zoom = parseInt(this.mapboxMap.getZoom())
        })

        this.mapboxMarker = new mapboxgl.Marker({
          draggable: true
        })
          .setLngLat([location.lng, location.lat])
          .addTo(this.mapboxMap)

        this.mapboxMarker.on('dragend', () => {
          getMapboxAddress(this.mapboxSecretToken, this.mapboxMarker)
            .then((address) => {
              this.address = address
            })
            .catch((error) => {
              console.log(error)
            })
        })
      },
      getUserOwnStyles() {
        if (!this.isMapboxConfigurated) {
          return
        }

        getMapboxUserStyles(this.mapboxSecretToken, this.mapboxUsername)
          .then((styles) => {
            if (styles.length > 0) {
              this.userMapboxStyles = styles
            }
          })
          .catch((error) => {
            console.log(error)
          })
      },
      generateMap() {
        let location = null

        if (!this.isGoogleProviderSelected && this.mapboxMap) {
          location = this.mapboxMap.getCenter()
        }

        window.postMessage('generateMap', {
          provider: this.currentProvider,
          address: this.address,
          zoom: this.zoom,
          googleStyle: this.googleStyle,
          mapboxStyle: this.mapboxStyle,
          mapboxUsername: this.mapboxUsernameForStyle,
          snazzy: this.snazzy,
          location
        })
      },
      saveSettings() {
        window.postMessage('saveSettings', {
          googleApiKey: this.googleApiKey,
          mapboxUsername: this.mapboxUsername,
          mapboxPublicToken: this.mapboxPublicToken,
          mapboxSecretToken: this.mapboxSecretToken
        })

        this.areSettingsSaved = true
      }
    }
  })
}

// listen for link click events at the document level
document.addEventListener('click', interceptClickEvent)

// disable the context menu (eg. the right click menu) to have a more native feel
document.addEventListener('contextmenu', (e) => {
  e.preventDefault()
})
