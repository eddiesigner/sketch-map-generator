import Vue from './vue'
import {
  initGoogleMapsScript,
  getGoogleCoordinates,
  getMapboxCoordinates,
  getGoogleAddress,
  getMapboxAddress,
  getMapboxUserStyles
} from './utils'

/**
 * 
 * @param {Event} event 
 */
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
        currentProvider: data.provider ? data.provider : '',
        googleApiKey: data.googleApiKey ? data.googleApiKey : '',
        mapboxUsername: data.mapboxUsername ? data.mapboxUsername : '',
        mapboxPublicToken: data.mapboxPublicToken ? data.mapboxPublicToken : '',
        mapboxSecretToken: data.mapboxSecretToken ? data.mapboxSecretToken : '',
        remember: data.remember ? data.remember : false,
        address: '',
        zoom: '',
        defaultZoom: 15,
        style: '',
        userMapboxStyles: [],
        snazzy: '',
        showSettings: false,
        areSettingsSaved: false,
        loadingPreview: false,
        errorLoadingPreview: false,
        previewErrorMesasge: '',
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
        const minZoomLevel = this.isGoogleProviderSelected ? 1 : 0
        const maxZoomLevel = this.isGoogleProviderSelected ? 18 : 40
        const levels = []

        for (let i = minZoomLevel; i <= maxZoomLevel; i++) {
          const zoomLevel = this.isGoogleProviderSelected ? i : i / 2

          if (zoomLevel > 0) {
            levels.push(zoomLevel)
          }
        }

        return levels
      },
      mapStyles() {
        let styles = []

        if (this.isGoogleProviderSelected) {
          styles = [
            'roadmap',
            'satellite',
            'hybrid',
            'terrain'
          ]
        } else {
          const mapboxStyles = [
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

          styles = this.userMapboxStyles.concat(mapboxStyles)
        }

        return styles
      },
      defaultStyle() {
        return this.isGoogleProviderSelected ? 'roadmap' : 'streets-v11'
      },
      mapboxUsernameForStyle() {
        return this.style.includes(' - ') ? this.mapboxUsername : 'mapbox'
      },
      mapboxUserStyle() {
        if (this.mapboxUsernameForStyle !== 'mapbox') {
          return this.style.split(' - ')[1]
        }

        return this.style
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
          this.isGoogleProviderSelected && !this.isMapboxConfigurated
        ) {
          return '💡 Please save your Mapbox username, your public token and your secret token in the settings.'
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
      currentProvider() {
        if (!this.zoom || !this.zoomLevels.includes(this.zoom)) {
          this.zoom = this.defaultZoom
        }

        if (!this.style || !this.mapStyles.includes(this.style)) {
          this.style = this.defaultStyle
        }
      },
      remember() {
        window.postMessage('toggleRemember', this.remember)
      },
      address(newValue) {
        if (!this[`${this.currentProvider}Map`]) {
          return
        }

        if (this.timer) {
          clearTimeout(this.timer)
        }

        if (newValue) {
          this.timer = setTimeout(() => {
            if (this.isGoogleProviderSelected) {
              getGoogleCoordinates(this.googleGeocoder, this.address)
                .then((location) => {
                  this.googleMap.setCenter(location)
                  this.googleMarker.setPosition(location)
                })
                .catch((error) => {
                  this.errorLoadingPreview = true
                  this.previewErrorMesasge = error
                })
            }
          }, 1000)
        }
      },
      zoom(newValue) {
        if (!this[`${this.currentProvider}Map`]) {
          return
        }

        if (this.isGoogleProviderSelected) {
          this.googleMap.setZoom(parseInt(newValue))
        }
      },
      style(newValue) {
        if (!this[`${this.currentProvider}Map`]) {
          return
        }

        if (this.isGoogleProviderSelected) {
          this.googleMap.setMapTypeId(newValue)
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
        getMapboxUserStyles(this.mapboxSecretToken, this.mapboxUsername)
          .then((styles) => {
            if (styles.length > 0) {
              this.userMapboxStyles = styles
            }
          })
          .catch((error) => {
            console.log(error)
          })
      }
    },
    mounted() {
      this.initMap()
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
          this.style =
          data.style && this.mapStyles.includes(data.style) ?
            data.style :
            this.defaultStyle
          this.snazzy = data.snazzy ? data.snazzy : ''
        } else {
          this.zoom = this.defaultZoom
          this.style = this.defaultStyle
        }
      },
      initMap() {
        if (this.isGoogleProviderSelected && this.isGoogleConfigurated) {
          this.loadGoogleMaps()
        } else if (this.isMapboxConfigurated) {
          this.initMapboxMap()
        }
      },
      loadGoogleMaps() {
        this.loadingPreview = true

        initGoogleMapsScript(this.googleApiKey)
          .then((response) => {
            this.initGoogleMap(response)
          })
          .catch((error) => {
            this.loadingPreview = false
            this.errorLoadingPreview = true
            console.log(error)
          })
      },
      initGoogleMap(google) {
        this.googleGeocoder = new google.maps.Geocoder()

        getGoogleCoordinates(this.googleGeocoder, this.address)
          .then((location) => {
            this.loadingPreview = false

            const mapElement = document.getElementById('google-map')
            let options

            try {
              options = {
                center: location,
                zoom: parseFloat(this.zoom),
                mapTypeId: this.style,
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
          })
          .catch((error) => {
            this.errorLoadingPreview = true
            this.previewErrorMesasge = error
          })
      },
      initMapboxMap() {
        this.loadingPreview = true

        getMapboxCoordinates(this.mapboxSecretToken, this.address)
          .then((location) => {
            this.loadingPreview = false

            mapboxgl.accessToken = this.mapboxPublicToken

            const options = {
              container: 'mapbox-map',
              style: `mapbox://styles/${this.mapboxUsernameForStyle}/${this.mapboxUserStyle}`,
              center: [location.lng, location.lat],
              zoom: parseInt(this.zoom)
            }

            this.mapboxMap = new mapboxgl.Map(options)

            setTimeout(() => {
              window.dispatchEvent(new Event('resize'))
            }, 10)

            this.mapboxMap.addControl(new mapboxgl.NavigationControl())

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
          })
          .catch((error) => {
            this.errorLoadingPreview = true
            this.previewErrorMesasge = error
          })
      },
      generateMap() {
        window.postMessage('generateMap', {
          address: this.address,
          zoom: this.zoom,
          style: this.style,
          snazzy: this.snazzy
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

        setTimeout(() => {
          this.areSettingsSaved = false
        }, 3000)
      }
    }
  })
}

// listen for link click events at the document level
document.addEventListener('click', interceptClickEvent)

// disable the context menu (eg. the right click menu) to have a more native feel
document.addEventListener('contextmenu', (e) => {
  // e.preventDefault()
})
