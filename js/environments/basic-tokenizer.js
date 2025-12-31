/**
 * Retrograde - BASIC Tokenizer
 * Lexical analysis for Applesoft BASIC
 */
const BasicTokenizer = {
  TOKEN_TYPES: {
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    KEYWORD: 'KEYWORD',
    IDENTIFIER: 'IDENTIFIER',
    OPERATOR: 'OPERATOR',
    PUNCTUATION: 'PUNCTUATION',
    EOL: 'EOL',
    EOF: 'EOF'
  },

  KEYWORDS: [
    'PRINT', 'LET', 'INPUT', 'IF', 'THEN', 'GOTO', 'GOSUB', 'RETURN',
    'FOR', 'TO', 'STEP', 'NEXT', 'REM', 'END', 'LIST', 'RUN', 'NEW',
    'HOME', 'AND', 'OR', 'NOT'
  ],

  OPERATORS: ['<>', '<=', '>=', '=', '<', '>', '+', '-', '*', '/', '^'],

  PUNCTUATION: ['(', ')', ',', ';', ':'],

  /**
   * Tokenize a line of BASIC code
   * @param {string} line - Source line
   * @returns {Array} Array of token objects
   */
  tokenize(line) {
    const tokens = []
    const source = line.trim()
    let pos = 0

    while (pos < source.length) {
      const char = source[pos]

      if (/\s/.test(char)) {
        pos++
        continue
      }

      if (/\d/.test(char)) {
        const number = this.readNumber(source, pos)
        tokens.push(this.createToken(this.TOKEN_TYPES.NUMBER, number.value, pos))
        pos = number.endPos
        continue
      }

      if (char === '"') {
        const str = this.readString(source, pos)
        tokens.push(this.createToken(this.TOKEN_TYPES.STRING, str.value, pos))
        pos = str.endPos
        continue
      }

      if (/[A-Za-z]/.test(char)) {
        const word = this.readWord(source, pos)
        const upperWord = word.value.toUpperCase()

        if (this.isKeyword(upperWord)) {
          tokens.push(this.createToken(this.TOKEN_TYPES.KEYWORD, upperWord, pos))
        } else {
          tokens.push(this.createToken(this.TOKEN_TYPES.IDENTIFIER, upperWord, pos))
        }
        pos = word.endPos
        continue
      }

      const op = this.readOperator(source, pos)
      if (op) {
        tokens.push(this.createToken(this.TOKEN_TYPES.OPERATOR, op.value, pos))
        pos = op.endPos
        continue
      }

      if (this.PUNCTUATION.includes(char)) {
        tokens.push(this.createToken(this.TOKEN_TYPES.PUNCTUATION, char, pos))
        pos++
        continue
      }

      throw new Error(`Unknown character: '${char}' at position ${pos}`)
    }

    tokens.push(this.createToken(this.TOKEN_TYPES.EOL, null, pos))
    return tokens
  },

  /**
   * Read number (integer or float)
   * @param {string} source - Source code
   * @param {number} startPos - Start position
   * @returns {Object} { value, endPos }
   */
  readNumber(source, startPos) {
    let pos = startPos
    let numStr = ''
    let hasDecimal = false

    while (pos < source.length) {
      const char = source[pos]

      if (/\d/.test(char)) {
        numStr += char
        pos++
      } else if (char === '.' && !hasDecimal) {
        hasDecimal = true
        numStr += char
        pos++
      } else {
        break
      }
    }

    const value = hasDecimal ? parseFloat(numStr) : parseInt(numStr, 10)
    return { value, endPos: pos }
  },

  /**
   * Read quoted string
   * @param {string} source - Source code
   * @param {number} startPos - Start position
   * @returns {Object} { value, endPos }
   */
  readString(source, startPos) {
    let pos = startPos + 1
    let value = ''

    while (pos < source.length) {
      const char = source[pos]

      if (char === '"') {
        pos++
        break
      }

      value += char
      pos++
    }

    return { value, endPos: pos }
  },

  /**
   * Read word (keyword or identifier)
   * @param {string} source - Source code
   * @param {number} startPos - Start position
   * @returns {Object} { value, endPos }
   */
  readWord(source, startPos) {
    let pos = startPos
    let value = ''

    while (pos < source.length) {
      const char = source[pos]

      if (/[A-Za-z0-9$]/.test(char)) {
        value += char
        pos++
      } else {
        break
      }
    }

    return { value, endPos: pos }
  },

  /**
   * Read operator (try multi-char first)
   * @param {string} source - Source code
   * @param {number} startPos - Start position
   * @returns {Object|null} { value, endPos } or null
   */
  readOperator(source, startPos) {
    const twoChar = source.substring(startPos, startPos + 2)
    if (this.OPERATORS.includes(twoChar)) {
      return { value: twoChar, endPos: startPos + 2 }
    }

    const oneChar = source[startPos]
    if (this.OPERATORS.includes(oneChar)) {
      return { value: oneChar, endPos: startPos + 1 }
    }

    return null
  },

  /**
   * Create a token object
   * @param {string} type - Token type
   * @param {*} value - Token value
   * @param {number} position - Column position
   * @returns {Object} Token object
   */
  createToken(type, value, position) {
    return { type, value, position }
  },

  /**
   * Check if word is a keyword
   * @param {string} word - Word to check
   * @returns {boolean}
   */
  isKeyword(word) {
    return this.KEYWORDS.includes(word.toUpperCase())
  }
}
