import React from 'react';
import { Search, Moon, Sun, LayoutGrid } from 'lucide-react';
import type { ChartType } from '../../types/chart';

interface HeaderProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  interval: string;
  onIntervalChange: (interval: string) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const timeframes = [
  { label: '1M', value: '1' },
  { label: '5M', value: '5' },
  { label: '15M', value: '15' },
  { label: '30M', value: '30' },
  { label: '1H', value: '60' },
  { label: '1D', value: 'D' },
];
const chartTypes: { label: string; value: ChartType }[] = [
  { label: 'Candle', value: 'candle' },
  { label: 'Line', value: 'line' },
  { label: 'Renko', value: 'renko' },
  { label: 'Range', value: 'range' },
];

const Header: React.FC<HeaderProps> = ({
  symbol,
  onSymbolChange,
  interval,
  onIntervalChange,
  chartType,
  onChartTypeChange,
  isDarkMode,
  toggleDarkMode,
}) => {
  return (
    <header className="h-14 border-b border-tv-border bg-tv-bg flex items-center px-4 justify-between">
      <div className="flex items-center gap-4">
        <div className="text-blue-500 font-bold text-xl tracking-tighter">
          UNIFIED<span className="text-white">APP</span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tv-text/50" />
          <input
            type="text"
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            className="bg-[#1e222d] text-tv-text text-sm rounded border border-tv-border pl-10 pr-4 py-1.5 focus:outline-none focus:border-blue-500 w-48"
            placeholder="Search Symbol..."
          />
        </div>

        <div className="h-6 w-px bg-tv-border mx-2" />

        <div className="flex gap-1">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onIntervalChange(tf.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded hover:bg-tv-grid transition-colors ${
                interval === tf.value ? 'bg-blue-600 text-white' : 'text-tv-text'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-tv-border mx-2" />

        <div className="flex gap-1">
          {chartTypes.map((ct) => (
            <button
              key={ct.value}
              onClick={() => onChartTypeChange(ct.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded hover:bg-tv-grid transition-colors ${
                chartType === ct.value ? 'bg-blue-600 text-white' : 'text-tv-text'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-tv-grid rounded transition-colors text-tv-text">
          <LayoutGrid className="w-5 h-5" />
        </button>
        <button
          onClick={toggleDarkMode}
          className="p-2 hover:bg-tv-grid rounded transition-colors text-tv-text"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
