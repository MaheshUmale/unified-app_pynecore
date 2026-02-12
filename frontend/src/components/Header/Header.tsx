import React, { useState } from 'react';
import { Search, Moon, Sun, LayoutGrid, ChevronDown, BarChart2, TrendingUp, Hash, Activity } from 'lucide-react';
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
const chartTypes: { label: string; value: ChartType; icon: any }[] = [
  { label: 'Candle', value: 'candle', icon: BarChart2 },
  { label: 'Line', value: 'line', icon: TrendingUp },
  { label: 'RENKO CANDLESTICKS', value: 'renko', icon: Hash },
  { label: 'RANGEBAR', value: 'range', icon: Activity },
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
  const [showChartTypes, setShowChartTypes] = useState(false);
  const CurrentChartIcon = chartTypes.find(ct => ct.value === chartType)?.icon || BarChart2;

  return (
    <header className="h-14 border-b border-tv-border bg-tv-bg flex items-center px-4 justify-between select-none">
      <div className="flex items-center">
        <div className="text-blue-500 font-bold text-xl tracking-tighter mr-6">
          UNIFIED<span className="text-white">APP</span>
        </div>

        <div className="relative group">
          <div className="flex items-center bg-[#1e222d] rounded border border-tv-border px-3 py-1.5 hover:border-gray-500 cursor-pointer">
            <Search className="w-4 h-4 text-tv-text/50 mr-2" />
            <input
              type="text"
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="bg-transparent text-tv-text text-sm focus:outline-none w-32 font-bold"
              placeholder="Symbol"
            />
          </div>
        </div>

        <div className="h-6 w-px bg-tv-border mx-4" />

        <div className="flex items-center gap-0.5">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onIntervalChange(tf.value)}
              className={`px-2.5 py-1.5 text-[13px] font-semibold rounded hover:bg-tv-grid transition-colors ${
                interval === tf.value ? 'text-blue-500' : 'text-tv-text'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-tv-border mx-4" />

        <div className="relative">
          <button
            onClick={() => setShowChartTypes(!showChartTypes)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-tv-text hover:bg-tv-grid rounded transition-colors"
          >
            <CurrentChartIcon className="w-4 h-4 text-blue-500" />
            <span className="text-[13px] font-semibold">{chartTypes.find(ct => ct.value === chartType)?.label.split(' ')[0]}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showChartTypes ? 'rotate-180' : ''}`} />
          </button>

          {showChartTypes && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowChartTypes(false)}
              />
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#1e222d] border border-tv-border rounded shadow-xl z-50 py-1">
                {chartTypes.map((ct) => {
                  const Icon = ct.icon;
                  return (
                    <button
                      key={ct.value}
                      onClick={() => {
                        onChartTypeChange(ct.value);
                        setShowChartTypes(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        chartType === ct.value ? 'bg-blue-600/20 text-blue-500' : 'text-tv-text hover:bg-tv-grid'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{ct.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
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
