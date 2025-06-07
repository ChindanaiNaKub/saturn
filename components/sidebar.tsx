'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, List, Calendar, Users } from 'lucide-react'
import { parsePgn, getGameTitle } from '@/lib/pgn-utils'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  pgnData: string
  currentGameIndex: number
  onGameSelect: (index: number) => void
}

export function Sidebar({ isOpen, onToggle, pgnData, currentGameIndex, onGameSelect }: SidebarProps) {
  const games = pgnData ? parsePgn(pgnData) : []
  
  if (!isOpen) {
    return (
      <div className="fixed left-0 top-0 h-full z-10 flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="ml-2 rounded-r-lg rounded-l-none"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <List className="h-4 w-4" />
          Games ({games.length})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Game List */}
      <div className="flex-1 overflow-y-auto">
        {games.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <List className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No games loaded</p>
            <p className="text-sm">Upload a PGN file to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {games.map((game, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all ${
                  index === currentGameIndex
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:shadow-md'
                }`}
                onClick={() => onGameSelect(index)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Game {index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-3 w-3" />
                    <span className="truncate">
                      {game.headers.White || 'Unknown'} vs {game.headers.Black || 'Unknown'}
                    </span>
                  </div>
                  
                  {game.headers.Date && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>{game.headers.Date}</span>
                    </div>
                  )}
                  
                  {game.headers.Event && (
                    <div className="text-xs text-gray-500 truncate">
                      {game.headers.Event}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {game.result || '*'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {game.moves.length} moves
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Game Navigation */}
      {games.length > 1 && (
        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Game {currentGameIndex + 1} of {games.length}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGameSelect(Math.max(0, currentGameIndex - 1))}
              disabled={currentGameIndex === 0}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGameSelect(Math.min(games.length - 1, currentGameIndex + 1))}
              disabled={currentGameIndex === games.length - 1}
              className="flex-1"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 