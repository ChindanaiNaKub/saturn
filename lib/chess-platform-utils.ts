export interface PlatformGame {
  pgn: string
  white: string
  black: string
  result: string
  date: string
  timeControl?: string
  rated?: boolean
}

export class ChessPlatformImporter {
  static async fetchChessComGames(username: string, year?: number, month?: number): Promise<PlatformGame[]> {
    try {
      let url = `https://api.chess.com/pub/player/${username}/games`
      if (year && month) {
        // Format month with leading zero if needed
        const monthStr = month.toString().padStart(2, '0')
        url = `${url}/${year}/${monthStr}`
      } else {
        // Get current month if not specified
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0')
        url = `${url}/${currentYear}/${currentMonth}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch games from Chess.com')
      }

      const data = await response.json()
      const games: PlatformGame[] = []

      if (data.games && Array.isArray(data.games)) {
        for (const game of data.games) {
          if (game.pgn) {
            games.push({
              pgn: game.pgn,
              white: game.white?.username || 'Unknown',
              black: game.black?.username || 'Unknown',
              result: game.white?.result || '*',
              date: new Date(game.end_time * 1000).toLocaleDateString(),
              timeControl: game.time_control,
              rated: game.rated
            })
          }
        }
      }

      return games
    } catch (error) {
      console.error('Chess.com API error:', error)
      throw error
    }
  }

  static async fetchLichessGames(username: string, max: number = 20): Promise<PlatformGame[]> {
    try {
      const url = `https://lichess.org/api/games/user/${username}?max=${max}&pgnInJson=true`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/x-ndjson'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch games from Lichess')
      }

      const text = await response.text()
      const games: PlatformGame[] = []
      
      // Parse NDJSON (newline-delimited JSON)
      const lines = text.trim().split('\n')
      for (const line of lines) {
        if (line) {
          try {
            const game = JSON.parse(line)
            if (game.pgn) {
              games.push({
                pgn: game.pgn,
                white: game.players?.white?.user?.name || 'Unknown',
                black: game.players?.black?.user?.name || 'Unknown',
                result: game.winner ? (game.winner === 'white' ? '1-0' : '0-1') : '1/2-1/2',
                date: new Date(game.createdAt).toLocaleDateString(),
                timeControl: game.clock?.initial ? `${game.clock.initial}+${game.clock.increment}` : undefined,
                rated: game.rated
              })
            }
          } catch (e) {
            console.error('Error parsing game:', e)
          }
        }
      }

      return games
    } catch (error) {
      console.error('Lichess API error:', error)
      throw error
    }
  }

  static async fetchPlayerInfo(platform: 'chess.com' | 'lichess', username: string): Promise<any> {
    try {
      if (platform === 'chess.com') {
        const response = await fetch(`https://api.chess.com/pub/player/${username}`)
        if (!response.ok) throw new Error('Player not found')
        return await response.json()
      } else {
        const response = await fetch(`https://lichess.org/api/user/${username}`)
        if (!response.ok) throw new Error('Player not found')
        return await response.json()
      }
    } catch (error) {
      console.error(`Error fetching player info from ${platform}:`, error)
      throw error
    }
  }
} 