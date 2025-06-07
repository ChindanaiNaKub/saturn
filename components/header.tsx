'use client'

import { Button } from '@/components/ui/button'
import { Download, Upload, Settings, Info } from 'lucide-react'

export function Header() {
  const handleDownload = () => {
    // TODO: Implement PGN download functionality
    console.log('Download PGN')
  }

  const handleNewUpload = () => {
    // TODO: Implement new upload functionality
    window.location.reload()
  }

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">
            Saturn Chess Reader
          </h1>
          <span className="text-sm text-gray-500">
            PGN Analysis & Editor
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewUpload}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            New Upload
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download PGN
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <Info className="h-4 w-4" />
            About
          </Button>
        </div>
      </div>
    </header>
  )
} 