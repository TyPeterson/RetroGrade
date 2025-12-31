/**
 * Retrograde - Apple II BASIC Screen Emulator
 * Terminal emulation with 40-column display and cursor management
 */
const BasicScreen = {
  config: {
    COLS: 40,
    ROWS: 24,
    PROMPT: ']'
  },

  state: {
    container: null,
    screenEl: null,
    buffer: [],
    cursorX: 0,
    cursorY: 0,
    cursorVisible: true,
    cursorBlinkInterval: null,
    inputBuffer: '',
    inputMode: false,
    inputResolve: null,
    commandCallback: null
  },

  /**
   * Initialize screen in container
   * @param {Element} container - DOM container
   */
  init(container) {
    this.state.container = container
    this.createScreen()
    this.initBuffer()
    this.attachKeyboardHandler()
    this.startCursorBlink()
    this.render()
  },

  /**
   * Create screen DOM structure
   */
  createScreen() {
    const content = Utils.createElement('div', { className: 'screen-content' })
    this.state.screenEl = content
    this.state.container.appendChild(content)
  },

  /**
   * Initialize character buffer
   */
  initBuffer() {
    this.state.buffer = []
    for (let row = 0; row < this.config.ROWS; row++) {
      this.state.buffer[row] = new Array(this.config.COLS).fill(' ')
    }
    this.state.cursorX = 0
    this.state.cursorY = 0
  },

  /**
   * Print text to screen
   * @param {string} text - Text to print
   */
  print(text) {
    const str = String(text)
    for (let i = 0; i < str.length; i++) {
      const char = str[i]

      if (char === '\n') {
        this.newline()
      } else {
        this.putChar(char)
      }
    }
    this.render()
  },

  /**
   * Print text followed by newline
   * @param {string} text - Text to print
   */
  println(text) {
    this.print(String(text) + '\n')
  },

  /**
   * Put single character at cursor position
   * @param {string} char - Single character
   */
  putChar(char) {
    if (this.state.cursorX >= this.config.COLS) {
      this.newline()
    }

    if (this.state.cursorY >= this.config.ROWS) {
      this.scroll()
    }

    this.state.buffer[this.state.cursorY][this.state.cursorX] = char
    this.state.cursorX++
  },

  /**
   * Move to next line
   */
  newline() {
    this.state.cursorX = 0
    this.state.cursorY++

    if (this.state.cursorY >= this.config.ROWS) {
      this.scroll()
    }
  },

  /**
   * Clear screen (HOME command)
   */
  clear() {
    this.initBuffer()
    this.render()
  },

  /**
   * Scroll screen up one line
   */
  scroll() {
    this.state.buffer.shift()
    this.state.buffer.push(new Array(this.config.COLS).fill(' '))
    this.state.cursorY = this.config.ROWS - 1
  },

  /**
   * Render screen buffer to DOM
   */
  render() {
    if (!this.state.screenEl) return

    const lines = []

    for (let row = 0; row < this.config.ROWS; row++) {
      const lineText = this.state.buffer[row].join('')
      const lineEl = Utils.createElement('div', { className: 'screen-line' }, lineText)
      lines.push(lineEl)
    }

    this.state.screenEl.innerHTML = ''
    lines.forEach(line => this.state.screenEl.appendChild(line))

    this.updateCursor()
  },

  /**
   * Update cursor display
   */
  updateCursor() {
    const rows = this.state.screenEl.children
    if (rows.length === 0) return

    const cursorRow = rows[this.state.cursorY]
    if (!cursorRow) return

    const text = this.state.buffer[this.state.cursorY].slice(0, this.state.cursorX).join('')
    const cursorEl = Utils.createElement('span', { className: 'cursor' })

    if (this.state.inputMode) {
      const inputText = Utils.createElement('span', { className: 'input-text' }, this.state.inputBuffer)
      cursorRow.textContent = text
      cursorRow.appendChild(inputText)
      cursorRow.appendChild(cursorEl)
    } else {
      cursorRow.textContent = text
      cursorRow.appendChild(cursorEl)
    }
  },

  /**
   * Start cursor blink animation
   */
  startCursorBlink() {
    if (this.state.cursorBlinkInterval) {
      clearInterval(this.state.cursorBlinkInterval)
    }
  },

  /**
   * Stop cursor blink
   */
  stopCursorBlink() {
    if (this.state.cursorBlinkInterval) {
      clearInterval(this.state.cursorBlinkInterval)
      this.state.cursorBlinkInterval = null
    }
  },

  /**
   * Attach keyboard event handler
   */
  attachKeyboardHandler() {
    const keyHandler = (e) => {
      if (!this.state.container) return

      if (this.state.inputMode) {
        this.handleInputKeydown(e)
      }
    }

    document.addEventListener('keydown', keyHandler)
    this.state.keyHandler = keyHandler
  },

  /**
   * Handle keyboard input during input mode
   * @param {KeyboardEvent} e
   */
  handleInputKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const input = this.state.inputBuffer
      this.state.inputBuffer = ''
      this.state.inputMode = false

      this.newline()
      this.render()

      if (this.state.inputResolve) {
        this.state.inputResolve(input)
        this.state.inputResolve = null
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      if (this.state.inputBuffer.length > 0) {
        this.state.inputBuffer = this.state.inputBuffer.slice(0, -1)
        this.render()
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault()
      this.state.inputBuffer += e.key.toUpperCase()
      this.render()
    }
  },

  /**
   * Enter input mode and wait for user input
   * @param {string} prompt - Optional prompt text
   * @returns {Promise<string>} User input
   */
  getInput(prompt = '') {
    if (prompt) {
      this.print(prompt)
    }

    this.state.inputMode = true
    this.state.inputBuffer = ''
    this.render()

    return new Promise((resolve) => {
      this.state.inputResolve = resolve
    })
  },

  /**
   * Show prompt and wait for command
   * @returns {Promise<string>} Command line
   */
  showPrompt() {
    this.print(this.config.PROMPT + ' ')
    return this.getInput()
  },

  /**
   * Destroy screen (cleanup)
   */
  destroy() {
    this.stopCursorBlink()
    if (this.state.keyHandler) {
      document.removeEventListener('keydown', this.state.keyHandler)
    }
    if (this.state.container) {
      this.state.container.innerHTML = ''
    }
    this.state = {
      container: null,
      screenEl: null,
      buffer: [],
      cursorX: 0,
      cursorY: 0,
      cursorVisible: true,
      cursorBlinkInterval: null,
      inputBuffer: '',
      inputMode: false,
      inputResolve: null,
      commandCallback: null
    }
  }
}
