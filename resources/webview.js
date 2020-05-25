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
  app = new Vue({
    el: '#app',
    data() {
      return {
        currentProvider: data.provider,
        googleApiKey: data.googleApiKey,
        mapboxUsername: data.mapboxUsername,
        mapboxPublicToken: data.mapboxPublicToken,
        mapboxSecretToken: data.mapboxSecretToken,
        address: '',
        zoom: '',
        style: '',
        snazzyStyle: '',
        remember: false,
        showSettings: false,
        errorMessage: ''
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
      saveSettings() {
        window.postMessage('saveSettings', {
          googleApiKey: this.googleApiKey,
          mapboxUsername: this.mapboxUsername,
          mapboxPublicToken: this.mapboxPublicToken,
          mapboxSecretToken: this.mapboxSecretToken
        })
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
