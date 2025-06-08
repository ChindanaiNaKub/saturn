'use client'

import { useState } from 'react'
import { ChessAnalyzer } from '@/components/chess-analyzer'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { PgnUpload } from '@/components/pgn-upload'

export default function Home() {
  const [pgnData, setPgnData] = useState<string>('')
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handlePgnUpload = (pgn: string) => {
    setPgnData(pgn)
    setCurrentGameIndex(0)
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        pgnData={pgnData}
        currentGameIndex={currentGameIndex}
        onGameSelect={setCurrentGameIndex}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 overflow-hidden">
          {!pgnData ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-2xl w-full px-6">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Saturn Chess Reader
                  </h1>
                  <p className="text-xl text-gray-600 mb-8">
                    Upload and analyze your chess games with powerful tools and engine analysis
                  </p>
                </div>
                <PgnUpload onPgnLoad={handlePgnUpload} />
              </div>
            </div>
          ) : (
            <ChessAnalyzer 
              pgnData={pgnData}
              gameIndex={currentGameIndex}
            />
          )}
        </main>
      </div>
    </div>
  )
} 