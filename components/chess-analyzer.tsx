'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  SkipBack, 
  SkipForward, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Play,
  Pause,
  Activity,
  FileText,
  Info,
  Download,
  Copy,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Book
} from 'lucide-react'
import { parsePgn, formatPgnHeaders, formatMovesForDisplay } from '@/lib/pgn-utils'
import { getStockfishEngine, destroyStockfishEngine, type EngineAnalysis } from '@/lib/stockfish-utils'
import { identifyOpening, getOpeningName } from '@/lib/opening-database'

interface ChessAnalyzerProps {
  pgnData: string
  gameIndex: number
}

export function ChessAnalyzer({ pgnData, gameIndex }: ChessAnalyzerProps) {
  const [chess] = useState(() => new Chess())
  const [position, setPosition] = useState(chess.fen())
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [moveHighlights, setMoveHighlights] = useState<{ [square: string]: any }>({})
  const [engineAnalysis, setEngineAnalysis] = useState<EngineAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [showBestMove, setShowBestMove] = useState(true)
  const [detectedOpening, setDetectedOpening] = useState<{ eco: string; name: string } | null>(null)

  const games = useMemo(() => parsePgn(pgnData), [pgnData])
  const currentGame = games[gameIndex] || null

  // Initialize Stockfish engine
  useEffect(() => {
    const initEngine = async () => {
      try {
        const engine = await getStockfishEngine()
        setEngineReady(true)
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error)
      }
    }
    initEngine()

    return () => {
      // Cleanup on unmount
      destroyStockfishEngine()
    }
  }, [])

  // Analyze position when it changes
  useEffect(() => {
    if (!engineReady || !currentGame) return

    const analyzeCurrentPosition = async () => {
      setIsAnalyzing(true)
      try {
        const engine = await getStockfishEngine()
        const analysis = await engine.analyzePosition(
          position, 
          15,
          (progressAnalysis) => {
            setEngineAnalysis(progressAnalysis)
          }
        )
        setEngineAnalysis(analysis)
      } catch (error) {
        console.error('Analysis error:', error)
      } finally {
        setIsAnalyzing(false)
      }
    }

    analyzeCurrentPosition()
  }, [position, engineReady, currentGame])

  // Reset game when gameIndex changes
  useEffect(() => {
    if (currentGame) {
      chess.reset()
      if (currentGame.headers.FEN) {
        try {
          chess.load(currentGame.headers.FEN)
        } catch (error) {
          console.error('Invalid FEN in PGN:', error)
          chess.reset()
        }
      }
      setCurrentMoveIndex(-1)
      setPosition(chess.fen())
      setMoveHighlights({})
    }
  }, [gameIndex, currentGame])

  // Apply moves up to current index
  useEffect(() => {
    if (!currentGame) return

    chess.reset()
    if (currentGame.headers.FEN) {
      try {
        chess.load(currentGame.headers.FEN)
      } catch (error) {
        chess.reset()
      }
    }

    const highlights: { [square: string]: any } = {}
    
    for (let i = 0; i <= currentMoveIndex; i++) {
      const move = currentGame.moves[i]
      if (move) {
        try {
          const moveObj = chess.move(move)
          if (moveObj && i === currentMoveIndex) {
            // Highlight last move
            highlights[moveObj.from] = { background: 'rgba(255, 255, 0, 0.4)' }
            highlights[moveObj.to] = { background: 'rgba(255, 255, 0, 0.4)' }
          }
        } catch (error) {
          console.error(`Invalid move at index ${i}:`, move, error)
          break
        }
      }
    }

    // Add best move highlight if enabled
    if (showBestMove && engineAnalysis?.bestMove && engineAnalysis.bestMove.length >= 4) {
      const from = engineAnalysis.bestMove.substring(0, 2)
      const to = engineAnalysis.bestMove.substring(2, 4)
      highlights[from] = { ...highlights[from], border: '3px solid #22c55e' }
      highlights[to] = { ...highlights[to], border: '3px solid #22c55e' }
    }

    setPosition(chess.fen())
    setMoveHighlights(highlights)
  }, [currentMoveIndex, currentGame, showBestMove, engineAnalysis?.bestMove])

  // Identify opening when moves change
  useEffect(() => {
    if (!currentGame || currentGame.moves.length === 0) {
      setDetectedOpening(null)
      return
    }

    // Get the first few moves to identify the opening
    const openingMoves = currentGame.moves.slice(0, 10) // First 10 moves
    const opening = identifyOpening(openingMoves)
    
    if (opening) {
      setDetectedOpening({
        eco: opening.eco,
        name: opening.variation ? `${opening.name}: ${opening.variation}` : opening.name
      })
    } else if (currentGame.headers.ECO) {
      // Fallback to ECO from headers if available
      setDetectedOpening({
        eco: currentGame.headers.ECO,
        name: getOpeningName(currentGame.headers.ECO)
      })
    } else {
      setDetectedOpening(null)
    }
  }, [currentGame])

  const goToMove = (moveIndex: number) => {
    if (!currentGame) return
    const maxIndex = currentGame.moves.length - 1
    const newIndex = Math.max(-1, Math.min(maxIndex, moveIndex))
    setCurrentMoveIndex(newIndex)
  }

  const goToStart = () => goToMove(-1)
  const goToEnd = () => goToMove(currentGame ? currentGame.moves.length - 1 : -1)
  const goToPrevious = () => goToMove(currentMoveIndex - 1)
  const goToNext = () => goToMove(currentMoveIndex + 1)

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying)
  }

  const flipBoard = () => {
    setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')
  }

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || !currentGame) return

    const interval = setInterval(() => {
      if (currentMoveIndex < currentGame.moves.length - 1) {
        goToNext()
      } else {
        setIsAutoPlaying(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, currentMoveIndex, currentGame])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events if we have a current game
      if (!currentGame) return

      // Prevent default behavior for arrow keys to avoid page scrolling
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
      }

      switch (event.key) {
        case 'ArrowLeft':
          goToPrevious()
          break
        case 'ArrowRight':
          goToNext()
          break
        case 'Home':
          goToStart()
          break
        case 'End':
          goToEnd()
          break
        case ' ': // Spacebar for play/pause
          event.preventDefault()
          toggleAutoPlay()
          break
      }
    }

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentGame, currentMoveIndex, isAutoPlaying]) // Dependencies to ensure we have fresh function references

  const onSquareClick = (square: string) => {
    setSelectedSquare(selectedSquare === square ? null : square)
  }

  const downloadPgn = () => {
    if (!currentGame) return

    const pgnText = formatPgnHeaders(currentGame.headers) + '\n' + 
                   currentGame.moves.join(' ') + ' ' + currentGame.result

    const blob = new Blob([pgnText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentGame.headers.White || 'game'}_vs_${currentGame.headers.Black || 'opponent'}.pgn`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyFen = () => {
    navigator.clipboard.writeText(position)
  }

  const getEvaluationBar = () => {
    if (!engineAnalysis) return 50 // Default to equal position
    
    const eval_ = engineAnalysis.evaluation
    // Convert evaluation to percentage (capped at +/- 10 pawns)
    const cappedEval = Math.max(-10, Math.min(10, eval_))
    const percentage = 50 + (cappedEval * 5) // Each pawn = 5%
    
    return Math.max(0, Math.min(100, percentage))
  }

  const formatEvaluation = () => {
    if (!engineAnalysis) return '0.0'
    
    if (engineAnalysis.mate !== undefined) {
      return `M${Math.abs(engineAnalysis.mate)}`
    }
    
    return engineAnalysis.evaluation > 0 ? 
      `+${engineAnalysis.evaluation.toFixed(1)}` : 
      engineAnalysis.evaluation.toFixed(1)
  }

  if (!currentGame) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg text-gray-600">No game selected</p>
            <p className="text-sm text-gray-500">Upload a PGN file to get started</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formattedMoves = formatMovesForDisplay(currentGame.moves)

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left Panel - Chessboard and Controls */}
      <div className="flex-shrink-0">
        <Card className="p-4">
          <div className="space-y-4">
            {/* Chessboard */}
            <div className="chess-board">
              <Chessboard
                position={position}
                boardOrientation={boardOrientation}
                onSquareClick={onSquareClick}
                customSquareStyles={moveHighlights}
                boardWidth={400}
                animationDuration={200}
              />
            </div>

            {/* Board Controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToStart}
                  disabled={currentMoveIndex === -1}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevious}
                  disabled={currentMoveIndex === -1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAutoPlay}
                  className={isAutoPlaying ? 'bg-green-100' : ''}
                >
                  {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  disabled={!currentGame || currentMoveIndex >= currentGame.moves.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToEnd}
                  disabled={!currentGame || currentMoveIndex >= currentGame.moves.length - 1}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={flipBoard}
              >
                <RotateCcw className="h-4 w-4" />
                Flip
              </Button>
            </div>

            {/* Move Counter */}
            <div className="text-center text-sm text-gray-600">
              Move {Math.max(0, currentMoveIndex + 1)} of {currentGame.moves.length}
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Game Information and Analysis */}
      <div className="flex-1 min-w-0">
        <Tabs defaultValue="moves" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="moves">Moves</TabsTrigger>
            <TabsTrigger value="info">Game Info</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="pgn">PGN</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="moves" className="h-full mt-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Move List</CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[calc(100vh-16rem)]">
                  <div className="space-y-1">
                    {formattedMoves.map((move, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-2 rounded hover:bg-gray-50"
                      >
                        <span className="text-sm text-gray-500 w-8">
                          {move.moveNumber}.
                        </span>
                        <div className="flex gap-4 flex-1">
                          <span
                            className={`move-notation ${
                              currentMoveIndex === index * 2 ? 'active' : ''
                            }`}
                            onClick={() => goToMove(index * 2)}
                          >
                            {move.white}
                          </span>
                          {move.black && (
                            <span
                              className={`move-notation ${
                                currentMoveIndex === index * 2 + 1 ? 'active' : ''
                              }`}
                              onClick={() => goToMove(index * 2 + 1)}
                            >
                              {move.black}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="h-full mt-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Game Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Players</h4>
                        <div className="space-y-1 text-sm">
                          <div>White: {currentGame.headers.White || 'Unknown'}</div>
                          <div>Black: {currentGame.headers.Black || 'Unknown'}</div>
                          <div>Result: {currentGame.headers.Result || '*'}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Event Details</h4>
                        <div className="space-y-1 text-sm">
                          <div>Event: {currentGame.headers.Event || '-'}</div>
                          <div>Site: {currentGame.headers.Site || '-'}</div>
                          <div>Date: {currentGame.headers.Date || '-'}</div>
                          <div>Round: {currentGame.headers.Round || '-'}</div>
                        </div>
                      </div>
                    </div>
                    
                    {(currentGame.headers.WhiteElo || currentGame.headers.BlackElo) && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Ratings</h4>
                        <div className="space-y-1 text-sm">
                          {currentGame.headers.WhiteElo && (
                            <div>White: {currentGame.headers.WhiteElo}</div>
                          )}
                          {currentGame.headers.BlackElo && (
                            <div>Black: {currentGame.headers.BlackElo}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {(detectedOpening || currentGame.headers.ECO) && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Book className="h-4 w-4" />
                          Opening
                        </h4>
                        <div className="space-y-1 text-sm">
                          {detectedOpening ? (
                            <>
                              <div>Name: {detectedOpening.name}</div>
                              <div>ECO: {detectedOpening.eco}</div>
                            </>
                          ) : (
                            <div>ECO: {currentGame.headers.ECO}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {currentGame.headers.TimeControl && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Time Control</h4>
                        <div className="text-sm">{currentGame.headers.TimeControl}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="h-full mt-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Engine Analysis
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBestMove(!showBestMove)}
                      className={showBestMove ? 'bg-green-100' : ''}
                    >
                      Show Best Move
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {engineReady ? (
                    <>
                      {/* Evaluation Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Evaluation</span>
                          <span className={engineAnalysis?.evaluation || 0 > 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatEvaluation()}
                          </span>
                        </div>
                        <div className="relative h-8 bg-gray-200 rounded overflow-hidden">
                          <div 
                            className="absolute left-0 top-0 h-full bg-white transition-all duration-300"
                            style={{ width: `${getEvaluationBar()}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                            {chess.turn() === 'w' ? 'White to move' : 'Black to move'}
                          </div>
                        </div>
                      </div>

                      {/* Engine Details */}
                      {engineAnalysis && (
                        <div className="space-y-3">
                          {/* Best Move */}
                          <div className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Best Move</div>
                              <div className="text-sm text-gray-600">
                                {engineAnalysis.bestMove || 'Calculating...'}
                              </div>
                            </div>
                          </div>

                          {/* Principal Variation */}
                          {engineAnalysis.pv && engineAnalysis.pv.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Activity className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-medium">Principal Variation</div>
                                <div className="text-sm text-gray-600 font-mono">
                                  {engineAnalysis.pv.slice(0, 5).join(' ')}
                                  {engineAnalysis.pv.length > 5 && '...'}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Analysis Depth */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Depth</span>
                            <span className="font-medium">{engineAnalysis.depth}</span>
                          </div>

                          {/* Nodes Analyzed */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Nodes</span>
                            <span className="font-medium">
                              {engineAnalysis.nodes.toLocaleString()}
                            </span>
                          </div>

                          {/* Analysis Status */}
                          {isAnalyzing && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
                              Analyzing position...
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Loading chess engine...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pgn" className="h-full mt-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      PGN Text
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyFen}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy FEN
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadPgn}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                  <div className="pgn-text whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                    {formatPgnHeaders(currentGame.headers)}
                    {'\n'}
                    {currentGame.moves.join(' ')} {currentGame.result}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
} 