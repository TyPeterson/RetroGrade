/**
 * Retrograde - Tutorial Renderer
 * UI rendering for tutorial lessons and exercises
 */
const TutorialRenderer = {
  state: {
    container: null,
    screenInstance: null,
    currentHintIndex: 0,
    exerciseState: 'ready'  // 'ready', 'running', 'success', 'error'
  },

  /**
   * Initialize renderer in container
   * @param {Element} container - DOM container
   */
  init(container) {
    this.state.container = container
  },

  /**
   * Render lesson content and exercise
   * @param {Object} lesson - Lesson object
   */
  renderLesson(lesson) {
    if (!this.state.container) {
      console.error('Renderer not initialized')
      return
    }

    // Cleanup previous lesson
    this.cleanup()

    // Create main structure
    const tutorialHtml = `
      <div class="tutorial-container">
        ${this.createProgressIndicator()}
        ${this.createNavigation()}
        ${this.createLessonContent(lesson)}
        ${this.createExerciseSection(lesson)}
      </div>
    `

    this.state.container.innerHTML = tutorialHtml

    // Initialize mini terminal
    this.initializeMiniTerminal()

    // Attach event handlers
    this.attachEventHandlers(lesson)
  },

  /**
   * Create progress indicator
   * @returns {string} HTML string
   */
  createProgressIndicator() {
    const completed = TutorialEngine.getCompletedCount()
    const total = TutorialEngine.getTotalCount()
    const percentage = TutorialEngine.getCompletionPercentage()

    return `
      <div class="tutorial-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="progress-text">${completed} of ${total} lessons complete</span>
      </div>
    `
  },

  /**
   * Create navigation bar with lesson dots
   * @returns {string} HTML string
   */
  createNavigation() {
    const currentIndex = TutorialEngine.state.currentLessonIndex
    const totalLessons = TutorialEngine.getTotalCount()
    const lessons = TutorialEngine.getAllLessonsWithStatus()

    const dotsHtml = lessons.map((lesson, index) => {
      const statusClass = lesson.status
      return `<button class="lesson-dot ${statusClass}" data-lesson="${index}"
                      ${!lesson.isAccessible ? 'disabled' : ''}
                      title="${lesson.title}"></button>`
    }).join('')

    const hasPrev = currentIndex > 0
    const hasNext = currentIndex < totalLessons - 1 &&
                     TutorialEngine.isLessonAccessible(currentIndex + 1)

    return `
      <div class="tutorial-nav">
        <button class="btn-nav btn-prev" ${!hasPrev ? 'disabled' : ''}>
          &larr; Previous
        </button>
        <div class="lesson-dots">
          ${dotsHtml}
        </div>
        <button class="btn-nav btn-next" ${!hasNext ? 'disabled' : ''}>
          Next &rarr;
        </button>
      </div>
    `
  },

  /**
   * Create lesson content section
   * @param {Object} lesson - Lesson object
   * @returns {string} HTML string
   */
  createLessonContent(lesson) {
    const content = lesson.content

    return `
      <div class="lesson-content">
        <div class="lesson-header">
          <span class="lesson-number">Lesson ${lesson.order}</span>
          <h2 class="lesson-title">${lesson.title}</h2>
        </div>

        <div class="lesson-objective">
          <strong>Objective:</strong> ${lesson.objective}
        </div>

        <div class="lesson-body">
          <div class="lesson-explanation">
            <p>${content.introduction}</p>
            <p>${content.explanation}</p>
          </div>

          ${content.syntax ? `
            <div class="lesson-syntax">${content.syntax}</div>
          ` : ''}

          ${this.createExamplesSection(content.examples)}

          ${content.tips && content.tips.length > 0 ? `
            <div class="lesson-tips">
              <h5>Tips</h5>
              <ul>
                ${content.tips.map(tip => `<li>${tip}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `
  },

  /**
   * Create examples section
   * @param {Array} examples - Example objects
   * @returns {string} HTML string
   */
  createExamplesSection(examples) {
    if (!examples || examples.length === 0) return ''

    return `
      <div class="lesson-examples">
        <h4>Examples</h4>
        ${examples.map(example => `
          <div class="code-example">
            <pre class="example-code">${this.escapeHtml(example.code)}</pre>
            ${example.output ? `
              <div class="example-output">${this.escapeHtml(example.output)}</div>
            ` : ''}
            ${example.description ? `
              <div class="example-description">${example.description}</div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `
  },

  /**
   * Create exercise section
   * @param {Object} lesson - Lesson object
   * @returns {string} HTML string
   */
  createExerciseSection(lesson) {
    const exercise = lesson.exercise

    return `
      <div class="exercise-section">
        <div class="exercise-header">
          <h3>Try It Yourself</h3>
          <span class="exercise-badge">Exercise</span>
        </div>

        <div class="exercise-prompt">
          <p>${exercise.prompt}</p>
        </div>

        ${exercise.instructions && exercise.instructions.length > 0 ? `
          <div class="exercise-instructions">
            <ol>
              ${exercise.instructions.map(inst => `<li>${inst}</li>`).join('')}
            </ol>
          </div>
        ` : ''}

        <div class="exercise-terminal">
          <div class="mini-monitor">
            <div class="mini-bezel">
              <div class="mini-screen" id="mini-screen"></div>
            </div>
          </div>
        </div>

        <div class="exercise-controls">
          <button class="btn-hint">Show Hint</button>
          <button class="btn-reset-exercise">Reset</button>
          <button class="btn-run-check">Run & Check</button>
        </div>

        <div class="hint-box hidden" id="hint-box"></div>
        <div class="exercise-feedback hidden" id="exercise-feedback"></div>
      </div>
    `
  },

  /**
   * Initialize mini BASIC terminal for exercises
   */
  initializeMiniTerminal() {
    const screenContainer = Utils.$('#mini-screen')
    if (!screenContainer) return

    // Create isolated BasicScreen instance
    const miniScreen = Object.create(BasicScreen)
    miniScreen.state = {
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

    miniScreen.init(screenContainer)
    this.state.screenInstance = miniScreen

    // Set validator interpreter
    TutorialValidator.setInterpreter(BasicInterpreter)

    // Show initial prompt
    miniScreen.println('')
    miniScreen.print('] ')
    miniScreen.state.inputMode = true
    miniScreen.render()
  },

  /**
   * Attach event handlers for exercise controls and navigation
   * @param {Object} lesson - Lesson object
   */
  attachEventHandlers(lesson) {
    // Navigation buttons
    const btnPrev = Utils.$('.btn-prev')
    const btnNext = Utils.$('.btn-next')

    if (btnPrev && !btnPrev.disabled) {
      btnPrev.addEventListener('click', () => {
        if (TutorialEngine.previousLesson()) {
          this.renderLesson(TutorialEngine.getCurrentLesson())
        }
      })
    }

    if (btnNext && !btnNext.disabled) {
      btnNext.addEventListener('click', () => {
        if (TutorialEngine.nextLesson()) {
          this.renderLesson(TutorialEngine.getCurrentLesson())
        }
      })
    }

    // Lesson dots
    Utils.$$('.lesson-dot').forEach((dot, index) => {
      if (!dot.disabled) {
        dot.addEventListener('click', () => {
          if (TutorialEngine.goToLesson(index)) {
            this.renderLesson(TutorialEngine.getCurrentLesson())
          }
        })
      }
    })

    // Exercise controls
    const btnHint = Utils.$('.btn-hint')
    const btnReset = Utils.$('.btn-reset-exercise')
    const btnRunCheck = Utils.$('.btn-run-check')

    if (btnHint) {
      btnHint.addEventListener('click', () => this.showNextHint(lesson))
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetExercise())
    }

    if (btnRunCheck) {
      btnRunCheck.addEventListener('click', () => this.runAndCheck(lesson))
    }
  },

  /**
   * Show next hint
   * @param {Object} lesson - Lesson object
   */
  showNextHint(lesson) {
    const hints = lesson.exercise.hints || []
    if (hints.length === 0) return

    const hintBox = Utils.$('#hint-box')
    if (!hintBox) return

    const hint = hints[this.state.currentHintIndex]
    hintBox.textContent = hint
    hintBox.classList.remove('hidden')

    this.state.currentHintIndex = (this.state.currentHintIndex + 1) % hints.length
  },

  /**
   * Reset exercise terminal
   */
  resetExercise() {
    if (this.state.screenInstance) {
      this.state.screenInstance.clear()
      this.state.screenInstance.println('')
      this.state.screenInstance.print('] ')
      this.state.screenInstance.state.inputMode = true
      this.state.screenInstance.render()
    }

    // Clear feedback and hints
    const feedback = Utils.$('#exercise-feedback')
    const hintBox = Utils.$('#hint-box')
    if (feedback) feedback.classList.add('hidden')
    if (hintBox) hintBox.classList.add('hidden')

    this.state.currentHintIndex = 0
    this.state.exerciseState = 'ready'

    // Clear interpreter state
    BasicInterpreter.executeNew()
    TutorialValidator.clear()
  },

  /**
   * Run code and check against expected output
   * @param {Object} lesson - Lesson object
   */
  async runAndCheck(lesson) {
    if (!this.state.screenInstance) return

    const feedback = Utils.$('#exercise-feedback')
    if (!feedback) return

    // Clear previous feedback
    feedback.classList.add('hidden')

    // Start capturing output
    TutorialValidator.clear()
    TutorialValidator.startCapture()

    try {
      // Get user input from screen buffer
      const userCode = this.state.screenInstance.state.inputBuffer.trim()

      if (!userCode) {
        this.showFeedback(false, 'Please type some code first!')
        return
      }

      // Execute the code
      await BasicInterpreter.executeImmediate(userCode)

      // Small delay to ensure all output is captured
      await new Promise(resolve => setTimeout(resolve, 100))

      // Stop capturing and validate
      TutorialValidator.stopCapture()
      const result = TutorialValidator.validate(lesson.exercise.validation)

      this.showFeedback(result.success, result.message, lesson)

    } catch (error) {
      TutorialValidator.stopCapture()
      this.showFeedback(false, `Error: ${error.message}`)
    }
  },

  /**
   * Show validation feedback
   * @param {boolean} success - Whether validation succeeded
   * @param {string} message - Feedback message
   * @param {Object} lesson - Current lesson (optional)
   */
  showFeedback(success, message, lesson = null) {
    const feedback = Utils.$('#exercise-feedback')
    if (!feedback) return

    const icon = success ? '&#x2714;' : '&#x2718;'
    const statusClass = success ? 'success' : 'error'

    let continueButton = ''
    if (success && lesson) {
      // Mark lesson as completed
      TutorialEngine.completeCurrentLesson()

      // Show continue button if there's a next lesson
      const hasNext = TutorialEngine.state.currentLessonIndex <
                      TutorialEngine.getTotalCount() - 1

      if (hasNext) {
        continueButton = `
          <button class="btn-continue" id="btn-continue-lesson">
            Continue to Next Lesson &rarr;
          </button>
        `
      } else {
        continueButton = `
          <div style="margin-top: var(--space-md); font-weight: 600;">
            Congratulations! You've completed all lessons!
          </div>
        `
      }
    }

    feedback.className = `exercise-feedback ${statusClass}`
    feedback.innerHTML = `
      <div class="feedback-icon">${icon}</div>
      <div class="feedback-message">
        <strong>${success ? 'Correct!' : 'Not quite.'}</strong>
        <div>${message}</div>
        ${continueButton}
      </div>
    `
    feedback.classList.remove('hidden')

    // Update progress indicator
    const progressFill = Utils.$('.progress-fill')
    const progressText = Utils.$('.progress-text')
    if (progressFill && progressText) {
      const completed = TutorialEngine.getCompletedCount()
      const total = TutorialEngine.getTotalCount()
      const percentage = TutorialEngine.getCompletionPercentage()

      progressFill.style.width = `${percentage}%`
      progressText.textContent = `${completed} of ${total} lessons complete`
    }

    // Attach continue button handler
    if (success) {
      const btnContinue = Utils.$('#btn-continue-lesson')
      if (btnContinue) {
        btnContinue.addEventListener('click', () => {
          if (TutorialEngine.nextLesson()) {
            this.renderLesson(TutorialEngine.getCurrentLesson())
          }
        })
      }
    }
  },

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  },

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.state.screenInstance) {
      if (this.state.screenInstance.destroy) {
        this.state.screenInstance.destroy()
      }
      this.state.screenInstance = null
    }

    this.state.currentHintIndex = 0
    this.state.exerciseState = 'ready'

    TutorialValidator.reset()
  },

  /**
   * Destroy renderer (full cleanup)
   */
  destroy() {
    this.cleanup()
    if (this.state.container) {
      this.state.container.innerHTML = ''
    }
    this.state.container = null
  }
}
