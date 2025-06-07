export interface PgnGame {
  headers: Record<string, string>
  moves: string[]
  result: string
  comments: Record<number, string>
  variations: Record<number, string[]>
}

export interface PgnHeader {
  event?: string
  site?: string
  date?: string
  round?: string
  white?: string
  black?: string
  result?: string
  eco?: string
  whiteElo?: string
  blackElo?: string
  fen?: string
}

export function parsePgn(pgnText: string): PgnGame[] {
  const games: PgnGame[] = []
  
  // Normalize line endings
  const normalizedPgn = pgnText
    .replace(/\r\n/g, '\n')  // Normalize Windows line endings
    .replace(/\r/g, '\n')    // Normalize Mac line endings
  
  // Split games more intelligently - look for new game patterns
  // A new game typically starts with [Event or multiple headers at the beginning
  const gameStrings: string[] = []
  
  // Split by multiple consecutive newlines, but then recombine parts that belong together
  const parts = normalizedPgn.split(/\n\s*\n/).filter(part => part.trim())
  
  let currentGame = ''
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim()
    
    // Check if this part starts with headers (indicating a new game)
    const startsWithEvent = part.startsWith('[Event')
    const hasHeaders = /^\[[\w\s]+\s+"[^"]*"\]/.test(part)
    const hasMoves = /^\d+\./.test(part) // Starts with move number like "1."
    
    if (startsWithEvent || (hasHeaders && currentGame && !hasMoves)) {
      // This is definitely a new game
      if (currentGame.trim()) {
        gameStrings.push(currentGame.trim())
      }
      currentGame = part
    } else {
      // This is part of the current game (could be moves after headers)
      if (currentGame) {
        currentGame += '\n\n' + part
      } else {
        currentGame = part
      }
    }
  }
  
  // Don't forget the last game
  if (currentGame.trim()) {
    gameStrings.push(currentGame.trim())
  }
  
  for (const gameString of gameStrings) {
    const game = parseSingleGame(gameString)
    if (game) {
      games.push(game)
    }
  }
  
  return games
}

function parseSingleGame(gameString: string): PgnGame | null {
  try {
    const lines = gameString.split('\n').map(line => line.trim()).filter(line => line)
    const headers: Record<string, string> = {}
    const moveText: string[] = []
    
    let inHeaders = true
    
    for (const line of lines) {
      if (inHeaders && line.startsWith('[') && line.endsWith(']')) {
        // Parse header
        const match = line.match(/\[(\w+)\s+"([^"]*)"\]/)
        if (match) {
          headers[match[1]] = match[2]
        }
      } else if (line && !line.startsWith('[')) {
        inHeaders = false
        moveText.push(line)
      }
    }
    
    const fullMoveText = moveText.join(' ')
    const moves = parseMoves(fullMoveText)
    const result = extractResult(fullMoveText)
    
    return {
      headers,
      moves,
      result,
      comments: {},
      variations: {}
    }
  } catch (error) {
    console.error('Error parsing PGN game:', error)
    return null
  }
}

function parseMoves(moveText: string): string[] {
  if (!moveText || !moveText.trim()) {
    return []
  }
  
  // Remove comments in braces and parentheses
  let cleanText = moveText
    .replace(/\{[^}]*\}/g, ' ')  // Remove comments in braces
    .replace(/\([^)]*\)/g, ' ')  // Remove variations in parentheses
    .replace(/\$\d+/g, ' ')      // Remove NAG annotations like $1, $2, etc.
  
  // Split by whitespace and process each token
  const tokens = cleanText.split(/\s+/).filter(token => token.trim())
  const moves: string[] = []
  
  for (const token of tokens) {
    // Skip move numbers (like "1.", "2.", "15.")
    if (/^\d+\.+$/.test(token)) {
      continue
    }
    
    // Skip game results
    if (['1-0', '0-1', '1/2-1/2', '*'].includes(token)) {
      continue
    }
    
    // Skip empty tokens
    if (!token.trim()) {
      continue
    }
    
    // This should be a valid move - add it
    moves.push(token.trim())
  }
  
  return moves
}

function extractResult(moveText: string): string {
  const resultMatch = moveText.match(/(1-0|0-1|1\/2-1\/2|\*)$/)
  return resultMatch ? resultMatch[1] : '*'
}

export function formatPgnHeaders(headers: Record<string, string>): string {
  const orderedKeys = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result', 'ECO', 'WhiteElo', 'BlackElo']
  let formatted = ''
  
  for (const key of orderedKeys) {
    if (headers[key]) {
      formatted += `[${key} "${headers[key]}"]\n`
    }
  }
  
  // Add any remaining headers
  for (const [key, value] of Object.entries(headers)) {
    if (!orderedKeys.includes(key)) {
      formatted += `[${key} "${value}"]\n`
    }
  }
  
  return formatted
}

export function formatMovesForDisplay(moves: string[]): { moveNumber: number, white?: string, black?: string }[] {
  const formattedMoves: { moveNumber: number, white?: string, black?: string }[] = []
  
  for (let i = 0; i < moves.length; i += 2) {
    formattedMoves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1]
    })
  }
  
  return formattedMoves
}

export function getGameTitle(headers: Record<string, string>): string {
  const white = headers.White || 'Unknown'
  const black = headers.Black || 'Unknown'
  const result = headers.Result || '*'
  const date = headers.Date || ''
  
  return `${white} vs ${black} (${result}) ${date}`
}

export function validatePgn(pgnText: string): { isValid: boolean, errors: string[] } {
  const errors: string[] = []
  
  if (!pgnText.trim()) {
    errors.push('PGN text is empty')
    return { isValid: false, errors }
  }
  
  try {
    const games = parsePgn(pgnText)
    if (games.length === 0) {
      errors.push('No valid games found in PGN')
    }
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return { isValid: errors.length === 0, errors }
} 