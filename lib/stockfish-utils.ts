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
  private messageQueue: string[] = []
  private initResolve: (() => void) | null = null

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[Stockfish] Creating worker...')
        this.initResolve = resolve
        
        // Try the simple worker first for better compatibility
        this.worker = new Worker('/simple-stockfish-worker.js')
        
        // Set a timeout for initialization
        const timeout = setTimeout(() => {
          console.error('[Stockfish] Initialization timeout!')
          reject(new Error('Stockfish initialization timeout'))
        }, 20000) // 20 second timeout for WASM loading
        
        this.worker.onmessage = (event) => {
          const message = event.data
          console.log('[Stockfish] Received:', message)
          
          // Handle string messages from Stockfish
          if (typeof message === 'string') {
            if (message.includes('uciok')) {
              console.log('[Stockfish] UCI OK received, configuring engine...')
              clearTimeout(timeout)
              this.isReady = true
              
              // Configure engine
              this.sendCommand('setoption name Threads value 1')
              this.sendCommand('setoption name Hash value 16')
              this.sendCommand('setoption name Ponder value false')
              this.sendCommand('isready')
              
              // Process queued commands
              while (this.messageQueue.length > 0) {
                const cmd = this.messageQueue.shift()!
                this.sendCommand(cmd)
              }
            } else if (message === 'readyok') {
              console.log('[Stockfish] Engine ready!')
              if (this.initResolve) {
                this.initResolve()
                this.initResolve = null
              }
            } else if (message.startsWith('bestmove')) {
              this.handleBestMove(message)
            } else if (message.startsWith('info')) {
              this.handleInfo(message)
            }
          } else if (typeof message === 'object' && message.cmd === 'alert') {
            // Handle alert messages from worker
            console.log('[Stockfish Alert]', message.text)
          }
        }

        this.worker.onerror = (error) => {
          clearTimeout(timeout)
          console.error('[Stockfish] Worker error:', error)
          reject(error)
        }

        // The simple worker will initialize itself
        console.log('[Stockfish] Worker created, waiting for initialization...')
        
      } catch (error) {
        console.error('[Stockfish] Failed to initialize:', error)
        reject(error)
      }
    })
  }

  sendCommand(command: string) {
    if (this.worker) {
      if (this.isReady || command === 'uci') {
        console.log('[Stockfish] Sending command:', command)
        this.worker.postMessage(command)
      } else {
        console.log('[Stockfish] Queuing command:', command)
        this.messageQueue.push(command)
      }
    } else {
      console.error('[Stockfish] No worker available!')
    }
  }

  async analyzePosition(fen: string, depth: number = 12, callback?: (analysis: EngineAnalysis) => void): Promise<EngineAnalysis> {
    return new Promise((resolve) => {
      console.log('[Stockfish] Analyzing position:', fen)
      
      if (!this.isReady) {
        console.warn('[Stockfish] Engine not ready, returning empty analysis')
        resolve({
          evaluation: 0,
          depth: 0,
          bestMove: '',
          pv: [],
          nodes: 0
        })
        return
      }
      
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
      
      // Small delay to ensure stop is processed
      setTimeout(() => {
        // Set position - validate FEN first
        if (!fen || fen.split(' ').length < 6) {
          console.error('[Stockfish] Invalid FEN:', fen)
          this.sendCommand('position startpos')
        } else {
          this.sendCommand(`position fen ${fen}`)
        }
        
        // Start analysis with depth limit for faster response
        this.sendCommand(`go depth ${depth}`) // Depth-limited analysis
      }, 100)

      // Timeout to ensure we get a result
      const timeout = setTimeout(() => {
        console.log('[Stockfish] Analysis timeout, returning current analysis')
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
      }, 4000) // 4 second timeout

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
    console.log('[Stockfish] Stopping analysis')
    this.sendCommand('stop')
    this.analysisCallbacks = []
  }

  private handleBestMove(message: string) {
    console.log('[Stockfish] Best move:', message)
    const parts = message.split(' ')
    const bestMove = parts[1]
    
    if (this.currentAnalysis && bestMove && bestMove !== '(none)') {
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
      console.log('[Stockfish] Depth:', this.currentAnalysis.depth)
    }

    // Parse score
    const scoreMatch = message.match(/score (cp|mate) (-?\d+)/)
    if (scoreMatch) {
      if (scoreMatch[1] === 'cp') {
        // Convert centipawns to pawns
        this.currentAnalysis.evaluation = parseInt(scoreMatch[2]) / 100
        console.log('[Stockfish] Evaluation:', this.currentAnalysis.evaluation)
      } else {
        // Mate score
        const mateIn = parseInt(scoreMatch[2])
        this.currentAnalysis.mate = mateIn
        this.currentAnalysis.evaluation = mateIn > 0 ? 100 : -100
        console.log('[Stockfish] Mate in', mateIn)
      }
    }

    // Parse principal variation
    const pvMatch = message.match(/pv (.+)/)
    if (pvMatch) {
      this.currentAnalysis.pv = pvMatch[1].trim().split(' ')
      if (this.currentAnalysis.pv.length > 0 && !this.currentAnalysis.bestMove) {
        this.currentAnalysis.bestMove = this.currentAnalysis.pv[0]
      }
      console.log('[Stockfish] PV:', this.currentAnalysis.pv.join(' '))
    }

    // Parse nodes
    const nodesMatch = message.match(/nodes (\d+)/)
    if (nodesMatch) {
      this.currentAnalysis.nodes = parseInt(nodesMatch[1])
    }

    // Notify callbacks of progress
    if (this.analysisCallbacks.length > 0 && this.currentAnalysis.depth > 0) {
      // Only notify on significant depth updates
      if (this.currentAnalysis.depth % 3 === 0 || this.currentAnalysis.depth >= 10) {
        this.analysisCallbacks.forEach(callback => {
          if (typeof callback === 'function' && callback !== this.analysisCallbacks[this.analysisCallbacks.length - 1]) {
            callback(this.currentAnalysis!)
          }
        })
      }
    }
  }

  destroy() {
    console.log('[Stockfish] Destroying engine')
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