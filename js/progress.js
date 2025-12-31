/**
 * Retrograde - Progress Manager
 * Handles LocalStorage persistence for user progress
 */
const Progress = {
  STORAGE_KEY: 'retrograde_progress',

  state: {
    events: {},
    lastVisited: null,
    updatedAt: null
  },

  /**
   * Initialize progress manager, load from LocalStorage
   * @returns {Object} Progress manager instance
   */
  init() {
    this.load()
    return this
  },

  /**
   * Load progress from LocalStorage
   */
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.state = { ...this.state, ...parsed }
      }
    } catch (e) {
      console.warn('Failed to load progress:', e)
    }
  },

  /**
   * Save current state to LocalStorage
   */
  save() {
    try {
      this.state.updatedAt = new Date().toISOString()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state))
    } catch (e) {
      console.warn('Failed to save progress:', e)
    }
  },

  /**
   * Get progress for specific event
   * @param {string} eventId
   * @returns {Object} Event progress object
   */
  getEventProgress(eventId) {
    if (!this.state.events[eventId]) {
      this.state.events[eventId] = {
        visited: false,
        lessonsCompleted: [],
        tabsViewed: [],
        completedAt: null
      }
    }
    return this.state.events[eventId]
  },

  /**
   * Mark event as visited
   * @param {string} eventId
   */
  markVisited(eventId) {
    const progress = this.getEventProgress(eventId)
    progress.visited = true
    this.state.lastVisited = eventId
    this.save()
  },

  /**
   * Check if event has been visited
   * @param {string} eventId
   * @returns {boolean}
   */
  isVisited(eventId) {
    return this.getEventProgress(eventId).visited
  },

  /**
   * Get overall progress stats
   * @returns {Object} { visited: number, total: number, percentage: number }
   */
  getOverallStats() {
    const eventIds = Object.keys(this.state.events)
    const visited = eventIds.filter(id => this.state.events[id].visited).length
    return {
      visited,
      total: eventIds.length,
      percentage: eventIds.length > 0 ? Math.round((visited / eventIds.length) * 100) : 0
    }
  },

  /**
   * Reset all progress
   */
  reset() {
    this.state = {
      events: {},
      lastVisited: null,
      updatedAt: null
    }
    this.save()
  }
}
