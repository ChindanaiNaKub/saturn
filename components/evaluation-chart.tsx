'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background text-foreground p-2 rounded border border-border">
        <p className="label">{`Move ${label}`}</p>
        <p className="intro">{`Evaluation: ${payload[0].value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};

interface EvaluationChartProps {
  data: { name: number; uv: number }[];
}

const EvaluationChart: React.FC<EvaluationChartProps> = ({ data }) => {
  return (
    <div className="h-64 w-full mb-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" domain={[-10, 10]} allowDataOverflow={true} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted-foreground), 0.2)' }} />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="uv" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EvaluationChart; 