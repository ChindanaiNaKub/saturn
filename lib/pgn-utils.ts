import { OPENINGS_DATABASE } from './opening-database';

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
    const headers: Record<string, string> = {};
    let moveText = '';

    // Find all headers
    const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
    let match;
    let lastHeaderIndex = -1;
    while ((match = headerRegex.exec(gameString)) !== null) {
      headers[match[1]] = match[2];
      lastHeaderIndex = match.index + match[0].length;
    }

    if (lastHeaderIndex !== -1) {
      moveText = gameString.substring(lastHeaderIndex).trim();
    } else {
      // No headers found, assume the whole string is movetext
      moveText = gameString.trim();
    }
    
    const moves = parseMoves(moveText)
    const result = extractResult(moveText)
    
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

export function formatMovesForDisplay(moves: string[]): { moveNumber: number, white: string, black?: string }[] {
  const formattedMoves: { moveNumber: number, white: string, black?: string }[] = []
  
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

export type MoveClassification = 
  'brilliant' |
  'great' |
  'best' |
  'excellent' |
  'good' |
  'book' |
  'inaccuracy' |
  'mistake' |
  'blunder';

export interface MoveAnalysis {
  classification: MoveClassification;
  comment?: string;
  centipawnLoss: number;
}

export interface GameReviewData {
  white: {
    accuracy: number;
    moveCounts: Record<MoveClassification, number>;
  };
  black: {
    accuracy: number;
    moveCounts: Record<MoveClassification, number>;
  };
  evaluationHistory: { move: number; eval: number }[];
}

/**
 * Converts a centipawn evaluation to a win percentage.
 * The formula is from Lichess and is based on real game data.
 * @param centipawns - The evaluation in centipawns.
 * @returns The win percentage (0-100).
 */
function centipawnsToWinPercent(centipawns: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * centipawns)) - 1);
}

/**
 * Calculates the accuracy of a single move based on the change in win percentage.
 * The formula is from Lichess.
 * @param winPercentBefore - Win percentage before the move.
 * @param winPercentAfter - Win percentage after the move.
 * @returns The accuracy of the move (0-100).
 */
export function calculateMoveAccuracy(winPercentBefore: number, winPercentAfter: number): number {
  const accuracy = 103.1668 * Math.exp(-0.04354 * (winPercentBefore - winPercentAfter)) - 3.1669;
  return Math.max(0, Math.min(100, accuracy));
}

export function isOpening(moves: string[]): boolean {
  return OPENINGS_DATABASE.some(opening => 
    opening.moves.length >= moves.length &&
    moves.every((move, index) => move === opening.moves[index])
  );
}

export function getOpeningName(eco: string): string {
  const opening = OPENINGS_DATABASE.find(o => o.eco === eco);
  return opening ? opening.name : 'Unknown Opening';
} 