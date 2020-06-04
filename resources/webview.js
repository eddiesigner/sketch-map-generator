import Vue from './vue'
import {
  initGoogleMapsScript,
  getGoogleCoordinates,
  getGoogleAddress
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
        style: '',
        snazzy: '',
        showSettings: false,
        areSettingsSaved: false,
        loadingPreview: false,
        errorLoadingPreview: false,
        previewErrorMesasge: '',
        map: null,
        marker: null,
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
          styles = [
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
        }

        return styles
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
      remember() {
        window.postMessage('toggleRemember', this.remember)
      },
      address(newValue) {
        if (!this.map) {
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
                  this.map.setCenter(location)
                  this.marker.setPosition(location)
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
        if (!this.map) {
          return
        }

        if (this.isGoogleProviderSelected) {
          this.map.setZoom(parseInt(newValue))
        }
      },
      style(newValue) {
        if (!this.map) {
          return
        }

        if (this.isGoogleProviderSelected) {
          this.map.setMapTypeId(newValue)
        }
      },
      snazzy(newValue) {
        if (!this.map) {
          return
        }

        if (this.isGoogleProviderSelected) {
          try {
            const styles = JSON.parse(newValue)

            if (!Array.isArray(styles)) {
              return
            }

            this.map.setOptions({ styles })
          } catch (error) {
            console.log(error)
          }
        }
      }
    },
    created() {
      this.setMapData(data)
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
          this.address = data.address ? data.address : '',
            this.zoom = data.zoom ? data.zoom : '',
            this.style = data.style ? data.style : '',
            this.snazzy = data.snazzy ? data.snazzy : ''
        }
      },
      initMap() {
        if (this.isGoogleConfigurated) {
          this.loadGoogleMaps()
        } else if (this.isMapboxConfigurated) {
          this.loadMapbox()
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

            const mapElement = document.getElementById('map')
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

            this.map = new google.maps.Map(mapElement, options)

            this.marker = new google.maps.Marker({
              map: this.map,
              position: location,
              draggable: true,
              title: 'Drag me!'
            })

            google.maps.event.addListener(this.marker, 'dragend', () => {
              getGoogleAddress(this.googleGeocoder, this.marker)
                .then((address) => {
                  this.address = address
                })
                .catch((error) => {
                  console.log(error)
                })
            })

            this.map.addListener('zoom_changed', () => {
              this.zoom = this.map.getZoom()
            })
          })
          .catch((error) => {
            this.errorLoadingPreview = true
            this.previewErrorMesasge = error
          })
      },
      loadMapbox() {
        this.loadingPreview = true
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
