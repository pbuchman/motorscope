import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { PricePoint } from '../types';
import { formatEuropeanDateShort, formatEuropeanDateTime } from '../utils/formatters';
import { deduplicatePricePointsByLocalDay } from '../utils/priceHistory';

interface PriceChartProps {
  history: PricePoint[];
  currency: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ history, currency }) => {
  const { t } = useTranslation('dashboard');

  // Deduplicate price points by local day to avoid showing multiple points on the same day
  const deduplicatedHistory = useMemo(
    () => deduplicatePricePointsByLocalDay(history),
    [history]
  );

  const data = deduplicatedHistory.map(h => ({
    date: formatEuropeanDateShort(h.date),
    price: h.price,
    fullDate: formatEuropeanDateTime(h.date),
  }));

  if (data.length < 2) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg border border-gray-100 px-4">
        <p className="text-gray-500 text-sm font-medium mb-1">{t('priceHistory.emptyTitle')}</p>
        <p className="text-gray-400 text-xs">{t('priceHistory.emptyDescription')}</p>
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
