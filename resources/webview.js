import Vue from './vue'

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
  console.log(data)
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
        areSettingsSaved: false
      }
    },
    computed: {
      isGoogleProviderSelected() {
        return this.currentProvider === 'google'
      },
      zoomLevels() {
        const minZoomLevel = this.isGoogleProviderSelected ? 1 : 0
        const maxZoomLevel = this.isGoogleProviderSelected ? 16 : 40
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
      errorMessage() {
        if (this.isGoogleProviderSelected && !this.googleApiKey) {
          return '💡 Please save your Google API Key in the settings.'
        } else if (!this.isGoogleProviderSelected && (
            !this.mapboxUsername ||
            !this.mapboxPublicToken ||
            !this.mapboxSecretToken
          )
        ) {
          return '💡 Please save your Mapbox username, your public token and your secret token in the settings.'
        }

        return ''
      },
      disableGenerateMapButton() {
        return this.address.length === 0 || this.errorMessage.length > 0
      }
    },
    watch: {
      remember() {
        window.postMessage('toggleRemember', this.remember)
      }
    },
    created() {
      this.setMapData(data)
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
