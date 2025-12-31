/**
 * Retrograde - Hash-based Router
 * Handles navigation between views using URL hash
 */
const Router = {
  routes: {},
  currentRoute: null,

  /**
   * Initialize router with route definitions
   * @param {Object} routeConfig - { pattern: handler } mappings
   * @returns {Object} Router instance
   */
  init(routeConfig) {
    this.routes = routeConfig

    window.addEventListener('hashchange', () => this.handleRouteChange())

    this.handleRouteChange()
    return this
  },

  /**
   * Parse current hash into route info
   * @returns {Object} { path: string, params: Object }
   */
  parseHash() {
    const hash = window.location.hash.slice(1) || '/timeline'
    const parts = hash.split('/').filter(Boolean)

    if (parts[0] === 'event' && parts[1]) {
      return {
        path: '/event/:id',
        params: { id: parts[1] }
      }
    }

    return {
      path: `/${parts[0] || 'timeline'}`,
      params: {}
    }
  },

  /**
   * Handle route change event
   */
  handleRouteChange() {
    const { path, params } = this.parseHash()
    const handler = this.routes[path]

    if (handler) {
      this.currentRoute = { path, params }
      handler(params)
    } else {
      this.navigate('/timeline')
    }
  },

  /**
   * Navigate to new route
   * @param {string} path - Route path (e.g., '/event/apple-ii')
   */
  navigate(path) {
    window.location.hash = path
  },

  /**
   * Get current route info
   * @returns {Object|null}
   */
  getCurrent() {
    return this.currentRoute
  },

  /**
   * Check if current route matches pattern
   * @param {string} pattern - Route pattern
   * @returns {boolean}
   */
  isActive(pattern) {
    return this.currentRoute && this.currentRoute.path === pattern
  }
}
