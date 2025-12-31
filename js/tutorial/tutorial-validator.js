/**
 * Retrograde - Tutorial Validator
 * Captures BASIC interpreter output and validates against expected results
 */
const TutorialValidator = {
  state: {
    capturedOutput: [],
    isCapturing: false,
    originalCallbacks: null,
    interpreterInstance: null
  },

  /**
   * Set the interpreter instance to capture from
   * @param {Object} interpreter - BasicInterpreter instance
   */
  setInterpreter(interpreter) {
    this.state.interpreterInstance = interpreter
  },

  /**
   * Start capturing interpreter output
   * Intercepts BasicInterpreter output callbacks
   */
  startCapture() {
    if (!this.state.interpreterInstance) {
      console.error('No interpreter instance set for validation')
      return
    }

    this.state.capturedOutput = []
    this.state.isCapturing = true

    // Store original callbacks
    this.state.originalCallbacks = {
      output: this.state.interpreterInstance.state.outputCallback,
      outputLine: this.state.interpreterInstance.state.outputLineCallback
    }

    // Wrap callbacks to capture output
    const originalOutput = this.state.originalCallbacks.output
    const originalOutputLine = this.state.originalCallbacks.outputLine

    this.state.interpreterInstance.state.outputCallback = (text) => {
      this.state.capturedOutput.push(text)
      if (originalOutput) {
        originalOutput(text)
      }
    }

    this.state.interpreterInstance.state.outputLineCallback = (text) => {
      this.state.capturedOutput.push(text + '\n')
      if (originalOutputLine) {
        originalOutputLine(text)
      }
    }
  },

  /**
   * Stop capturing and restore original callbacks
   * @returns {string[]} Captured output lines
   */
  stopCapture() {
    if (!this.state.isCapturing || !this.state.interpreterInstance) {
      return []
    }

    // Restore original callbacks
    if (this.state.originalCallbacks) {
      this.state.interpreterInstance.state.outputCallback = this.state.originalCallbacks.output
      this.state.interpreterInstance.state.outputLineCallback = this.state.originalCallbacks.outputLine
    }

    this.state.isCapturing = false
    const captured = [...this.state.capturedOutput]
    return captured
  },

  /**
   * Get captured output as single string
   * @returns {string}
   */
  getCapturedOutput() {
    return this.state.capturedOutput.join('').trim()
  },

  /**
   * Get captured output as array of lines
   * @returns {string[]}
   */
  getCapturedLines() {
    return this.getCapturedOutput()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  },

  /**
   * Validate captured output against expected
   * @param {Object} validation - Validation config from lesson
   * @returns {Object} { success: boolean, message: string }
   */
  validate(validation) {
    const actual = this.getCapturedOutput()
    const expected = validation.expectedOutput || []

    // Custom validation check for special cases
    if (validation.customCheck === 'sum') {
      return this.validateSum(actual)
    }

    // Standard validation
    const caseSensitive = validation.caseSensitive !== false
    const partialMatch = validation.partialMatch === true

    const result = this.compareOutput(actual, expected, {
      caseSensitive,
      partialMatch
    })

    if (result) {
      return {
        success: true,
        message: 'Correct! Your output matches the expected result.'
      }
    } else {
      const expectedText = expected.join(', ')
      return {
        success: false,
        message: `Not quite. Expected: ${expectedText}\nYour output: ${actual || '(no output)'}`
      }
    }
  },

  /**
   * Validate sum for calculator exercise
   * @param {string} actual - Captured output
   * @returns {Object} { success: boolean, message: string }
   */
  validateSum(actual) {
    // Check if output contains a number
    const lines = actual.split('\n').map(l => l.trim())
    const numberPattern = /^\d+$/

    // Look for a line with just a number (the sum)
    const hasSum = lines.some(line => numberPattern.test(line))

    if (hasSum) {
      return {
        success: true,
        message: 'Correct! Your calculator works!'
      }
    } else {
      return {
        success: false,
        message: 'Make sure your program prints the sum (A + B) and then run it with RUN.'
      }
    }
  },

  /**
   * Compare output with expected patterns
   * @param {string} actual - Captured output
   * @param {string[]} expected - Expected output patterns
   * @param {Object} options - { caseSensitive, partialMatch }
   * @returns {boolean}
   */
  compareOutput(actual, expected, options = {}) {
    const { caseSensitive = true, partialMatch = false } = options

    if (expected.length === 0) {
      return actual.length > 0
    }

    // Normalize for comparison
    let normalizedActual = actual
    let normalizedExpected = expected.map(e => e)

    if (!caseSensitive) {
      normalizedActual = normalizedActual.toUpperCase()
      normalizedExpected = normalizedExpected.map(e => e.toUpperCase())
    }

    if (partialMatch) {
      // Check if actual contains all expected patterns
      return normalizedExpected.every(pattern =>
        normalizedActual.includes(pattern)
      )
    } else {
      // Check for exact match
      const actualLines = normalizedActual
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)

      return normalizedExpected.every((pattern, index) =>
        actualLines[index] === pattern
      )
    }
  },

  /**
   * Clear captured output
   */
  clear() {
    this.state.capturedOutput = []
  },

  /**
   * Reset validator state
   */
  reset() {
    this.stopCapture()
    this.clear()
    this.state.interpreterInstance = null
  }
}
