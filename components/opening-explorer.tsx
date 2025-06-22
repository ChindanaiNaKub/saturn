import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Loader2 } from 'lucide-react';

interface OpeningMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  averageRating: number;
}

interface OpeningData {
  white: number;
  draws: number;
  black: number;
  moves: OpeningMove[];
  opening?: {
    eco: string;
    name: string;
  };
}

interface OpeningExplorerProps {
  fen: string;
}

const OpeningExplorer: React.FC<OpeningExplorerProps> = ({ fen }) => {
  const [openingData, setOpeningData] = useState<OpeningData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpeningData = async () => {
      if (!fen) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`https://explorer.lichess.ovh/lichess?fen=${fen}&speeds=blitz,rapid,classical&ratings=2000,2200,2500`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const data = await response.json();
        setOpeningData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setOpeningData(null);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      fetchOpeningData();
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimeout);
  }, [fen]);

  const renderWinRateBar = (white: number, draws: number, black: number) => {
    const total = white + draws + black;
    if (total === 0) {
      return <div className="h-4 w-full bg-gray-200 rounded-full" />;
    }
    const whitePct = (white / total) * 100;
    const drawsPct = (draws / total) * 100;
    
    return (
      <div className="flex h-4 w-full rounded-full overflow-hidden bg-gray-200">
        <div style={{ width: `${whitePct}%` }} className="bg-white" title={`White wins: ${whitePct.toFixed(1)}%`}></div>
        <div style={{ width: `${drawsPct}%` }} className="bg-gray-400" title={`Draws: ${drawsPct.toFixed(1)}%`}></div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          Opening Explorer
        </CardTitle>
        {openingData?.opening && (
          <p className="text-sm text-gray-500 pt-1">
            {openingData.opening.eco} - {openingData.opening.name}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            <span className="ml-2">Loading opening data...</span>
          </div>
        )}
        {error && <p className="text-red-500">{error}</p>}
        {openingData && !isLoading && (
          <div className="space-y-4">
             {openingData.moves.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Move</TableHead>
                    <TableHead className="text-right">Games</TableHead>
                    <TableHead className="w-[150px]">Win Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openingData.moves.map((move) => {
                    const totalGames = move.white + move.draws + move.black;
                    return (
                      <TableRow key={move.uci}>
                        <TableCell className="font-mono font-bold">{move.san}</TableCell>
                        <TableCell className="text-right">{totalGames.toLocaleString()}</TableCell>
                        <TableCell>{renderWinRateBar(move.white, move.draws, move.black)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
               <p className="text-center text-gray-500 py-4">No data available for this position.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OpeningExplorer; 