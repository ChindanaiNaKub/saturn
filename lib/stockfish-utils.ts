'use client'

import { logEngine } from './engine-logger'

export interface EngineAnalysis {
  evaluation: number
  depth: number
  bestMove: string
  pv: string[] // Principal variation
  nodes: number
  mate?: number // Mate in X moves
}

declare global {
  interface Window {
    Stockfish: any
  }
}

export class StockfishEngine {
  private stockfish: any = null
  private isReady = false
  private currentAnalysis: EngineAnalysis | null = null
  private analysisCallbacks: ((analysis: EngineAnalysis) => void)[] = []
  private messageQueue: string[] = []
  private initResolve: (() => void) | null = null
  private isAnalyzing = false

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        logEngine('Loading Stockfish engine...')
        
        // Load Stockfish script if not already loaded
        if (!window.Stockfish) {
          logEngine('Stockfish not found in window, loading script...')
          const script = document.createElement('script')
          script.src = '/stockfish.js'
          script.onload = () => {
            logEngine('Stockfish script loaded, initializing...')
            this.initStockfish(resolve, reject)
          }
          script.onerror = (error) => {
            logEngine('Failed to load Stockfish script: ' + error)
            reject(new Error('Failed to load Stockfish script'))
          }
          document.head.appendChild(script)
        } else {
          logEngine('Stockfish already available in window')
          this.initStockfish(resolve, reject)
        }
      } catch (error) {
        logEngine('Failed to initialize: ' + error)
        reject(error)
      }
    })
  }

  private initStockfish(resolve: () => void, reject: (error: any) => void) {
    try {
      logEngine('Starting Stockfish initialization...')
      
      // Initialize Stockfish
      window.Stockfish().then((stockfish: any) => {
        logEngine('Stockfish instance created successfully')
        this.stockfish = stockfish
        
        // Set up message listener
        this.stockfish.addMessageListener((message: string) => {
          this.handleMessage(message)
        })
        
        logEngine('Message listener set up, sending UCI commands...')
        
        // Send UCI commands to initialize
        this.sendCommand('uci')
        this.sendCommand('setoption name Threads value 1')
        this.sendCommand('setoption name Hash value 16')
        this.sendCommand('setoption name Ponder value false')
        this.sendCommand('isready')
        
        // Set up ready handler
        this.initResolve = () => {
          this.isReady = true
          logEngine('Stockfish engine ready!')
          resolve()
        }
        
        // Set timeout for initialization
        setTimeout(() => {
          if (!this.isReady) {
            logEngine('Initialization timeout!')
            reject(new Error('Stockfish initialization timeout'))
          }
        }, 10000)
      }).catch((error: any) => {
        logEngine('Failed to create Stockfish instance: ' + error)
        reject(error)
      })
    } catch (error) {
      logEngine('Error in initStockfish: ' + error)
      reject(error)
    }
  }

  private handleMessage(message: string) {
    logEngine('Received: ' + message)
    
    if (message === 'uciok') {
      logEngine('UCI protocol ready')
    } else if (message === 'readyok') {
      if (this.initResolve) {
        this.initResolve()
        this.initResolve = null
      }
    } else if (message.startsWith('bestmove')) {
      this.handleBestMove(message)
    } else if (message.startsWith('info')) {
      this.handleInfo(message)
    }
  }

  sendCommand(command: string) {
    if (this.stockfish) {
      logEngine('Sending command: ' + command)
      this.stockfish.postMessage(command)
    } else {
      logEngine('No Stockfish instance available!')
    }
  }

  async analyzePosition(fen: string, depth: number = 12, callback?: (analysis: EngineAnalysis) => void): Promise<EngineAnalysis> {
    return new Promise((resolve) => {
      logEngine('Analyzing position: ' + fen)
      
      if (!this.isReady) {
        logEngine('Engine not ready, returning empty analysis')
        resolve({ evaluation: 0, depth: 0, bestMove: '', pv: [], nodes: 0 })
        return
      }

      if (this.isAnalyzing) {
        this.sendCommand('stop')
      }

      this.currentAnalysis = { evaluation: 0, depth: 0, bestMove: '', pv: [], nodes: 0 }
      this.isAnalyzing = true
      
      if (callback) {
        this.analysisCallbacks.push(callback)
      }

      // Set up completion callback
      const completionCallback = () => {
        clearTimeout(timeout)
        this.isAnalyzing = false
        if (callback) {
          this.analysisCallbacks = this.analysisCallbacks.filter(cb => cb !== callback)
        }
        resolve(this.currentAnalysis!)
      }
      
      this.analysisCallbacks.push(completionCallback)

      // Send analysis commands
      setTimeout(() => {
        if (!fen || fen.split(' ').length < 6) {
          logEngine('Invalid FEN: ' + fen)
          this.sendCommand('position startpos')
        } else {
          this.sendCommand('position fen ' + fen)
        }
        this.sendCommand('go depth ' + depth)
      }, 100)

      // Set timeout
      const timeout = setTimeout(() => {
        logEngine('Analysis timeout, returning current analysis')
        this.sendCommand('stop')
        this.isAnalyzing = false
        if (callback) {
          this.analysisCallbacks = this.analysisCallbacks.filter(cb => cb !== callback)
        }
        resolve(this.currentAnalysis || { evaluation: 0, depth: 0, bestMove: '', pv: [], nodes: 0 })
      }, 30000)
    })
  }

  stopAnalysis() {
    logEngine('Stopping analysis')
    this.sendCommand('stop')
    this.isAnalyzing = false
    this.analysisCallbacks = []
  }

  private handleBestMove(message: string) {
    logEngine('Best move: ' + message)
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
      logEngine('Depth: ' + this.currentAnalysis.depth)
    }

    // Parse score (centipawns)
    const scoreMatch = message.match(/score cp (-?\d+)/)
    if (scoreMatch) {
      this.currentAnalysis.evaluation = parseInt(scoreMatch[1]) / 100
      logEngine('Evaluation: ' + this.currentAnalysis.evaluation)
    }

    // Parse mate score
    const mateMatch = message.match(/score mate (-?\d+)/)
    if (mateMatch) {
      const mateIn = parseInt(mateMatch[1])
      this.currentAnalysis.mate = mateIn
      this.currentAnalysis.evaluation = mateIn > 0 ? 100 : -100
      logEngine('Mate in ' + mateIn)
    }

    // Parse principal variation
    const pvMatch = message.match(/pv (.+)/)
    if (pvMatch) {
      this.currentAnalysis.pv = pvMatch[1].trim().split(' ')
      if (this.currentAnalysis.pv.length > 0 && !this.currentAnalysis.bestMove) {
        this.currentAnalysis.bestMove = this.currentAnalysis.pv[0]
      }
      logEngine('PV: ' + this.currentAnalysis.pv.join(' '))
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
    logEngine('Destroying engine')
    this.stopAnalysis()
    if (this.stockfish) {
      this.sendCommand('quit')
      this.stockfish = null
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

// Test function to verify engine is working
export const testStockfishEngine = async (): Promise<boolean> => {
  try {
    logEngine('Testing Stockfish engine...')
    const engine = await getStockfishEngine()
    
    if (!engine.isEngineReady()) {
      logEngine('Engine not ready for testing')
      return false
    }
    
    // Test with starting position
    const testFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    logEngine('Testing analysis with starting position...')
    
    const analysis = await engine.analyzePosition(testFen, 5)
    logEngine('Test analysis result: ' + JSON.stringify(analysis))
    
    return analysis.depth > 0 && analysis.bestMove.length > 0
  } catch (error) {
    logEngine('Test failed: ' + error)
    return false
  }
} 