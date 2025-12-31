/**
 * Retrograde - Utility Functions
 * Shared helpers for DOM manipulation, formatting, and calculations
 */
const Utils = {
  /**
   * Query selector shorthand
   * @param {string} selector - CSS selector
   * @param {Element} context - Parent element (default: document)
   * @returns {Element|null}
   */
  $(selector, context = document) {
    return context.querySelector(selector)
  },

  /**
   * Query selector all shorthand
   * @param {string} selector - CSS selector
   * @param {Element} context - Parent element
   * @returns {NodeList}
   */
  $$(selector, context = document) {
    return context.querySelectorAll(selector)
  },

  /**
   * Create element with attributes and children
   * @param {string} tag - HTML tag name
   * @param {Object} attrs - Attributes object
   * @param {Array|string} children - Child elements or text
   * @returns {Element}
   */
  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag)
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value
      } else if (key === 'dataset') {
        Object.assign(el.dataset, value)
      } else if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), value)
      } else if (key === 'style') {
        el.style.cssText = value
      } else {
        el.setAttribute(key, value)
      }
    })

    if (typeof children === 'string') {
      el.textContent = children
    } else if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child))
        } else if (child) {
          el.appendChild(child)
        }
      })
    }

    return el
  },

  /**
   * Calculate year position on timeline (0-100%)
   * @param {number} year - Event year
   * @param {number} minYear - Timeline start year
   * @param {number} maxYear - Timeline end year
   * @returns {number} Percentage position
   */
  yearToPosition(year, minYear, maxYear) {
    if (maxYear === minYear) return 50
    return ((year - minYear) / (maxYear - minYear)) * 100
  },

  /**
   * Group events by year for clustering
   * @param {Array} events - Array of event objects
   * @returns {Map} Year -> Array of events
   */
  groupByYear(events) {
    const groups = new Map()
    events.forEach(event => {
      const year = event.year
      if (!groups.has(year)) {
        groups.set(year, [])
      }
      groups.get(year).push(event)
    })
    return groups
  },

  /**
   * Format year with decade label
   * @param {number} year
   * @returns {string} e.g., "1982 (80s)"
   */
  formatYearWithDecade(year) {
    const decade = Math.floor(year / 10) * 10
    return `${year} ('${decade.toString().slice(-2)}s)`
  },

  /**
   * Debounce function
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function}
   */
  debounce(fn, delay) {
    let timeoutId
    return (...args) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn.apply(this, args), delay)
    }
  },

  /**
   * Generate slug from string
   * @param {string} str - String to slugify
   * @returns {string}
   */
  slugify(str) {
    return str.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }
}
