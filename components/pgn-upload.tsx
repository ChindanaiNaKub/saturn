'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, Link, AlertCircle } from 'lucide-react'
import { validatePgn } from '@/lib/pgn-utils'

interface PgnUploadProps {
  onPgnUpload: (pgn: string) => void
}

export function PgnUpload({ onPgnUpload }: PgnUploadProps) {
  const [pgnText, setPgnText] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      processPgnText(content)
    }
    reader.readAsText(file)
  }

  const handlePasteUpload = () => {
    if (!pgnText.trim()) {
      setErrors(['Please enter PGN text'])
      return
    }
    processPgnText(pgnText)
  }

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) {
      setErrors(['Please enter a URL'])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(urlInput)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const content = await response.text()
      processPgnText(content)
    } catch (error) {
      setErrors([`Failed to load from URL: ${error instanceof Error ? error.message : 'Unknown error'}`])
    } finally {
      setLoading(false)
    }
  }

  const processPgnText = (text: string) => {
    const validation = validatePgn(text)
    if (validation.isValid) {
      setErrors([])
      onPgnUpload(text)
    } else {
      setErrors(validation.errors)
    }
  }

  const loadSamplePgn = () => {
    const samplePgn = `[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5 Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6 23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5 hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5 35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6 Nf2 42. g4 Bd3 43. Re6 1/2-1/2`
    processPgnText(samplePgn)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload File
            </CardTitle>
            <CardDescription>
              Upload a PGN file from your computer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pgn,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              variant="outline"
            >
              Choose File
            </Button>
          </CardContent>
        </Card>

        {/* Paste Text */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paste PGN
            </CardTitle>
            <CardDescription>
              Paste PGN text directly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={pgnText}
              onChange={(e) => setPgnText(e.target.value)}
              placeholder="Paste your PGN text here..."
              className="w-full h-24 p-3 border rounded-md resize-none text-sm font-mono"
            />
            <Button 
              onClick={handlePasteUpload}
              className="w-full"
              variant="outline"
            >
              Load PGN
            </Button>
          </CardContent>
        </Card>

        {/* URL Load */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Load from URL
            </CardTitle>
            <CardDescription>
              Load PGN from a web URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/game.pgn"
              className="w-full p-3 border rounded-md text-sm"
            />
            <Button 
              onClick={handleUrlUpload}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? 'Loading...' : 'Load from URL'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sample PGN */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          Don't have a PGN file? Try a sample game:
        </p>
        <Button onClick={loadSamplePgn} variant="secondary">
          Load Fischer vs Spassky (1992)
        </Button>
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 mb-2">
                  Error loading PGN
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 