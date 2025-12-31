/**
 * Retrograde - Events Data Loader
 * Fetches and validates event data from JSON files
 */
const EventsLoader = {
  state: {
    events: [],
    isLoaded: false,
    error: null
  },

  /**
   * Initialize loader and fetch events
   * @returns {Promise<Array>} Array of event objects
   */
  async init() {
    if (this.state.isLoaded) {
      return this.state.events
    }

    try {
      const registry = await this.fetchJSON('./data/events.json')
      const enabledEvents = registry.events.filter(e => e.enabled)

      const eventPromises = enabledEvents.map(entry =>
        this.loadEventMeta(entry.id)
      )

      const results = await Promise.allSettled(eventPromises)

      this.state.events = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year
          return (a.month || 1) - (b.month || 1)
        })

      this.state.isLoaded = true
      return this.state.events

    } catch (error) {
      this.state.error = error
      console.error('Failed to load events:', error)
      throw error
    }
  },

  /**
   * Fetch JSON with error handling
   * @param {string} url - JSON file URL
   * @returns {Promise<Object>}
   */
  async fetchJSON(url) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`)
    }
    return response.json()
  },

  /**
   * Load metadata for single event
   * @param {string} eventId
   * @returns {Promise<Object>} Event metadata with id
   */
  async loadEventMeta(eventId) {
    const meta = await this.fetchJSON(`./events/${eventId}/meta.json`)
    return {
      id: eventId,
      ...meta,
      title: meta.title || 'Untitled',
      year: meta.year || 1977,
      category: meta.category || 'general',
      summary: meta.summary || ''
    }
  },

  /**
   * Get event by ID
   * @param {string} eventId
   * @returns {Object|null}
   */
  getEvent(eventId) {
    return this.state.events.find(e => e.id === eventId) || null
  },

  /**
   * Calculate year range from loaded events
   * @returns {Object} { min: number, max: number }
   */
  getYearRange() {
    if (this.state.events.length === 0) {
      return { min: 1977, max: new Date().getFullYear() }
    }
    const years = this.state.events.map(e => e.year)
    return {
      min: Math.min(...years),
      max: Math.max(...years)
    }
  },

  /**
   * Get events grouped by decade
   * @returns {Map<string, Array>}
   */
  getEventsByDecade() {
    const decades = new Map()
    this.state.events.forEach(event => {
      const decade = `${Math.floor(event.year / 10) * 10}s`
      if (!decades.has(decade)) {
        decades.set(decade, [])
      }
      decades.get(decade).push(event)
    })
    return decades
  }
}
