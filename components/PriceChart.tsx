import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PricePoint } from '../types';

interface PriceChartProps {
  history: PricePoint[];
  currency: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ history, currency }) => {
  const data = history.map(h => ({
    date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    price: h.price,
    fullDate: new Date(h.date).toLocaleString(),
  }));

  if (data.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-gray-100">
        Not enough data for history chart yet.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: '#64748b' }} 
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number) => [`${value.toLocaleString()} ${currency}`, 'Price']}
            labelFormatter={(label) => label}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#2563eb" 
            strokeWidth={2} 
            dot={{ r: 3, fill: '#2563eb' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;
