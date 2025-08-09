'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { ErrorBoundary, withErrorBoundary } from './error-boundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  BookOpen,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Gem,
  Star,
  ThumbsUp,
  HelpCircle,
  AlertCircle,
  Bomb
} from 'lucide-react'
import { parsePgn, formatPgnHeaders, formatMovesForDisplay, type MoveAnalysis, type MoveClassification, isOpening, type GameReviewData, calculateMoveAccuracy, centipawnsToWinPercent } from '@/lib/pgn-utils'
import { getStockfishEngine, destroyStockfishEngine, testStockfishEngine, type EngineAnalysis } from '@/lib/stockfish-utils'
import { identifyOpening, getOpeningName } from '@/lib/opening-database'
import { exportEngineLogs } from '@/lib/engine-logger'
import OpeningExplorer from './opening-explorer'
import GameReview from './game-review'

const MOVE_ICON_META: Record<MoveClassification, { icon: React.ReactNode; className: string; label: string }> = {
  brilliant: { icon: <Gem />, className: 'text-cyan-400', label: 'Brilliant' },
  great: { icon: <Star />, className: 'text-sky-500', label: 'Great Move' },
  best: { icon: <CheckCircle2 />, className: 'text-green-500', label: 'Best Move' },
  excellent: { icon: <ThumbsUp />, className: 'text-lime-500', label: 'Excellent' },
  good: { icon: <CheckCircle2 />, className: 'text-gray-400', label: 'Good' },
  book: { icon: <BookOpen />, className: 'text-violet-500', label: 'Book Move' },
  inaccuracy: { icon: <HelpCircle />, className: 'text-yellow-500', label: 'Inaccuracy' },
  mistake: { icon: <AlertCircle />, className: 'text-orange-500', label: 'Mistake' },
  blunder: { icon: <Bomb />, className: 'text-red-600', label: 'Blunder' },
};

const ClassificationIcon = ({ analysis }: { analysis: MoveAnalysis }) => {
  const data = MOVE_ICON_META[analysis.classification];

  if (!data || !data.icon) {
    return null;
  }

  return (
    <span
      title={`${data.label} (cp loss: ${analysis.centipawnLoss}${analysis.comment ? `) — ${analysis.comment}` : ')'}`}
      className={`inline-flex items-center ml-1 ${data.className}`}
    >
      {React.cloneElement(data.icon as React.ReactElement, { className: 'h-4 w-4' })}
    </span>
  );
};

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
  const [customArrows, setCustomArrows] = useState<Array<[string, string]>>([])
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: string; to: string } | null>(null)
  const [engineAnalysis, setEngineAnalysis] = useState<EngineAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [engineError, setEngineError] = useState<string | null>(null)
  const [showBestMove, setShowBestMove] = useState(true)
  const [detectedOpening, setDetectedOpening] = useState<{ eco: string; name: string } | null>(null)
  const [gameAnalysis, setGameAnalysis] = useState<(MoveAnalysis | null)[] | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewProgress, setReviewProgress] = useState(0)
  const [analysisDepth, setAnalysisDepth] = useState(18)
  const [engineInfo, setEngineInfo] = useState<{ name: string | null; author: string | null; threads: number; hashMb: number } | null>(null)
  const [gameReviewData, setGameReviewData] = useState<GameReviewData | null>(null)
  const [activeTab, setActiveTab] = useState('analysis')

  const games = useMemo(() => parsePgn(pgnData), [pgnData])
  const currentGame = games[gameIndex] || null

  // Initialize Stockfish engine
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    
    const initEngine = async () => {
      try {
        console.log('Initializing Stockfish engine...')
        setEngineError(null)
        const engine = await getStockfishEngine()
        console.log('Stockfish engine ready!')
        setEngineReady(true)
        setEngineError(null)
        try {
          // @ts-ignore access helper on engine
          const info = (engine as any).getEngineInfo ? (engine as any).getEngineInfo() : null
          if (info) setEngineInfo(info)
        } catch {}
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error)
        setEngineReady(false)
        
        if (retryCount < maxRetries) {
          retryCount++
          console.log(`Retrying engine initialization (${retryCount}/${maxRetries})...`)
          setTimeout(initEngine, 2000) // Retry after 2 seconds
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setEngineError(`Failed to load chess engine: ${errorMessage}. Please refresh the page.`)
        }
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
    if (!engineReady || !currentGame) {
      console.log('[ChessAnalyzer] Skipping analysis - engineReady:', engineReady, 'currentGame:', !!currentGame)
      return
    }

    const analyzeCurrentPosition = async () => {
      console.log('[ChessAnalyzer] Starting position analysis')
      setIsAnalyzing(true)
      try {
        const engine = await getStockfishEngine()
        console.log('[ChessAnalyzer] Got engine instance, analyzing position:', position)
        const analysis = await engine.analyzePosition(
          position, 
          analysisDepth,
          (progressAnalysis) => {
            console.log('[ChessAnalyzer] Progress update:', progressAnalysis)
            setEngineAnalysis(progressAnalysis)
          }
        )
        console.log('[ChessAnalyzer] Final analysis:', analysis)
        setEngineAnalysis(analysis)
      } catch (error) {
        console.error('[ChessAnalyzer] Analysis error:', error)
      } finally {
        setIsAnalyzing(false)
      }
    }

    analyzeCurrentPosition()
  }, [position, engineReady, currentGame, analysisDepth])

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
      setCustomArrows([])
      setGameAnalysis(null)
    }
  }, [gameIndex, currentGame, chess])

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
    const arrows: Array<[string, string]> = []
    let last: { from: string; to: string } | null = null
    
    for (let i = 0; i <= currentMoveIndex; i++) {
      const move = currentGame.moves[i]
      if (move) {
        try {
          const moveObj = chess.move(move)
          if (moveObj && i === currentMoveIndex) {
            // Highlight last move
            highlights[moveObj.from] = { background: 'rgba(255, 255, 0, 0.4)' }
            highlights[moveObj.to] = { background: 'rgba(255, 255, 0, 0.4)' }
            last = { from: moveObj.from, to: moveObj.to }
          }
        } catch (error) {
          console.error(`Invalid move at index ${i}:`, move, error)
          break
        }
      }
    }

    // Add best move arrow if enabled
    if (showBestMove && engineAnalysis?.bestMove && engineAnalysis.bestMove.length >= 4) {
      const from = engineAnalysis.bestMove.substring(0, 2)
      const to = engineAnalysis.bestMove.substring(2, 4)
      arrows.push([from, to])
    }

    setPosition(chess.fen())
    setMoveHighlights(highlights)
    setCustomArrows(arrows)
    setLastMoveSquares(last)
  }, [currentMoveIndex, currentGame, showBestMove, engineAnalysis?.bestMove, chess])

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
  }, [isAutoPlaying, currentMoveIndex, currentGame, goToNext])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentGame) return
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
      }
      switch (event.key) {
        case 'ArrowLeft': goToPrevious(); break
        case 'ArrowRight': goToNext(); break
        case 'Home': goToStart(); break
        case 'End': goToEnd(); break
        case ' ': event.preventDefault(); toggleAutoPlay(); break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentGame, goToPrevious, goToNext, goToStart, goToEnd, toggleAutoPlay])

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

  // Classify a move by centipawn loss from the mover's perspective.
  // evalBefore and evalAfter are normalized to White's perspective (positive = good for White).
  const classifyEvaluation = (evalBefore: number, evalAfter: number, player: 'w' | 'b'): MoveAnalysis => {
    const deltaWhitePerspective = evalAfter - evalBefore;
    // If White moved, a decrease in white eval is bad for White.
    // If Black moved, an increase in white eval is bad for Black.
    const cpLoss = player === 'w'
      ? Math.max(0, Math.round((evalBefore - evalAfter) * 100))
      : Math.max(0, Math.round((evalAfter - evalBefore) * 100));
    const centipawnLoss = cpLoss;

    let classification: MoveClassification;
    if (centipawnLoss <= 2) {
      classification = 'best';
    } else if (centipawnLoss <= 15) {
      classification = 'excellent';
    } else if (centipawnLoss <= 40) {
      classification = 'good';
    } else if (centipawnLoss <= 90) {
      classification = 'inaccuracy';
    } else if (centipawnLoss <= 200) {
      classification = 'mistake';
    } else {
      classification = 'blunder';
    }

    return { classification, centipawnLoss };
  };

  // Convert an engine UCI move (e.g., e2e4, g7g8q) to SAN for a given FEN without mutating the main board
  const uciToSan = (fenBefore: string, uci: string | undefined): string | null => {
    if (!uci || uci.length < 4) return null;
    try {
      const tmp = new Chess(fenBefore);
      const from = uci.slice(0, 2) as any;
      const to = uci.slice(2, 4) as any;
      const promotion = uci.length >= 5 ? (uci[4] as any) : undefined;
      const moveObj = tmp.move({ from, to, promotion });
      return moveObj ? moveObj.san : null;
    } catch {
      return null;
    }
  };

  // Simple heuristics to explain why the move might be worse than engine preference
  const generateExplanation = (
    fenBefore: string,
    playedSan: string,
    engineBestUci: string | undefined,
    centipawnLoss: number,
    plyIndex: number
  ): string | undefined => {
    try {
      const before = new Chess(fenBefore);
      const played = before.move(playedSan, { sloppy: true } as any);
      if (!played) return undefined;

      const after = before; // already applied

      // 1) Large error and immediate tactical issue: did we leave a piece hanging?
      if (centipawnLoss >= 200) {
        // If opponent has a capture next move on any of our pieces, mention the heaviest one
        const oppMoves = after.moves({ verbose: true }) as any[];
        const captureMoves = oppMoves.filter(m => m.flags && m.flags.includes('c'));
        if (captureMoves.length > 0) {
          // Prefer captures of higher value pieces
          const val: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 20000 };
          captureMoves.sort((a, b) => (val[b.captured || 'p'] - val[a.captured || 'p']));
          const top = captureMoves[0];
          const pieceMap: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
          const hanging = top.captured ? pieceMap[top.captured] : 'piece';
          return `Left your ${hanging} on ${top.to} hanging; opponent can capture immediately.`;
        }
      }

      // 2) Compare with engine best move pattern
      const bestSan = uciToSan(fenBefore, engineBestUci);
      if (bestSan) {
        // If engine best gives check
        const tmp = new Chess(fenBefore);
        const best = tmp.move(bestSan, { sloppy: true } as any);
        if (best && /\+|#/.test(best.san)) {
          return `Missed a forcing move: ${best.san} (check${best.san.includes('#') ? 'mate' : ''}).`;
        }
        // If engine best is a capture
        if (best && best.flags && best.flags.includes('c')) {
          return `Missed a free/strong capture: ${best.san}.`;
        }
      }

      // 3) Opening principles in early phase
      if (plyIndex < 16) {
        // Discourage early flank pawn pushes and queen moves
        if (/^(a|h)\d/.test(playedSan) || /Q/.test(playedSan)) {
          return 'Early move violates opening principles; prioritize development and king safety.';
        }
        // Moving same piece twice while others undeveloped
        // Heuristic: if many pieces still on back rank and move is a non-developing pawn move
        const backRank = after.turn() === 'w' ? '1' : '8';
        const undeveloped = ['b', 'g', 'c', 'f']
          .map(f => `${f}${backRank}`)
          .filter(sq => after.get(sq as any) && ['n', 'b'].includes((after.get(sq as any) as any).type)).length;
        if (undeveloped >= 2 && /^[a-h]([3-4]|[6-7])$/.test(playedSan)) {
          return 'Neglected development; activate knights and bishops and aim to castle.';
        }
      }

      // 4) Default generic message when none of the above triggers
      if (centipawnLoss >= 90) return 'Allowed opponent strong counterplay; consider more forcing or defensive options.';
      if (centipawnLoss >= 40) return 'Small inaccuracy; prefer moves that improve piece activity or control the center.';
      return undefined;
    } catch {
      return undefined;
    }
  };

  const handleReviewGame = async () => {
    if (!currentGame || !engineReady) return;

    setIsReviewing(true);
    setGameAnalysis(null);
    setGameReviewData(null);
    setReviewProgress(0);

    const engine = await getStockfishEngine();
    const tempChess = new Chess();
    if (currentGame.headers.FEN) {
      tempChess.load(currentGame.headers.FEN);
    }
    
    const analysisResults: (MoveAnalysis | null)[] = [];
    const evaluationHistory: { move: number; eval: number }[] = [];
    const perMove: NonNullable<GameReviewData['perMove']> = [];
    const whiteMoveAccuracies: number[] = [];
    const blackMoveAccuracies: number[] = [];
    
    const moveCounts: GameReviewData['white']['moveCounts'] = { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const whiteMoveCounts = { ...moveCounts };
    const blackMoveCounts = { ...moveCounts };

    // We'll maintain evaluations from White's perspective in centipawns/100.
    // Start with analysis of starting FEN to seed previous eval.
    let lastEval = 0;
    // Use user-selected depth for review to respect quality setting
    const baseDepth = analysisDepth;
    // Use a shallower depth for opening/book moves to speed up without much loss
    const openingDepth = Math.min(baseDepth, 10);

    // Analyze starting position to seed lastEval and history
    {
      const fenStart = tempChess.fen();
      const startAnalysis = await engine.analyzePosition(fenStart, openingDepth);
      // Convert engine eval (from side-to-move) to White perspective
      const sideToMove = tempChess.turn();
      const evalFromWhite = sideToMove === 'w' ? startAnalysis.evaluation : -startAnalysis.evaluation;
      lastEval = evalFromWhite;
      evaluationHistory.push({ move: 0, eval: evalFromWhite });
    }

    // Analyze moves
    for (let i = 0; i < currentGame.moves.length; i++) {
      setReviewProgress(((i + 1) / currentGame.moves.length) * 100);
      const move = currentGame.moves[i];
      const player = tempChess.turn();
      
      const isBook = i < 20 && isOpening(currentGame.moves.slice(0, i + 1));
      
      if (isBook) {
        const opening = identifyOpening(currentGame.moves.slice(0, i + 1));
        analysisResults.push({ classification: 'book', centipawnLoss: 0, comment: opening ? opening.name : 'Book Move' });
        if (player === 'w') whiteMoveCounts.book++;
        else blackMoveCounts.book++;
      }
      
      // Analyze position BEFORE the move to know engine preference
      const fenBeforeMove = tempChess.fen();
      const beforeAnalysis = await engine.analyzePosition(fenBeforeMove, isBook ? openingDepth : baseDepth);

      tempChess.move(move);
      const fenAfterMove = tempChess.fen();
      const perMoveDepth = isBook ? openingDepth : baseDepth;
      const analysisAfter = await engine.analyzePosition(fenAfterMove, perMoveDepth);
      // Engine returns eval from side-to-move (now opponent). Convert to White perspective
      const sideToMoveAfter = tempChess.turn();
      const currentEval = sideToMoveAfter === 'w' ? analysisAfter.evaluation : -analysisAfter.evaluation;
      evaluationHistory.push({ move: i + 1, eval: currentEval });

      if (!isBook) {
        const moveClassification = classifyEvaluation(lastEval, currentEval, player);
        const explanation = generateExplanation(
          fenBeforeMove,
          move,
          beforeAnalysis.bestMove,
          moveClassification.centipawnLoss,
          i
        );
        analysisResults.push({ ...moveClassification, comment: explanation });
        
        // Convert both evals (cp/100) to win percentages for the mover
        const winBefore = centipawnsToWinPercent(player === 'w' ? lastEval * 100 : -lastEval * 100);
        const winAfter = centipawnsToWinPercent(player === 'w' ? currentEval * 100 : -currentEval * 100);
        const accuracy = calculateMoveAccuracy(winBefore, winAfter);
        if (player === 'w') {
          whiteMoveAccuracies.push(accuracy);
          whiteMoveCounts[moveClassification.classification]++;
        } else {
          blackMoveAccuracies.push(accuracy);
          blackMoveCounts[moveClassification.classification]++;
        }

        perMove.push({
          move: i + 1,
          player,
          classification: moveClassification.classification,
          centipawnLoss: moveClassification.centipawnLoss,
          eval: currentEval,
        })
      }
      
      lastEval = currentEval;
    }

    const calculateAverage = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 100;

    setGameAnalysis(analysisResults);
    setGameReviewData({
      white: {
        accuracy: calculateAverage(whiteMoveAccuracies),
        moveCounts: whiteMoveCounts,
      },
      black: {
        accuracy: calculateAverage(blackMoveAccuracies),
        moveCounts: blackMoveCounts,
      },
      evaluationHistory,
      perMove,
      meta: {
        whiteElo: currentGame.headers.WhiteElo,
        blackElo: currentGame.headers.BlackElo,
        whiteName: currentGame.headers.White,
        blackName: currentGame.headers.Black,
      }
    });
    setIsReviewing(false);
    setActiveTab('review');
  };

  const testEngine = async () => {
    try {
      console.log('Testing engine...')
      const success = await testStockfishEngine()
      if (success) {
        alert('Engine test successful! Check console for details.')
      } else {
        alert('Engine test failed! Check console for details.')
      }
    } catch (error) {
      console.error('Engine test error:', error)
      alert('Engine test error: ' + String(error))
    }
  }

  const getEvaluationBar = () => {
    if (!engineAnalysis) return 50
    const eval_ = engineAnalysis.evaluation
    const cappedEval = Math.max(-10, Math.min(10, eval_))
    const percentage = 50 + (cappedEval * 5)
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

  const getEvaluationColor = () => {
    if (!engineAnalysis) return 'text-gray-800 dark:text-gray-200'
    if (engineAnalysis.mate) return engineAnalysis.mate > 0 ? 'text-green-600' : 'text-red-600'
    if (engineAnalysis.evaluation > 0.5) return 'text-green-600'
    if (engineAnalysis.evaluation < -0.5) return 'text-red-600'
    return 'text-gray-800 dark:text-gray-200'
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
            <div className="flex gap-2">
              {engineReady && (
                <div className="relative w-4 h-[400px] bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 w-full bg-white dark:bg-gray-200 transition-all duration-300 ease-in-out"
                    style={{ height: `${getEvaluationBar()}%` }}
                  />
                </div>
              )}
              <div className="chess-board relative">
                <ErrorBoundary fallback={
                  <div className="flex items-center justify-center h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="text-center">
                      <div className="text-red-500 mb-2">Chessboard Error</div>
                      <div className="text-sm text-gray-600">Unable to load chessboard</div>
                    </div>
                  </div>
                }>
                  <Chessboard
                    position={position}
                    boardOrientation={boardOrientation}
                    onSquareClick={onSquareClick}
                    customSquareStyles={moveHighlights}
                    customArrows={customArrows as any}
                    boardWidth={400}
                    animationDuration={200}
                    arePiecesDraggable={false}
                  />
                  {(() => {
                    if (!lastMoveSquares) return null
                    // Compute pixel position of the last move's destination square, adjusted for orientation
                    const boardWidthPx = 400
                    const squareSize = boardWidthPx / 8
                    const file = lastMoveSquares.to[0]
                    const rank = Number(lastMoveSquares.to[1])
                    const files = 'abcdefgh'
                    const fileIndex = files.indexOf(file)
                    const rankIndex = rank - 1
                    const x = boardOrientation === 'white' ? fileIndex * squareSize : (7 - fileIndex) * squareSize
                    const y = boardOrientation === 'white' ? (7 - rankIndex) * squareSize : rankIndex * squareSize

                    // Place the badge slightly to the right within the square
                    const left = x + squareSize - 10
                    const top = y + squareSize / 2

                    const currentAnalysis = gameAnalysis?.[currentMoveIndex] || null
                    const meta = currentAnalysis ? MOVE_ICON_META[currentAnalysis.classification] : null
                    const iconEl = meta?.icon ?? <FileText />

                    return (
                      <div
                        className={`absolute z-20 -translate-y-1/2 rounded-full border bg-white/90 dark:bg-gray-900/90 shadow p-0.5 ${meta?.className ?? ''}`}
                        style={{ left, top }}
                        title={meta?.label ?? 'Move'}
                      >
                        {React.cloneElement(iconEl as React.ReactElement, { className: 'h-4 w-4' })}
                      </div>
                    )
                  })()}
                  {(() => {
                    if (!gameAnalysis || currentMoveIndex < 0) return null
                    const analysis = gameAnalysis[currentMoveIndex]
                    if (!analysis) return null
                    const meta = MOVE_ICON_META[analysis.classification]
                    return (
                      <div className="absolute top-2 right-2 rounded-md border bg-white/80 dark:bg-gray-900/70 px-2 py-1 shadow-sm flex items-center gap-1">
                        {meta.icon && (
                          <span className={meta.className}>
                            {React.cloneElement(meta.icon as React.ReactElement, { className: 'h-4 w-4' })}
                          </span>
                        )}
                        <span className="text-xs font-medium capitalize text-gray-800 dark:text-gray-200">{meta.label}</span>
                      </div>
                    )
                  })()}
                </ErrorBoundary>
              </div>
            </div>

            {/* Board Controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goToStart} disabled={currentMoveIndex === -1}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToPrevious} disabled={currentMoveIndex === -1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={toggleAutoPlay} className={isAutoPlaying ? 'bg-green-100' : ''}>
                  {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={goToNext} disabled={!currentGame || currentMoveIndex >= currentGame.moves.length - 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToEnd} disabled={!currentGame || currentMoveIndex >= currentGame.moves.length - 1}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              
              <Button variant="outline" size="sm" onClick={flipBoard}>
                <RotateCcw className="h-4 w-4" />
                Flip
              </Button>
            </div>

            {/* Move Counter + Quality */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Move {Math.max(0, currentMoveIndex + 1)} of {currentGame.moves.length}
              </div>
              {(() => {
                if (!gameAnalysis || currentMoveIndex < 0) return null
                const analysis = gameAnalysis[currentMoveIndex]
                if (!analysis) return null
                const meta = MOVE_ICON_META[analysis.classification]
                return (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-white/70 dark:bg-gray-900/40">
                    {meta.icon && (
                      <span className={meta.className}>
                        {React.cloneElement(meta.icon as React.ReactElement, { className: 'h-4 w-4' })}
                      </span>
                    )}
                    <span className="font-medium capitalize text-gray-800 dark:text-gray-200">{meta.label}</span>
                    {typeof analysis.centipawnLoss === 'number' && analysis.centipawnLoss > 0 && (
                      <span className="text-xs text-gray-500 ml-1">{analysis.centipawnLoss} cp</span>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </Card>
      </div>

      {/* Right Panel - Game Information and Analysis */}
      <div className="flex-1 min-w-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analysis">
              <Activity className="w-4 h-4 mr-1" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="review">
              <Star className="w-4 h-4 mr-1" />
              Game Review
            </TabsTrigger>
            <TabsTrigger value="info">
              <Info className="w-4 h-4 mr-1" />
              Game Info
            </TabsTrigger>
            <TabsTrigger value="openings">
              <BookOpen className="w-4 h-4 mr-1" />
              Openings
            </TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Engine Analysis
                </div>
                <div className="flex items-center gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => setShowBestMove(!showBestMove)}
                     className={showBestMove ? 'bg-green-100' : ''}
                   >
                     {showBestMove ? 'Hide Arrows' : 'Show Arrows'}
                   </Button>
                   <Select value={String(analysisDepth)} onValueChange={(value) => setAnalysisDepth(Number(value))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Set Engine Depth" />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="8">Depth 8 (Fastest)</SelectItem>
                       <SelectItem value="12">Depth 12</SelectItem>
                       <SelectItem value="15">Depth 15</SelectItem>
                       <SelectItem value="18">Depth 18 (Default)</SelectItem>
                       <SelectItem value="20">Depth 20 (Deep)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleReviewGame}
                    disabled={isReviewing || !engineReady}
                  >
                    {isReviewing ? `Reviewing... (${Math.round(reviewProgress)}%)` : 'Review Game'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isReviewing && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${reviewProgress}%` }}
                    />
                  </div>
                )}
                {engineReady ? (
                  <>
                        {/* Engine Details */}
                    {engineAnalysis ? (
                      <div className="space-y-3">
                         {engineInfo && (
                           <div className="text-xs text-gray-500">
                             <div>Engine: {engineInfo.name || 'Stockfish (wasm)'}</div>
                             <div>Threads: {engineInfo.threads} · Hash: {engineInfo.hashMb} MB</div>
                           </div>
                         )}
                         <div className="flex justify-between text-sm font-medium">
                          <span>Evaluation</span>
                          <span className={`font-semibold ${getEvaluationColor()}`}>
                            {formatEvaluation()}
                          </span>
                        </div>
                        {/* Best Move */}
                        <div className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">Best Move</div>
                            <div className="text-sm text-gray-600">
                              {engineAnalysis.bestMove || 'Calculating...'}
                            </div>
                            {showBestMove && engineAnalysis.bestMove && (
                              <div className="text-xs text-green-600 mt-1">
                                → Shown as green arrow on board
                              </div>
                            )}
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

                        {/* Human-friendly explanation for current move */}
                        {gameAnalysis && currentMoveIndex >= 0 && gameAnalysis[currentMoveIndex] && (gameAnalysis[currentMoveIndex] as any).comment && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Why this wasn't best</div>
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {(gameAnalysis[currentMoveIndex] as any).comment}
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
                    ) : (
                       <div className="text-center text-gray-500 py-8">
                         <p>No analysis data available.</p>
                         <p className="text-xs mt-2">Make a move to start analysis.</p>
                       </div>
                    )}
                  </>
                ) : engineError ? (
                  <div className="text-center text-red-500 py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{engineError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="mt-4"
                    >
                      Refresh Page
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                    <p>Loading chess engine...</p>
                    <p className="text-xs mt-2">This may take a few seconds</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex justify-end mt-2">
              <Button variant="outline" size="sm" onClick={exportEngineLogs}>
                Download Engine Logs
              </Button>
              <Button variant="outline" size="sm" onClick={testEngine} className="ml-2">
                Test Engine
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Game Information</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[70vh] overflow-y-auto pr-2">
                {(() => {
                  const headers = currentGame?.headers || {} as Record<string, string>

                  const get = (key: string) => headers[key] || ''

                  const sections: Array<{ title: string; rows: Array<[string, string]> }> = [
                    {
                      title: 'Overview',
                      rows: [
                        ['Event', get('Event')],
                        ['Site', get('Site')],
                        ['Date', get('Date')],
                        ['Round', get('Round')],
                        ['Result', currentGame?.result || get('Result')],
                        ['Time Control', get('TimeControl')],
                        ['Termination', get('Termination')],
                      ],
                    },
                    {
                      title: 'Players',
                      rows: [
                        ['White', `${get('White')}${get('WhiteElo') ? ` (${get('WhiteElo')})` : ''}`],
                        ['Black', `${get('Black')}${get('BlackElo') ? ` (${get('BlackElo')})` : ''}`],
                      ],
                    },
                    {
                      title: 'Opening',
                      rows: [
                        ['ECO', get('ECO')],
                        ['Opening', detectedOpening?.name || get('Opening')],
                        ['ECO Url', get('ECOUrl')],
                      ],
                    },
                    {
                      title: 'Times',
                      rows: [
                        ['Timezone', get('Timezone')],
                        ['UTC Date', get('UTCDate')],
                        ['UTC Time', get('UTCTime')],
                        ['Start Time', get('StartTime')],
                        ['End Date', get('EndDate')],
                        ['End Time', get('EndTime')],
                      ],
                    },
                    {
                      title: 'Position',
                      rows: [
                        ['FEN', get('FEN') || get('CurrentPosition')],
                      ],
                    },
                    {
                      title: 'Links',
                      rows: [
                        ['Game Link', get('Link')],
                      ],
                    },
                  ]

                  const isUrl = (value: string) => /^https?:\/\//i.test(value)

                  return (
                    <div className="space-y-6">
                      {sections.map(section => {
                        const visibleRows = section.rows.filter(([, v]) => Boolean(v))
                        if (visibleRows.length === 0) return null
                        return (
                          <div key={section.title}>
                            <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                              {visibleRows.map(([label, value]) => (
                                <React.Fragment key={label}>
                                  <span className="font-semibold text-right whitespace-nowrap">{label}:</span>
                                  {label === 'FEN' ? (
                                    <div className="flex items-center gap-2">
                                      <span className="break-all">{value}</span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 py-0"
                                        onClick={() => navigator.clipboard.writeText(value)}
                                        title="Copy FEN"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : isUrl(value) || /url/i.test(label) || /link/i.test(label) ? (
                                    <a
                                      href={value}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:underline break-all"
                                    >
                                      {value}
                                    </a>
                                  ) : (
                                    <span className="break-all">{value}</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                <div className="mt-4 border-t pt-4">
                  <h3 className="text-lg font-semibold mb-2">Moves</h3>
                  <div className="max-h-80 overflow-y-auto pr-2 text-sm">
                    <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-4 gap-y-1">
                      {formattedMoves.map(({ moveNumber, white, black }, index) => {
                        const whiteMoveIndex = index * 2;
                        const blackMoveIndex = index * 2 + 1;
                        const whiteAnalysis = gameAnalysis?.[whiteMoveIndex] || null;
                        const blackAnalysis = gameAnalysis?.[blackMoveIndex] || null;
                        return (
                          <React.Fragment key={moveNumber}>
                            <div className="text-right font-semibold text-gray-500">{moveNumber}.</div>
                            <span
                              onClick={() => goToMove(whiteMoveIndex)}
                              className={`cursor-pointer p-1 rounded ${currentMoveIndex === whiteMoveIndex ? 'bg-blue-100 dark:bg-blue-800' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                              {white}
                              {whiteAnalysis && <ClassificationIcon analysis={whiteAnalysis} />}
                            </span>
                            {black && (
                              <span
                                onClick={() => goToMove(blackMoveIndex)}
                                className={`cursor-pointer p-1 rounded ${currentMoveIndex === blackMoveIndex ? 'bg-blue-100 dark:bg-blue-800' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                              >
                                {black}
                                {blackAnalysis && <ClassificationIcon analysis={blackAnalysis} />}
                              </span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="openings" className="mt-4">
            <OpeningExplorer fen={position} />
          </TabsContent>
          <TabsContent value="review" className="mt-4">
            {gameReviewData ? (
              <GameReview reviewData={gameReviewData} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-lg text-gray-600">No review available.</p>
                  <p className="text-sm text-gray-500">Click the "Review Game" button to generate a review.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 