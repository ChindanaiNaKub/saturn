'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Link, FileText, Loader2, User } from 'lucide-react'
import { validatePgn } from '@/lib/pgn-utils'
import { ChessPlatformImporter } from '@/lib/chess-platform-utils'

interface PgnUploadProps {
  onPgnLoad: (pgn: string) => void
}

export function PgnUpload({ onPgnLoad }: PgnUploadProps) {
  const [pgnText, setPgnText] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [platform, setPlatform] = useState<'chess.com' | 'lichess'>('chess.com')
  const [username, setUsername] = useState('')
  const [importYear, setImportYear] = useState(new Date().getFullYear())
  const [importMonth, setImportMonth] = useState(new Date().getMonth() + 1)
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

  const handleTextSubmit = () => {
    if (!pgnText.trim()) {
      setError('Please enter PGN text')
      return
    }
    processPgnText(pgnText)
  }

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const content = await response.text()
      processPgnText(content)
    } catch (error) {
      setError(`Failed to load from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const processPgnText = (text: string) => {
    const validation = validatePgn(text)
    if (validation.isValid) {
      setError('')
      onPgnLoad(text)
    } else {
      setError(validation.error || 'Invalid PGN format')
    }
  }

  const loadSampleGame = () => {
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

  const handlePlatformImport = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      let games
      if (platform === 'chess.com') {
        games = await ChessPlatformImporter.fetchChessComGames(username, importYear, importMonth)
      } else {
        games = await ChessPlatformImporter.fetchLichessGames(username, 20)
      }

      if (games.length === 0) {
        setError('No games found for this user')
        return
      }

      // Combine all PGNs
      const combinedPgn = games.map(game => game.pgn).join('\n\n')
      
      const validation = validatePgn(combinedPgn)
      if (validation.isValid) {
        onPgnLoad(combinedPgn)
      } else {
        setError(validation.error || 'Invalid PGN format')
      }
    } catch (error) {
      setError(`Failed to import games: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload PGN Chess Game</CardTitle>
        <CardDescription>
          Upload a PGN file, paste PGN text, import from URL, or fetch from chess platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="paste">Paste</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="platform">Import</TabsTrigger>
            <TabsTrigger value="sample">Sample</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
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
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-4">
              <textarea
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                placeholder="Paste your PGN text here..."
                className="w-full h-24 p-3 border rounded-md resize-none text-sm font-mono"
              />
              <Button 
                onClick={handleTextSubmit}
                className="w-full"
                variant="outline"
              >
                Load PGN
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/game.pgn"
                className="w-full p-3 border rounded-md text-sm"
              />
              <Button 
                onClick={handleUrlSubmit}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <Link className="mr-2 h-4 w-4" />
                )}
                Load from URL
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="platform" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={(value: 'chess.com' | 'lichess') => setPlatform(value)}>
                  <SelectTrigger id="platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chess.com">Chess.com</SelectItem>
                    <SelectItem value="lichess">Lichess.org</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={`Enter ${platform === 'chess.com' ? 'Chess.com' : 'Lichess'} username`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {platform === 'chess.com' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Select value={importYear.toString()} onValueChange={(value) => setImportYear(parseInt(value))}>
                      <SelectTrigger id="year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="month">Month</Label>
                    <Select value={importMonth.toString()} onValueChange={(value) => setImportMonth(parseInt(value))}>
                      <SelectTrigger id="month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Button 
                onClick={handlePlatformImport} 
                className="w-full"
                disabled={isLoading || !username.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing games...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Import Games
                  </>
                )}
              </Button>
              
              <p className="text-sm text-gray-500">
                {platform === 'chess.com' 
                  ? 'Import games from a specific month'
                  : 'Import the last 20 games'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="sample" className="space-y-4">
            <div className="text-center">
              <p className="mb-4">Load a famous chess game to explore the features</p>
              <Button onClick={loadSampleGame} className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Load Fischer vs Spassky (1972)
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 