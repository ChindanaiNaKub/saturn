export interface Opening {
  eco: string
  name: string
  variation?: string
  moves: string[]
}

// Common chess openings database
export const OPENINGS_DATABASE: Opening[] = [
  // Italian Game
  { eco: 'C50', name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  { eco: 'C51', name: 'Evans Gambit', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'] },
  { eco: 'C53', name: 'Italian Game', variation: 'Classical', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3'] },
  
  // Spanish (Ruy Lopez)
  { eco: 'C60', name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  { eco: 'C65', name: 'Ruy Lopez', variation: 'Berlin Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'] },
  { eco: 'C67', name: 'Ruy Lopez', variation: 'Berlin Defense, Rio de Janeiro', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4'] },
  { eco: 'C68', name: 'Ruy Lopez', variation: 'Exchange Variation', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'] },
  
  // Sicilian Defense
  { eco: 'B20', name: 'Sicilian Defense', moves: ['e4', 'c5'] },
  { eco: 'B21', name: 'Sicilian Defense', variation: 'Smith-Morra Gambit', moves: ['e4', 'c5', 'd4', 'cxd4', 'c3'] },
  { eco: 'B22', name: 'Sicilian Defense', variation: 'Alapin', moves: ['e4', 'c5', 'c3'] },
  { eco: 'B23', name: 'Sicilian Defense', variation: 'Closed', moves: ['e4', 'c5', 'Nc3'] },
  { eco: 'B27', name: 'Sicilian Defense', variation: 'Hyperaccelerated Dragon', moves: ['e4', 'c5', 'Nf3', 'g6'] },
  { eco: 'B30', name: 'Sicilian Defense', variation: 'Old Sicilian', moves: ['e4', 'c5', 'Nf3', 'Nc6'] },
  { eco: 'B32', name: 'Sicilian Defense', variation: 'Open', moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4'] },
  { eco: 'B33', name: 'Sicilian Defense', variation: 'Sveshnikov', moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e5'] },
  { eco: 'B40', name: 'Sicilian Defense', variation: 'French Variation', moves: ['e4', 'c5', 'Nf3', 'e6'] },
  { eco: 'B50', name: 'Sicilian Defense', moves: ['e4', 'c5', 'Nf3', 'd6'] },
  { eco: 'B51', name: 'Sicilian Defense', variation: 'Moscow', moves: ['e4', 'c5', 'Nf3', 'd6', 'Bb5+'] },
  { eco: 'B54', name: 'Sicilian Defense', variation: 'Dragon', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },
  { eco: 'B70', name: 'Sicilian Defense', variation: 'Dragon', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },
  { eco: 'B90', name: 'Sicilian Defense', variation: 'Najdorf', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
  
  // French Defense
  { eco: 'C00', name: 'French Defense', moves: ['e4', 'e6'] },
  { eco: 'C01', name: 'French Defense', variation: 'Exchange', moves: ['e4', 'e6', 'd4', 'd5', 'exd5'] },
  { eco: 'C02', name: 'French Defense', variation: 'Advance', moves: ['e4', 'e6', 'd4', 'd5', 'e5'] },
  { eco: 'C03', name: 'French Defense', variation: 'Tarrasch', moves: ['e4', 'e6', 'd4', 'd5', 'Nd2'] },
  { eco: 'C10', name: 'French Defense', variation: 'Rubinstein', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4'] },
  { eco: 'C11', name: 'French Defense', variation: 'Classical', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'] },
  { eco: 'C15', name: 'French Defense', variation: 'Winawer', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'] },
  
  // Caro-Kann Defense
  { eco: 'B10', name: 'Caro-Kann Defense', moves: ['e4', 'c6'] },
  { eco: 'B11', name: 'Caro-Kann Defense', variation: 'Two Knights', moves: ['e4', 'c6', 'Nc3', 'd5', 'Nf3'] },
  { eco: 'B12', name: 'Caro-Kann Defense', variation: 'Advance', moves: ['e4', 'c6', 'd4', 'd5', 'e5'] },
  { eco: 'B13', name: 'Caro-Kann Defense', variation: 'Exchange', moves: ['e4', 'c6', 'd4', 'd5', 'exd5'] },
  { eco: 'B15', name: 'Caro-Kann Defense', variation: 'Main Line', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4'] },
  
  // King\'s Gambit
  { eco: 'C30', name: 'King\'s Gambit', moves: ['e4', 'e5', 'f4'] },
  { eco: 'C31', name: 'King\'s Gambit Declined', moves: ['e4', 'e5', 'f4', 'Bc5'] },
  { eco: 'C33', name: 'King\'s Gambit Accepted', moves: ['e4', 'e5', 'f4', 'exf4'] },
  
  // Queen\'s Gambit
  { eco: 'D06', name: 'Queen\'s Gambit', moves: ['d4', 'd5', 'c4'] },
  { eco: 'D07', name: 'Queen\'s Gambit Declined', variation: 'Chigorin Defense', moves: ['d4', 'd5', 'c4', 'Nc6'] },
  { eco: 'D20', name: 'Queen\'s Gambit Accepted', moves: ['d4', 'd5', 'c4', 'dxc4'] },
  { eco: 'D30', name: 'Queen\'s Gambit Declined', moves: ['d4', 'd5', 'c4', 'e6'] },
  { eco: 'D35', name: 'Queen\'s Gambit Declined', variation: 'Exchange', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5'] },
  { eco: 'D43', name: 'Queen\'s Gambit Declined', variation: 'Semi-Slav', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'c6'] },
  
  // Indian Defenses
  { eco: 'E00', name: 'Catalan Opening', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'] },
  { eco: 'E20', name: 'Nimzo-Indian Defense', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
  { eco: 'E32', name: 'Nimzo-Indian Defense', variation: 'Classical', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2'] },
  { eco: 'E60', name: 'King\'s Indian Defense', moves: ['d4', 'Nf6', 'c4', 'g6'] },
  { eco: 'E70', name: 'King\'s Indian Defense', variation: 'Normal', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4'] },
  { eco: 'E90', name: 'King\'s Indian Defense', variation: 'Classical', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2'] },
  { eco: 'D70', name: 'Grünfeld Defense', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'] },
  { eco: 'D80', name: 'Grünfeld Defense', variation: 'Russian', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'Qb3'] },
  { eco: 'A50', name: 'Queen\'s Indian Defense', moves: ['d4', 'Nf6', 'c4', 'b6'] },
  
  // English Opening
  { eco: 'A10', name: 'English Opening', moves: ['c4'] },
  { eco: 'A20', name: 'English Opening', variation: 'Reversed Sicilian', moves: ['c4', 'e5'] },
  { eco: 'A30', name: 'English Opening', variation: 'Symmetrical', moves: ['c4', 'c5'] },
  
  // Others
  { eco: 'A00', name: 'Uncommon Opening', moves: [] },
  { eco: 'A40', name: 'Queen\'s Pawn Opening', moves: ['d4'] },
  { eco: 'A45', name: 'Trompowsky Attack', moves: ['d4', 'Nf6', 'Bg5'] },
  { eco: 'B00', name: 'King\'s Pawn Opening', moves: ['e4'] },
  { eco: 'B01', name: 'Scandinavian Defense', moves: ['e4', 'd5'] },
  { eco: 'B02', name: 'Alekhine Defense', moves: ['e4', 'Nf6'] },
  { eco: 'B06', name: 'Modern Defense', moves: ['e4', 'g6'] },
  { eco: 'B07', name: 'Pirc Defense', moves: ['e4', 'd6', 'Nf3', 'Nf6'] },
  { eco: 'C20', name: 'King\'s Pawn Game', moves: ['e4', 'e5'] },
  { eco: 'C40', name: 'King\'s Knight Opening', moves: ['e4', 'e5', 'Nf3'] },
  { eco: 'C44', name: 'Scotch Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
  { eco: 'C45', name: 'Scotch Game', variation: 'Schmidt', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6'] },
  { eco: 'C46', name: 'Three Knights Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3'] },
  { eco: 'C47', name: 'Four Knights Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'] },
  { eco: 'C48', name: 'Four Knights Game', variation: 'Spanish', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5'] },
  { eco: 'C55', name: 'Two Knights Defense', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'] },
  { eco: 'C57', name: 'Two Knights Defense', variation: 'Fried Liver Attack', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nd4'] },
  { eco: 'D00', name: 'Queen\'s Pawn Game', moves: ['d4', 'd5'] },
  { eco: 'D10', name: 'Slav Defense', moves: ['d4', 'd5', 'c4', 'c6'] },
  { eco: 'D15', name: 'Slav Defense', variation: 'Main Line', moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3'] },
  { eco: 'E10', name: 'Blumenfeld Gambit', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'c5', 'd5', 'b5'] },
  { eco: 'E15', name: 'Queen\'s Indian Defense', variation: 'Main Line', moves: ['d4', 'Nf6', 'c4', 'b6', 'Nf3', 'e6', 'g3'] },
]

export function identifyOpening(moves: string[]): Opening | null {
  if (moves.length === 0) return null

  // Find the best match (longest matching sequence)
  let bestMatch: Opening | null = null
  let bestMatchLength = 0

  for (const opening of OPENINGS_DATABASE) {
    if (opening.moves.length === 0) continue

    let matchLength = 0
    for (let i = 0; i < Math.min(moves.length, opening.moves.length); i++) {
      // Normalize moves for comparison (remove check symbols, captures, etc.)
      const normalizedMove = moves[i].replace(/[+#x]/g, '').trim()
      const normalizedOpeningMove = opening.moves[i].replace(/[+#x]/g, '').trim()
      
      if (normalizedMove === normalizedOpeningMove) {
        matchLength++
      } else {
        break
      }
    }

    // If this opening matches completely and is longer than previous best
    if (matchLength === opening.moves.length && matchLength > bestMatchLength) {
      bestMatch = opening
      bestMatchLength = matchLength
    }
  }

  return bestMatch
}

export function getOpeningName(eco: string): string {
  const opening = OPENINGS_DATABASE.find(o => o.eco === eco)
  if (!opening) return eco
  
  return opening.variation 
    ? `${opening.name}: ${opening.variation}` 
    : opening.name
} 