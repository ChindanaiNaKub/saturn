'use client'

export interface EngineAnalysis {
  evaluation: number
  depth: number
  bestMove: string
  pv: string[] // Principal variation
  nodes: number
  mate?: number // Mate in X moves
}

export interface StockfishMessage {
  bestmove?: string
  info?: {
    depth?: number
    score?: { cp?: number, mate?: number }
    pv?: string
    nodes?: number
  }
}

export class StockfishEngine {
  private worker: Worker | null = null
  private isReady = false
  private currentAnalysis: EngineAnalysis | null = null
  private analysisCallbacks: ((analysis: EngineAnalysis) => void)[] = []

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create a new worker with the public stockfish worker file
        this.worker = new Worker('/stockfish-worker.js')
        
        this.worker.onmessage = (event) => {
          const message = event.data
          console.log('Stockfish:', message)
          
          if (message === 'readyok') {
            this.isReady = true
            resolve()
          } else if (message === 'uciok') {
            // Send isready after uciok
            this.sendCommand('isready')
          } else if (message.startsWith('bestmove')) {
            this.handleBestMove(message)
          } else if (message.startsWith('info')) {
            this.handleInfo(message)
          }
        }

        this.worker.onerror = (error) => {
          console.error('Stockfish error:', error)
          reject(error)
        }

        // Initialize UCI after a short delay to ensure worker is ready
        setTimeout(() => {
          this.sendCommand('uci')
        }, 100)
        
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error)
        reject(error)
      }
    })
  }

  sendCommand(command: string) {
    if (this.worker && this.isReady) {
      this.worker.postMessage(command)
    } else if (this.worker && command === 'uci' || command === 'isready') {
      // Allow uci and isready commands before engine is ready
      this.worker.postMessage(command)
    }
  }

  async analyzePosition(fen: string, depth: number = 20, callback?: (analysis: EngineAnalysis) => void): Promise<EngineAnalysis> {
    return new Promise((resolve) => {
      this.currentAnalysis = {
        evaluation: 0,
        depth: 0,
        bestMove: '',
        pv: [],
        nodes: 0
      }

      if (callback) {
        this.analysisCallbacks.push(callback)
      }

      // Clear previous analysis
      this.sendCommand('stop')
      
      // Set position
      this.sendCommand(`position fen ${fen}`)
      
      // Start analysis
      this.sendCommand(`go depth ${depth}`)

      // Timeout to ensure we get a result
      const timeout = setTimeout(() => {
        this.sendCommand('stop')
        if (callback) {
          this.analysisCallbacks = this.analysisCallbacks.filter(cb => cb !== callback)
        }
        resolve(this.currentAnalysis || {
          evaluation: 0,
          depth: 0,
          bestMove: '',
          pv: [],
          nodes: 0
        })
      }, 10000) // 10 second timeout

      // Store timeout for cleanup
      const originalCallbacksLength = this.analysisCallbacks.length
      this.analysisCallbacks.push(() => {
        clearTimeout(timeout)
        if (callback) {
          this.analysisCallbacks = this.analysisCallbacks.filter(cb => cb !== callback)
        }
        resolve(this.currentAnalysis!)
      })
    })
  }

  stopAnalysis() {
    this.sendCommand('stop')
    this.analysisCallbacks = []
  }

  private handleBestMove(message: string) {
    const parts = message.split(' ')
    const bestMove = parts[1]
    
    if (this.currentAnalysis) {
      this.currentAnalysis.bestMove = bestMove
      
      // Notify all callbacks that analysis is complete
      const callbacks = [...this.analysisCallbacks]
      this.analysisCallbacks = []
      callbacks.forEach(callback => callback(this.currentAnalysis!))
    }
  }

  private handleInfo(message: string) {
    if (!this.currentAnalysis) return

    // Parse depth
    const depthMatch = message.match(/depth (\d+)/)
    if (depthMatch) {
      this.currentAnalysis.depth = parseInt(depthMatch[1])
    }

    // Parse score
    const scoreMatch = message.match(/score (cp|mate) (-?\d+)/)
    if (scoreMatch) {
      if (scoreMatch[1] === 'cp') {
        // Convert centipawns to pawns
        this.currentAnalysis.evaluation = parseInt(scoreMatch[2]) / 100
      } else {
        // Mate score
        const mateIn = parseInt(scoreMatch[2])
        this.currentAnalysis.mate = mateIn
        this.currentAnalysis.evaluation = mateIn > 0 ? 100 : -100
      }
    }

    // Parse principal variation
    const pvMatch = message.match(/pv (.+)/)
    if (pvMatch) {
      this.currentAnalysis.pv = pvMatch[1].trim().split(' ')
      if (this.currentAnalysis.pv.length > 0) {
        this.currentAnalysis.bestMove = this.currentAnalysis.pv[0]
      }
    }

    // Parse nodes
    const nodesMatch = message.match(/nodes (\d+)/)
    if (nodesMatch) {
      this.currentAnalysis.nodes = parseInt(nodesMatch[1])
    }

    // Notify callbacks of progress
    if (this.analysisCallbacks.length > 0 && this.currentAnalysis.depth > 0) {
      // Only notify on significant depth updates
      if (this.currentAnalysis.depth % 5 === 0 || this.currentAnalysis.depth >= 15) {
        this.analysisCallbacks.forEach(callback => {
          if (typeof callback === 'function' && callback !== this.analysisCallbacks[this.analysisCallbacks.length - 1]) {
            callback(this.currentAnalysis!)
          }
        })
      }
    }
  }

  destroy() {
    this.stopAnalysis()
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.isReady = false
    this.currentAnalysis = null
  }

  isEngineReady(): boolean {
    return this.isReady
  }
}

// Singleton instance
let engineInstance: StockfishEngine | null = null

export const getStockfishEngine = async (): Promise<StockfishEngine> => {
  if (!engineInstance) {
    engineInstance = new StockfishEngine()
    await engineInstance.initialize()
  }
  return engineInstance
}

export const destroyStockfishEngine = () => {
  if (engineInstance) {
    engineInstance.destroy()
    engineInstance = null
  }
} 