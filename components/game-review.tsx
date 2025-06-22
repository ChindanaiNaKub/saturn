import React from 'react';
import dynamic from 'next/dynamic';
import { GameReviewData, MoveClassification } from '@/lib/pgn-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem, Star, ThumbsUp, HelpCircle, AlertCircle, Bomb, BookOpen, CheckCircle2, Loader2 } from 'lucide-react';

const DynamicEvaluationChart = dynamic(() => import('./evaluation-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  ),
});

interface GameReviewProps {
  reviewData: GameReviewData;
}

const classificationMeta: Record<MoveClassification, { icon: React.ReactNode; label: string; color: string }> = {
  brilliant: { icon: <Gem className="h-5 w-5" />, label: 'Brilliant', color: 'text-cyan-400' },
  great: { icon: <Star className="h-5 w-5" />, label: 'Great', color: 'text-sky-500' },
  best: { icon: <CheckCircle2 className="h-5 w-5" />, label: 'Best', color: 'text-green-500' },
  excellent: { icon: <ThumbsUp className="h-5 w-5" />, label: 'Excellent', color: 'text-lime-500' },
  good: { icon: null, label: 'Good', color: '' },
  book: { icon: <BookOpen className="h-5 w-5" />, label: 'Book', color: 'text-violet-500' },
  inaccuracy: { icon: <HelpCircle className="h-5 w-5" />, label: 'Inaccuracy', color: 'text-yellow-500' },
  mistake: { icon: <AlertCircle className="h-5 w-5" />, label: 'Mistake', color: 'text-orange-500' },
  blunder: { icon: <Bomb className="h-5 w-5" />, label: 'Blunder', color: 'text-red-600' },
};

const GameReview: React.FC<GameReviewProps> = ({ reviewData }) => {
  const { white, black, evaluationHistory } = reviewData;
  const chartData = evaluationHistory.map(item => ({ name: item.move, uv: item.eval }));

  const renderPlayerStats = (player: 'white' | 'black', data: GameReviewData['white']) => (
    <div className="flex-1">
      <h3 className="text-xl font-bold text-center mb-4 capitalize">{player}</h3>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-center">Accuracy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-center">{data.accuracy.toFixed(1)}%</p>
        </CardContent>
      </Card>
      
      <div className="space-y-2">
        {Object.entries(classificationMeta).map(([key, meta]) => {
          const count = data.moveCounts[key as MoveClassification];
          if (meta.label === 'Good' || count === 0) return null;
          return (
            <div key={key} className={`flex items-center justify-between p-2 rounded-md ${meta.color.replace('text-', 'bg-')}/10`}>
              <span className="font-semibold">{meta.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{count}</span>
                <span className={meta.color}>{meta.icon}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-6">
        <DynamicEvaluationChart data={chartData} />
        <div className="max-w-4xl mx-auto mt-6">
          <div className="flex gap-8">
            {renderPlayerStats('white', white)}
            {renderPlayerStats('black', black)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameReview; 