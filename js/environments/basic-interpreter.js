/**
 * Retrograde - BASIC Interpreter
 * Execution engine for Applesoft BASIC
 */
const BasicInterpreter = {
  state: {
    program: new Map(),
    variables: {},
    forStack: [],
    currentLine: 0,
    running: false,
    outputCallback: null,
    outputLineCallback: null,
    inputCallback: null,
    clearCallback: null
  },

  /**
   * Initialize interpreter with callbacks
   * @param {Object} callbacks - { output, outputLine, input, clear }
   */
  init(callbacks) {
    this.state.outputCallback = callbacks.output
    this.state.outputLineCallback = callbacks.outputLine
    this.state.inputCallback = callbacks.input
    this.state.clearCallback = callbacks.clear
  },

  /**
   * Execute immediate mode command
   * @param {string} line - Command line
   * @returns {Promise}
   */
  async executeImmediate(line) {
    if (!line.trim()) return

    try {
      const tokens = BasicTokenizer.tokenize(line)
      const ast = BasicParser.parse(tokens)

      if (ast.type === 'PROGRAM_LINE') {
        this.storeLine(ast.lineNumber, line, ast.statement)
      } else if (ast.type === 'EMPTY') {
        return
      } else {
        await this.executeNode(ast)
      }
    } catch (error) {
      this.print(`?SYNTAX ERROR\n${error.message}\n`)
    }
  },

  /**
   * Store program line
   * @param {number} lineNumber - Line number
   * @param {string} source - Source code
   * @param {Object} ast - Parsed AST
   */
  storeLine(lineNumber, source, ast) {
    if (ast.type === 'EMPTY' || (ast.type === 'REM' && !source.includes('REM'))) {
      this.state.program.delete(lineNumber)
    } else {
      this.state.program.set(lineNumber, { source, ast })
    }
  },

  /**
   * Run stored program
   * @returns {Promise}
   */
  async run() {
    if (this.state.program.size === 0) {
      this.print('?NO PROGRAM\n')
      return
    }

    this.state.running = true
    this.state.variables = {}
    this.state.forStack = []

    const lines = Array.from(this.state.program.keys()).sort((a, b) => a - b)

    try {
      for (let i = 0; i < lines.length; i++) {
        if (!this.state.running) break

        this.state.currentLine = lines[i]
        const line = this.state.program.get(this.state.currentLine)
        await this.executeNode(line.ast)

        if (this.state.nextLine !== undefined) {
          const nextIdx = lines.indexOf(this.state.nextLine)
          if (nextIdx === -1) {
            throw new Error(`?UNDEF'D STATEMENT ERROR IN LINE ${this.state.currentLine}`)
          }
          i = nextIdx - 1
          this.state.nextLine = undefined
        }
      }
    } catch (error) {
      this.print(`${error.message}\n`)
    }

    this.state.running = false
  },

  /**
   * Execute AST node
   * @param {Object} node - AST node
   * @returns {Promise}
   */
  async executeNode(node) {
    switch (node.type) {
      case 'PRINT':
        return this.executePrint(node)
      case 'LET':
        return this.executeLet(node)
      case 'INPUT':
        return await this.executeInput(node)
      case 'IF':
        return await this.executeIf(node)
      case 'GOTO':
        return this.executeGoto(node)
      case 'FOR':
        return this.executeFor(node)
      case 'NEXT':
        return this.executeNext(node)
      case 'END':
        this.state.running = false
        return
      case 'RUN':
        return await this.run()
      case 'LIST':
        return this.executeList(node)
      case 'NEW':
        return this.executeNew()
      case 'HOME':
        return this.executeHome()
      case 'REM':
        return
      default:
        throw new Error(`Unknown node type: ${node.type}`)
    }
  },

  /**
   * Execute PRINT statement
   * @param {Object} node - PRINT AST node
   */
  executePrint(node) {
    let output = ''

    for (let i = 0; i < node.expressions.length; i++) {
      const value = this.evaluate(node.expressions[i])
      output += String(value)

      if (i < node.separators.length) {
        if (node.separators[i] === ';') {
          // No space
        } else if (node.separators[i] === ',') {
          // Tab to next zone (simplified: just add spaces)
          output += '     '
        }
      }
    }

    if (node.separators.length === 0 || node.separators[node.separators.length - 1] !== ';') {
      this.println(output)
    } else {
      this.print(output)
    }
  },

  /**
   * Execute LET statement
   * @param {Object} node - LET AST node
   */
  executeLet(node) {
    const value = this.evaluate(node.value)
    this.state.variables[node.variable] = value
  },

  /**
   * Execute INPUT statement
   * @param {Object} node - INPUT AST node
   * @returns {Promise}
   */
  async executeInput(node) {
    const promptText = node.prompt ? node.prompt : '? '
    const input = await this.state.inputCallback(promptText)

    if (node.variable.endsWith('$')) {
      this.state.variables[node.variable] = input
    } else {
      const num = parseFloat(input)
      if (isNaN(num)) {
        throw new Error('?TYPE MISMATCH ERROR')
      }
      this.state.variables[node.variable] = num
    }
  },

  /**
   * Execute IF statement
   * @param {Object} node - IF AST node
   * @returns {Promise}
   */
  async executeIf(node) {
    const condition = this.evaluate(node.condition)
    if (condition) {
      await this.executeNode(node.thenStatement)
    }
  },

  /**
   * Execute GOTO statement
   * @param {Object} node - GOTO AST node
   */
  executeGoto(node) {
    if (!this.state.program.has(node.lineNumber)) {
      throw new Error(`?UNDEF'D STATEMENT ERROR`)
    }
    this.state.nextLine = node.lineNumber
  },

  /**
   * Execute FOR statement
   * @param {Object} node - FOR AST node
   */
  executeFor(node) {
    const startValue = this.evaluate(node.start)
    const endValue = this.evaluate(node.end)
    const stepValue = this.evaluate(node.step)

    this.state.variables[node.variable] = startValue

    this.state.forStack.push({
      variable: node.variable,
      endValue,
      stepValue,
      bodyStart: this.state.currentLine
    })
  },

  /**
   * Execute NEXT statement
   * @param {Object} node - NEXT AST node
   */
  executeNext(node) {
    if (this.state.forStack.length === 0) {
      throw new Error('?NEXT WITHOUT FOR ERROR')
    }

    const loop = this.state.forStack[this.state.forStack.length - 1]

    if (node.variable && node.variable !== loop.variable) {
      throw new Error('?NEXT WITHOUT FOR ERROR')
    }

    const currentValue = this.state.variables[loop.variable]
    const newValue = currentValue + loop.stepValue

    if ((loop.stepValue > 0 && newValue <= loop.endValue) ||
        (loop.stepValue < 0 && newValue >= loop.endValue)) {
      this.state.variables[loop.variable] = newValue
      this.state.nextLine = loop.bodyStart
    } else {
      this.state.forStack.pop()
    }
  },

  /**
   * Execute LIST command
   * @param {Object} node - LIST AST node
   */
  executeList(node) {
    const lines = Array.from(this.state.program.keys()).sort((a, b) => a - b)

    if (lines.length === 0) {
      this.println('')
      return
    }

    let start = node.start !== null ? node.start : lines[0]
    let end = node.end !== null ? node.end : lines[lines.length - 1]

    for (const lineNum of lines) {
      if (lineNum >= start && lineNum <= end) {
        const line = this.state.program.get(lineNum)
        this.println(`${lineNum} ${line.source.replace(/^\d+\s*/, '')}`)
      }
    }
  },

  /**
   * Execute NEW command
   */
  executeNew() {
    this.state.program.clear()
    this.state.variables = {}
    this.state.forStack = []
    this.println('')
  },

  /**
   * Execute HOME command
   */
  executeHome() {
    if (this.state.clearCallback) {
      this.state.clearCallback()
    }
  },

  /**
   * Evaluate expression
   * @param {Object} node - Expression AST node
   * @returns {*} Value
   */
  evaluate(node) {
    switch (node.type) {
      case 'NUMBER':
        return node.value

      case 'STRING':
        return node.value

      case 'VARIABLE':
        if (!(node.name in this.state.variables)) {
          this.state.variables[node.name] = node.name.endsWith('$') ? '' : 0
        }
        return this.state.variables[node.name]

      case 'BINARY': {
        const left = this.evaluate(node.left)
        const right = this.evaluate(node.right)

        switch (node.operator) {
          case '+': return left + right
          case '-': return left - right
          case '*': return left * right
          case '/':
            if (right === 0) throw new Error('?DIVISION BY ZERO ERROR')
            return left / right
          case '=': return left === right ? 1 : 0
          case '<>': return left !== right ? 1 : 0
          case '<': return left < right ? 1 : 0
          case '>': return left > right ? 1 : 0
          case '<=': return left <= right ? 1 : 0
          case '>=': return left >= right ? 1 : 0
          default:
            throw new Error(`Unknown operator: ${node.operator}`)
        }
      }

      case 'UNARY':
        const operand = this.evaluate(node.operand)
        if (node.operator === '-') return -operand
        throw new Error(`Unknown unary operator: ${node.operator}`)

      default:
        throw new Error(`Cannot evaluate node type: ${node.type}`)
    }
  },

  /**
   * Print text to output
   * @param {string} text
   */
  print(text) {
    if (this.state.outputCallback) {
      this.state.outputCallback(text)
    }
  },

  /**
   * Print line to output
   * @param {string} text
   */
  println(text) {
    if (this.state.outputLineCallback) {
      this.state.outputLineCallback(text)
    }
  }
}
