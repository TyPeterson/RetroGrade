/**
 * Retrograde - BASIC Parser
 * Converts tokens into Abstract Syntax Tree (AST)
 */
const BasicParser = {
  state: {
    tokens: [],
    pos: 0,
    currentToken: null
  },

  /**
   * Parse tokens into AST
   * @param {Array} tokens - Token array from tokenizer
   * @returns {Object} AST node
   */
  parse(tokens) {
    this.state.tokens = tokens
    this.state.pos = 0
    this.state.currentToken = tokens[0]

    if (this.isAtEnd()) {
      return { type: 'EMPTY' }
    }

    if (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.NUMBER) {
      const lineNumber = this.currentToken().value
      this.advance()
      const statement = this.parseStatement()
      return { type: 'PROGRAM_LINE', lineNumber, statement }
    }

    return this.parseStatement()
  },

  /**
   * Parse a statement
   * @returns {Object} Statement AST node
   */
  parseStatement() {
    const token = this.currentToken()

    if (token.type === BasicTokenizer.TOKEN_TYPES.KEYWORD) {
      switch (token.value) {
        case 'PRINT':
          return this.parsePrint()
        case 'LET':
          return this.parseLet()
        case 'INPUT':
          return this.parseInput()
        case 'IF':
          return this.parseIf()
        case 'GOTO':
          return this.parseGoto()
        case 'FOR':
          return this.parseFor()
        case 'NEXT':
          return this.parseNext()
        case 'REM':
          return this.parseRem()
        case 'END':
          this.advance()
          return { type: 'END' }
        case 'LIST':
          return this.parseList()
        case 'RUN':
          this.advance()
          return { type: 'RUN' }
        case 'NEW':
          this.advance()
          return { type: 'NEW' }
        case 'HOME':
          this.advance()
          return { type: 'HOME' }
        default:
          throw new Error(`Unknown keyword: ${token.value}`)
      }
    }

    if (token.type === BasicTokenizer.TOKEN_TYPES.IDENTIFIER) {
      return this.parseLet()
    }

    throw new Error(`Unexpected token: ${token.type}`)
  },

  /**
   * Parse PRINT statement
   * @returns {Object} PRINT AST node
   */
  parsePrint() {
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'PRINT')
    const expressions = []
    const separators = []

    while (!this.isAtEnd() && this.currentToken().type !== BasicTokenizer.TOKEN_TYPES.EOL) {
      expressions.push(this.parseExpression())

      if (this.check(BasicTokenizer.TOKEN_TYPES.PUNCTUATION, ';')) {
        separators.push(';')
        this.advance()
      } else if (this.check(BasicTokenizer.TOKEN_TYPES.PUNCTUATION, ',')) {
        separators.push(',')
        this.advance()
      } else {
        break
      }
    }

    return { type: 'PRINT', expressions, separators }
  },

  /**
   * Parse LET statement (LET keyword is optional)
   * @returns {Object} LET AST node
   */
  parseLet() {
    if (this.check(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'LET')) {
      this.advance()
    }

    const variable = this.expect(BasicTokenizer.TOKEN_TYPES.IDENTIFIER).value
    this.expect(BasicTokenizer.TOKEN_TYPES.OPERATOR, '=')
    const value = this.parseExpression()

    return { type: 'LET', variable, value }
  },

  /**
   * Parse INPUT statement
   * @returns {Object} INPUT AST node
   */
  parseInput() {
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'INPUT')
    let prompt = ''

    if (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.STRING) {
      prompt = this.currentToken().value
      this.advance()

      if (this.check(BasicTokenizer.TOKEN_TYPES.PUNCTUATION, ';')) {
        this.advance()
      } else if (this.check(BasicTokenizer.TOKEN_TYPES.PUNCTUATION, ',')) {
        this.advance()
        prompt += ','
      }
    }

    const variable = this.expect(BasicTokenizer.TOKEN_TYPES.IDENTIFIER).value

    return { type: 'INPUT', prompt, variable }
  },

  /**
   * Parse IF/THEN statement
   * @returns {Object} IF AST node
   */
  parseIf() {
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'IF')
    const condition = this.parseExpression()
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'THEN')

    let thenStatement
    if (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.NUMBER) {
      thenStatement = { type: 'GOTO', lineNumber: this.currentToken().value }
      this.advance()
    } else {
      thenStatement = this.parseStatement()
    }

    return { type: 'IF', condition, thenStatement }
  },

  /**
   * Parse GOTO statement
   * @returns {Object} GOTO AST node
   */
  parseGoto() {
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'GOTO')
    const lineNumber = this.expect(BasicTokenizer.TOKEN_TYPES.NUMBER).value
    return { type: 'GOTO', lineNumber }
  },

  /**
   * Parse FOR statement
   * @returns {Object} FOR AST node
   */
  parseFor() {
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'FOR')
    const variable = this.expect(BasicTokenizer.TOKEN_TYPES.IDENTIFIER).value
    this.expect(BasicTokenizer.TOKEN_TYPES.OPERATOR, '=')
    const start = this.parseExpression()
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'TO')
    const end = this.parseExpression()

    let step = { type: 'NUMBER', value: 1 }
    if (this.check(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'STEP')) {
      this.advance()
      step = this.parseExpression()
    }

    return { type: 'FOR', variable, start, end, step }
  },

  /**
   * Parse NEXT statement
   * @returns {Object} NEXT AST node
   */
  parseNext() {
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'NEXT')
    let variable = null

    if (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.IDENTIFIER) {
      variable = this.currentToken().value
      this.advance()
    }

    return { type: 'NEXT', variable }
  },

  /**
   * Parse REM statement
   * @returns {Object} REM AST node
   */
  parseRem() {
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'REM')
    return { type: 'REM' }
  },

  /**
   * Parse LIST statement
   * @returns {Object} LIST AST node
   */
  parseList() {
    this.expect(BasicTokenizer.TOKEN_TYPES.KEYWORD, 'LIST')
    let start = null
    let end = null

    if (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.NUMBER) {
      start = this.currentToken().value
      this.advance()

      if (this.check(BasicTokenizer.TOKEN_TYPES.OPERATOR, '-')) {
        this.advance()
        if (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.NUMBER) {
          end = this.currentToken().value
          this.advance()
        }
      }
    }

    return { type: 'LIST', start, end }
  },

  /**
   * Parse expression with operator precedence
   * @returns {Object} Expression AST node
   */
  parseExpression() {
    return this.parseComparison()
  },

  /**
   * Parse comparison operators
   * @returns {Object} Expression AST node
   */
  parseComparison() {
    let node = this.parseAddition()

    while (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.OPERATOR) {
      const op = this.currentToken().value
      if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
        this.advance()
        const right = this.parseAddition()
        node = { type: 'BINARY', operator: op, left: node, right }
      } else {
        break
      }
    }

    return node
  },

  /**
   * Parse addition and subtraction
   * @returns {Object} Expression AST node
   */
  parseAddition() {
    let node = this.parseMultiplication()

    while (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.OPERATOR) {
      const op = this.currentToken().value
      if (['+', '-'].includes(op)) {
        this.advance()
        const right = this.parseMultiplication()
        node = { type: 'BINARY', operator: op, left: node, right }
      } else {
        break
      }
    }

    return node
  },

  /**
   * Parse multiplication and division
   * @returns {Object} Expression AST node
   */
  parseMultiplication() {
    let node = this.parsePrimary()

    while (this.currentToken().type === BasicTokenizer.TOKEN_TYPES.OPERATOR) {
      const op = this.currentToken().value
      if (['*', '/'].includes(op)) {
        this.advance()
        const right = this.parsePrimary()
        node = { type: 'BINARY', operator: op, left: node, right }
      } else {
        break
      }
    }

    return node
  },

  /**
   * Parse primary value (number, string, variable, parenthesized expression)
   * @returns {Object} Value AST node
   */
  parsePrimary() {
    const token = this.currentToken()

    if (token.type === BasicTokenizer.TOKEN_TYPES.NUMBER) {
      this.advance()
      return { type: 'NUMBER', value: token.value }
    }

    if (token.type === BasicTokenizer.TOKEN_TYPES.STRING) {
      this.advance()
      return { type: 'STRING', value: token.value }
    }

    if (token.type === BasicTokenizer.TOKEN_TYPES.IDENTIFIER) {
      this.advance()
      return { type: 'VARIABLE', name: token.value }
    }

    if (this.check(BasicTokenizer.TOKEN_TYPES.PUNCTUATION, '(')) {
      this.advance()
      const expr = this.parseExpression()
      this.expect(BasicTokenizer.TOKEN_TYPES.PUNCTUATION, ')')
      return expr
    }

    if (this.check(BasicTokenizer.TOKEN_TYPES.OPERATOR, '-')) {
      this.advance()
      const operand = this.parsePrimary()
      return { type: 'UNARY', operator: '-', operand }
    }

    throw new Error(`Unexpected token in expression: ${token.type} (${token.value})`)
  },

  /**
   * Get current token
   * @returns {Object} Current token
   */
  currentToken() {
    return this.state.currentToken
  },

  /**
   * Advance to next token
   */
  advance() {
    if (!this.isAtEnd()) {
      this.state.pos++
      this.state.currentToken = this.state.tokens[this.state.pos]
    }
  },

  /**
   * Check if current token matches type and optionally value
   * @param {string} type - Token type
   * @param {*} value - Optional token value
   * @returns {boolean}
   */
  check(type, value = null) {
    if (this.isAtEnd()) return false
    if (this.currentToken().type !== type) return false
    if (value !== null && this.currentToken().value !== value) return false
    return true
  },

  /**
   * Expect specific token type and optionally value
   * @param {string} type - Token type
   * @param {*} value - Optional token value
   * @returns {Object} The expected token
   */
  expect(type, value = null) {
    if (!this.check(type, value)) {
      throw new Error(`Expected ${type}${value ? ` '${value}'` : ''}, got ${this.currentToken().type}`)
    }
    const token = this.currentToken()
    this.advance()
    return token
  },

  /**
   * Check if at end of tokens
   * @returns {boolean}
   */
  isAtEnd() {
    return this.currentToken().type === BasicTokenizer.TOKEN_TYPES.EOL ||
           this.currentToken().type === BasicTokenizer.TOKEN_TYPES.EOF
  }
}
