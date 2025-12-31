/**
 * Retrograde - Tutorial Engine
 * State machine for tutorial navigation and progress tracking
 */
const TutorialEngine = {
  state: {
    eventId: null,
    tutorialData: null,
    lessons: [],
    currentLessonIndex: 0,
    lessonStatus: {},  // { 'lesson-1': 'completed', 'lesson-2': 'in-progress' }
    isLoaded: false
  },

  /**
   * Initialize tutorial for an event
   * @param {string} eventId - Event identifier
   * @returns {Promise}
   */
  async init(eventId) {
    this.state.eventId = eventId
    this.state.isLoaded = false

    try {
      // Load tutorial data from JSON
      const data = await this.loadTutorialData(eventId)
      this.state.tutorialData = data
      this.state.lessons = data.lessons || []

      // Load saved progress
      this.loadProgress()

      // Set current lesson to first incomplete lesson
      this.goToFirstIncomplete()

      this.state.isLoaded = true
    } catch (error) {
      console.error('Failed to initialize tutorial:', error)
      throw error
    }
  },

  /**
   * Load tutorial data from JSON
   * @param {string} eventId
   * @returns {Promise<Object>} Tutorial data
   */
  async loadTutorialData(eventId) {
    const response = await fetch(`events/${eventId}/tutorials.json`)
    if (!response.ok) {
      throw new Error(`Failed to load tutorials for ${eventId}`)
    }
    return await response.json()
  },

  /**
   * Load saved progress from Progress module
   */
  loadProgress() {
    const eventProgress = Progress.getEventProgress(this.state.eventId)
    const completedLessons = eventProgress.lessonsCompleted || []

    // Mark lessons as completed
    this.state.lessons.forEach(lesson => {
      if (completedLessons.includes(lesson.id)) {
        this.state.lessonStatus[lesson.id] = 'completed'
      } else {
        this.state.lessonStatus[lesson.id] = 'pending'
      }
    })
  },

  /**
   * Get current lesson object
   * @returns {Object|null} Current lesson
   */
  getCurrentLesson() {
    if (this.state.currentLessonIndex >= 0 &&
        this.state.currentLessonIndex < this.state.lessons.length) {
      return this.state.lessons[this.state.currentLessonIndex]
    }
    return null
  },

  /**
   * Navigate to specific lesson by index
   * @param {number} index - Lesson index (0-based)
   * @returns {boolean} True if navigation succeeded
   */
  goToLesson(index) {
    if (index < 0 || index >= this.state.lessons.length) {
      return false
    }

    // Check if lesson is accessible
    if (!this.isLessonAccessible(index)) {
      return false
    }

    this.state.currentLessonIndex = index
    return true
  },

  /**
   * Navigate to first incomplete lesson
   */
  goToFirstIncomplete() {
    for (let i = 0; i < this.state.lessons.length; i++) {
      const lesson = this.state.lessons[i]
      if (this.state.lessonStatus[lesson.id] !== 'completed') {
        this.state.currentLessonIndex = i
        return
      }
    }
    // All completed - go to last lesson
    this.state.currentLessonIndex = this.state.lessons.length - 1
  },

  /**
   * Navigate to next lesson
   * @returns {boolean} True if navigation succeeded
   */
  nextLesson() {
    const nextIndex = this.state.currentLessonIndex + 1
    if (nextIndex < this.state.lessons.length) {
      return this.goToLesson(nextIndex)
    }
    return false
  },

  /**
   * Navigate to previous lesson
   * @returns {boolean} True if navigation succeeded
   */
  previousLesson() {
    const prevIndex = this.state.currentLessonIndex - 1
    if (prevIndex >= 0) {
      this.state.currentLessonIndex = prevIndex
      return true
    }
    return false
  },

  /**
   * Mark current lesson as completed
   */
  completeCurrentLesson() {
    const currentLesson = this.getCurrentLesson()
    if (!currentLesson) return

    const lessonId = currentLesson.id

    // Update local status
    this.state.lessonStatus[lessonId] = 'completed'

    // Sync with Progress module
    this.syncProgress()
  },

  /**
   * Check if a lesson is completed
   * @param {string} lessonId - Lesson identifier
   * @returns {boolean}
   */
  isLessonCompleted(lessonId) {
    return this.state.lessonStatus[lessonId] === 'completed'
  },

  /**
   * Get completion percentage
   * @returns {number} 0-100
   */
  getCompletionPercentage() {
    const total = this.state.lessons.length
    if (total === 0) return 0

    const completed = Object.values(this.state.lessonStatus)
      .filter(status => status === 'completed').length

    return Math.round((completed / total) * 100)
  },

  /**
   * Get count of completed lessons
   * @returns {number}
   */
  getCompletedCount() {
    return Object.values(this.state.lessonStatus)
      .filter(status => status === 'completed').length
  },

  /**
   * Get total lesson count
   * @returns {number}
   */
  getTotalCount() {
    return this.state.lessons.length
  },

  /**
   * Sync state with Progress module
   */
  syncProgress() {
    const completedLessons = Object.keys(this.state.lessonStatus)
      .filter(id => this.state.lessonStatus[id] === 'completed')

    // Update each completed lesson in Progress
    completedLessons.forEach(lessonId => {
      Progress.markLessonCompleted(this.state.eventId, lessonId)
    })
  },

  /**
   * Check if lesson is accessible (unlocked)
   * Linear progression - can only access completed lessons and the next incomplete one
   * @param {number} index
   * @returns {boolean}
   */
  isLessonAccessible(index) {
    if (index === 0) return true // First lesson always accessible

    // Check if previous lesson is completed
    const previousLesson = this.state.lessons[index - 1]
    if (!previousLesson) return false

    return this.isLessonCompleted(previousLesson.id)
  },

  /**
   * Get lesson status for UI
   * @param {number} index
   * @returns {string} 'completed', 'active', 'locked', or 'pending'
   */
  getLessonUIStatus(index) {
    const lesson = this.state.lessons[index]
    if (!lesson) return 'locked'

    if (index === this.state.currentLessonIndex) {
      return 'active'
    }

    if (this.isLessonCompleted(lesson.id)) {
      return 'completed'
    }

    if (this.isLessonAccessible(index)) {
      return 'pending'
    }

    return 'locked'
  },

  /**
   * Reset tutorial progress (for debugging/testing)
   */
  reset() {
    // Clear all lesson statuses
    this.state.lessons.forEach(lesson => {
      this.state.lessonStatus[lesson.id] = 'pending'
    })

    // Clear from Progress module
    const eventProgress = Progress.getEventProgress(this.state.eventId)
    eventProgress.lessonsCompleted = []
    Progress.save()

    // Go to first lesson
    this.state.currentLessonIndex = 0
  },

  /**
   * Get all lessons with their status
   * @returns {Array} Array of lessons with status
   */
  getAllLessonsWithStatus() {
    return this.state.lessons.map((lesson, index) => ({
      ...lesson,
      status: this.getLessonUIStatus(index),
      isAccessible: this.isLessonAccessible(index)
    }))
  }
}
