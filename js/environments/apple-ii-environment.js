/**
 * Retrograde - Apple II BASIC Environment
 * Main orchestrator for the Apple II BASIC experience
 */
const AppleIIEnvironment = {
  config: {
    name: 'apple-ii-basic',
    displayName: 'Applesoft BASIC',
    version: '1.0'
  },

  state: {
    initialized: false,
    container: null
  },

  /**
   * Initialize environment in container
   * @param {Element} container - DOM container
   * @returns {Promise}
   */
  async init(container) {
    this.state.container = container
    this.render()

    const screenContainer = Utils.$('.apple-ii-screen', container)
    BasicScreen.init(screenContainer)

    BasicInterpreter.init({
      output: (text) => BasicScreen.print(text),
      outputLine: (text) => BasicScreen.println(text),
      input: (prompt) => BasicScreen.getInput(prompt),
      clear: () => BasicScreen.clear()
    })

    this.attachEventHandlers()
    await this.startREPL()

    this.state.initialized = true
  },

  /**
   * Render environment UI
   */
  render() {
    this.state.container.innerHTML = `
      <div class="apple-ii-environment">
        <div class="apple-ii-monitor">
          <div class="monitor-bezel">
            <div class="apple-ii-screen"></div>
          </div>
        </div>
        <div class="environment-controls">
          <button class="btn-reset" title="Reset (NEW)">RESET</button>
          <span class="environment-label">Apple II - Applesoft BASIC</span>
        </div>
      </div>
    `
  },

  /**
   * Attach control event handlers
   */
  attachEventHandlers() {
    const resetBtn = Utils.$('.btn-reset', this.state.container)
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.reset()
      })
    }
  },

  /**
   * Start Read-Eval-Print Loop
   */
  async startREPL() {
    BasicScreen.println('')
    BasicScreen.println('APPLE II')
    BasicScreen.println('APPLESOFT BASIC')
    BasicScreen.println('')
    BasicScreen.println('TYPE "LIST" TO SEE PROGRAM')
    BasicScreen.println('TYPE "RUN" TO EXECUTE')
    BasicScreen.println('TYPE "NEW" TO CLEAR')
    BasicScreen.println('')

    while (true) {
      try {
        const line = await BasicScreen.showPrompt()
        await BasicInterpreter.executeImmediate(line)
      } catch (error) {
        BasicScreen.println(`ERROR: ${error.message}`)
      }
    }
  },

  /**
   * Reset environment
   */
  reset() {
    BasicInterpreter.executeNew()
    BasicScreen.clear()
    BasicScreen.println('')
    BasicScreen.println('APPLE II')
    BasicScreen.println('APPLESOFT BASIC')
    BasicScreen.println('')
    BasicScreen.println('TYPE "LIST" TO SEE PROGRAM')
    BasicScreen.println('TYPE "RUN" TO EXECUTE')
    BasicScreen.println('TYPE "NEW" TO CLEAR')
    BasicScreen.println('')
  },

  /**
   * Destroy environment (cleanup)
   */
  destroy() {
    BasicScreen.destroy()
    this.state.initialized = false
    this.state.container = null
  }
}
