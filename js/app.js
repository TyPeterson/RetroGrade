/**
 * Retrograde - Main Application
 * Coordinates all modules and handles view transitions
 */
const App = {
  views: {
    timeline: null,
    eventDetail: null
  },

  /**
   * Initialize application
   */
  async init() {
    console.log('Retrograde initializing...')

    this.views.timeline = Utils.$('#view-timeline')
    this.views.eventDetail = Utils.$('#view-event-detail')

    Progress.init()
    Timeline.init('#timeline-container')

    try {
      const events = await EventsLoader.init()
      console.log(`Loaded ${events.length} events`)

      Router.init({
        '/timeline': () => this.showTimelineView(),
        '/event/:id': (params) => this.showEventView(params.id)
      })

    } catch (error) {
      console.error('Failed to initialize:', error)
      this.showError('Failed to load event data. Please refresh the page.')
    }
  },

  /**
   * Show timeline view
   */
  showTimelineView() {
    this.hideAllViews()
    this.views.timeline.classList.add('active')

    Timeline.render(EventsLoader.state.events)
  },

  /**
   * Show event detail view
   * @param {string} eventId - Event identifier
   */
  showEventView(eventId) {
    const event = EventsLoader.getEvent(eventId)

    if (!event) {
      console.warn('Event not found:', eventId)
      Router.navigate('/timeline')
      return
    }

    this.hideAllViews()
    this.views.eventDetail.classList.add('active')

    Progress.markVisited(eventId)
    Timeline.markEventVisited(eventId)

    this.renderEventDetail(event)
  },

  /**
   * Render event detail content
   * @param {Object} event - Event metadata
   */
  renderEventDetail(event) {
    const container = Utils.$('#event-detail-content')

    container.innerHTML = `
      <div class="event-header">
        <button class="btn-back" onclick="Router.navigate('/timeline')">
          &larr; Back to Timeline
        </button>
        <span class="event-year">${event.year}</span>
        <span class="event-category badge-${event.category}">${event.category}</span>
      </div>

      <h1 class="event-title">${event.title}</h1>

      <div class="event-tabs">
        <button class="tab-btn active" data-tab="history">History</button>
        <button class="tab-btn ${event.tutorial?.enabled ? '' : 'disabled'}" data-tab="tutorial">Tutorial</button>
        <button class="tab-btn ${event.environment?.enabled ? '' : 'disabled'}" data-tab="playground">Playground</button>
      </div>

      <div class="event-tab-content">
        <div class="tab-panel active" id="panel-history">
          <div class="event-summary">
            <h2>Historical Context</h2>
            <p>${event.summary || 'No summary available.'}</p>
          </div>

          ${event.significance ? `
            <div class="event-significance">
              <h3>Why It Matters</h3>
              <p>${event.significance}</p>
            </div>
          ` : ''}

          ${event.keyFigures && event.keyFigures.length > 0 ? `
            <div class="event-figures">
              <h3>Key Figures</h3>
              <ul>
                ${event.keyFigures.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
        <div class="tab-panel" id="panel-tutorial">
          <div id="tutorial-container"></div>
        </div>
        <div class="tab-panel" id="panel-playground">
          <div id="playground-container"></div>
        </div>
      </div>
    `

    this.currentEvent = event
    this.environmentInitialized = false
    this.tutorialInitialized = false
    this.attachTabHandlers()
  },

  /**
   * Attach tab switching handlers
   */
  attachTabHandlers() {
    const tabs = Utils.$$('.tab-btn:not(.disabled)')
    tabs.forEach(tab => {
      tab.addEventListener('click', async () => {
        Utils.$$('.tab-btn').forEach(t => t.classList.remove('active'))
        Utils.$$('.tab-panel').forEach(p => p.classList.remove('active'))

        tab.classList.add('active')
        const panel = Utils.$(`#panel-${tab.dataset.tab}`)
        if (panel) {
          panel.classList.add('active')
        }

        // Initialize tutorial if tutorial tab is clicked
        if (tab.dataset.tab === 'tutorial' && !this.tutorialInitialized) {
          this.tutorialInitialized = true
          await this.initializeTutorial()
        }

        // Initialize environment if playground tab is clicked
        if (tab.dataset.tab === 'playground' && !this.environmentInitialized) {
          this.environmentInitialized = true
          await this.initializeEnvironment()
        }
      })
    })
  },

  /**
   * Initialize the tutorial system
   */
  async initializeTutorial() {
    const event = this.currentEvent
    if (!event || !event.tutorial || !event.tutorial.enabled) {
      return
    }

    const container = Utils.$('#tutorial-container')
    if (!container) {
      console.error('Tutorial container not found')
      return
    }

    try {
      // Show loading state
      container.innerHTML = '<div class="tutorial-loading">Loading tutorial...</div>'

      // Initialize tutorial engine
      await TutorialEngine.init(event.id)

      // Initialize renderer
      TutorialRenderer.init(container)

      // Render first lesson
      const currentLesson = TutorialEngine.getCurrentLesson()
      if (currentLesson) {
        TutorialRenderer.renderLesson(currentLesson)
      } else {
        container.innerHTML = '<div class="tutorial-error"><h3>Error</h3><p>No lessons found.</p></div>'
      }
    } catch (error) {
      console.error('Failed to initialize tutorial:', error)
      container.innerHTML = `<div class="tutorial-error"><h3>Error</h3><p>Failed to load tutorial: ${error.message}</p></div>`
    }
  },

  /**
   * Initialize the playground environment
   */
  async initializeEnvironment() {
    const event = this.currentEvent
    if (!event || !event.environment || !event.environment.enabled) {
      return
    }

    const container = Utils.$('#playground-container')
    if (!container) {
      console.error('Playground container not found')
      return
    }

    try {
      // Initialize environment based on type
      if (event.environment.type === 'apple-ii-basic') {
        await AppleIIEnvironment.init(container)
      } else {
        console.warn(`Unknown environment type: ${event.environment.type}`)
      }
    } catch (error) {
      console.error('Failed to initialize environment:', error)
      container.innerHTML = '<p class="error">Failed to load environment. Please try again.</p>'
    }
  },

  /**
   * Hide all views
   */
  hideAllViews() {
    Object.values(this.views).forEach(view => {
      if (view) {
        view.classList.remove('active')
      }
    })
  },

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorDiv = Utils.$('#error-message')
    if (errorDiv) {
      errorDiv.textContent = message
      errorDiv.classList.remove('hidden')
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  App.init()
})
