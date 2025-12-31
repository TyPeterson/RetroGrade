/**
 * Retrograde - Timeline Renderer
 * Generates and manages the interactive timeline UI
 */
const Timeline = {
  container: null,

  /**
   * Initialize timeline
   * @param {string} containerSelector - CSS selector for container
   * @returns {Object} Timeline instance
   */
  init(containerSelector) {
    this.container = Utils.$(containerSelector)
    if (!this.container) {
      console.error('Timeline container not found:', containerSelector)
    }
    return this
  },

  /**
   * Render timeline with events
   * @param {Array} events - Array of event objects
   */
  render(events) {
    if (!this.container || events.length === 0) return

    const { min: minYear, max: maxYear } = EventsLoader.getYearRange()
    const yearGroups = Utils.groupByYear(events)

    this.container.innerHTML = ''

    const timeline = Utils.createElement('div', { className: 'timeline' }, [
      this.createYearAxis(minYear, maxYear),
      this.createTrack(),
      this.createEventsLayer(events, yearGroups, minYear, maxYear)
    ])

    this.container.appendChild(timeline)
    this.attachEventHandlers()
  },

  /**
   * Create year axis with decade markers
   * @param {number} minYear - Start year
   * @param {number} maxYear - End year
   * @returns {Element}
   */
  createYearAxis(minYear, maxYear) {
    const axis = Utils.createElement('div', { className: 'timeline-axis' })

    const startDecade = Math.floor(minYear / 10) * 10
    const endDecade = Math.ceil(maxYear / 10) * 10

    for (let year = startDecade; year <= endDecade; year += 10) {
      const position = Utils.yearToPosition(year, minYear, maxYear)
      const marker = Utils.createElement('div', {
        className: 'timeline-decade-marker',
        style: `left: ${position}%`
      }, [
        Utils.createElement('span', { className: 'decade-label' }, `${year}`)
      ])
      axis.appendChild(marker)
    }

    return axis
  },

  /**
   * Create timeline track (horizontal line)
   * @returns {Element}
   */
  createTrack() {
    return Utils.createElement('div', { className: 'timeline-track' }, [
      Utils.createElement('div', { className: 'timeline-track-line' })
    ])
  },

  /**
   * Create events layer with positioned dots
   * @param {Array} events - Event objects
   * @param {Map} yearGroups - Events grouped by year
   * @param {number} minYear - Timeline start year
   * @param {number} maxYear - Timeline end year
   * @returns {Element}
   */
  createEventsLayer(events, yearGroups, minYear, maxYear) {
    const layer = Utils.createElement('div', { className: 'timeline-events' })

    events.forEach(event => {
      const position = Utils.yearToPosition(event.year, minYear, maxYear)
      const sameYearEvents = yearGroups.get(event.year)
      const yOffset = this.calculateVerticalOffset(event, sameYearEvents)

      const dotClasses = `timeline-event-dot category-${event.category}`
      const dot = Utils.createElement('button', {
        className: Progress.isVisited(event.id) ? `${dotClasses} visited` : dotClasses,
        dataset: { eventId: event.id },
        'aria-label': `${event.title} (${event.year})`
      })

      const thumbnailPath = `./events/${event.id}/${event.thumbnail}`
      const thumbnail = Utils.createElement('img', {
        className: 'event-thumbnail',
        src: thumbnailPath,
        alt: event.title
      })
      dot.appendChild(thumbnail)

      // Add progress ring if event has tutorial
      if (event.tutorial?.enabled && event.tutorial.lessonCount) {
        const completion = Progress.getTutorialCompletion(event.id, event.tutorial.lessonCount)
        if (completion > 0 && completion < 100) {
          const ring = this.createProgressRing(completion)
          dot.appendChild(ring)
        }
      }

      const tooltip = this.createEventTooltip(event)
      dot.appendChild(tooltip)

      const label = Utils.createElement('div', { className: 'event-label' }, [
        Utils.createElement('span', { className: 'event-label-year' }, event.year.toString()),
        Utils.createElement('span', { className: 'event-label-title' }, event.title)
      ])

      const eventContainer = Utils.createElement('div', {
        className: 'timeline-event-container',
        style: `left: ${position}%; top: calc(50% + ${yOffset}px)`
      }, [dot, label])

      layer.appendChild(eventContainer)
    })

    return layer
  },

  /**
   * Calculate vertical offset for year clustering
   * @param {Object} event - Event object
   * @param {Array} sameYearEvents - Events in same year
   * @returns {number} Offset in pixels
   */
  calculateVerticalOffset(event, sameYearEvents) {
    if (sameYearEvents.length === 1) return 0
    const index = sameYearEvents.indexOf(event)
    const spacing = 30
    return (index - (sameYearEvents.length - 1) / 2) * spacing
  },

  /**
   * Create tooltip for event dot
   * @param {Object} event - Event object
   * @returns {Element}
   */
  createEventTooltip(event) {
    return Utils.createElement('div', { className: 'timeline-tooltip' }, [
      Utils.createElement('span', { className: 'tooltip-year' }, event.year.toString()),
      Utils.createElement('span', { className: 'tooltip-title' }, event.title),
      Utils.createElement('span', { className: 'tooltip-category' }, event.category)
    ])
  },

  /**
   * Attach click handlers for navigation
   */
  attachEventHandlers() {
    const dots = Utils.$$('.timeline-event-dot', this.container)
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const eventId = dot.dataset.eventId
        Router.navigate(`/event/${eventId}`)
      })
    })
  },

  /**
   * Update visited state for single event
   * @param {string} eventId - Event ID
   */
  markEventVisited(eventId) {
    const dot = Utils.$(`.timeline-event-dot[data-event-id="${eventId}"]`, this.container)
    if (dot) {
      dot.classList.add('visited')
    }
  },

  /**
   * Create progress ring SVG for tutorial completion
   * @param {number} percentage - Completion percentage (0-100)
   * @returns {Element} SVG element
   */
  createProgressRing(percentage) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'progress-ring')
    svg.setAttribute('viewBox', '0 0 48 48')
    svg.setAttribute('width', '48')
    svg.setAttribute('height', '48')

    const radius = 20
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    bgCircle.setAttribute('class', 'progress-ring-bg')
    bgCircle.setAttribute('cx', '24')
    bgCircle.setAttribute('cy', '24')
    bgCircle.setAttribute('r', radius.toString())

    // Progress circle
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    progressCircle.setAttribute('class', 'progress-ring-fill')
    progressCircle.setAttribute('cx', '24')
    progressCircle.setAttribute('cy', '24')
    progressCircle.setAttribute('r', radius.toString())
    progressCircle.setAttribute('stroke-dasharray', circumference.toString())
    progressCircle.setAttribute('stroke-dashoffset', offset.toString())

    svg.appendChild(bgCircle)
    svg.appendChild(progressCircle)

    return svg
  }
}
