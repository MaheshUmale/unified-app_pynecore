import React, { useState } from 'react';
import { Search, Moon, Sun, LayoutGrid, ChevronDown, BarChart2, TrendingUp, Hash, Activity, FlaskConical, PlayCircle, Table, Link } from 'lucide-react';
import type { ChartType } from '../../types/chart';
import type { LayoutType } from '../Chart/ChartGrid';

interface HeaderProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  interval: string;
  onIntervalChange: (interval: string) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  ticksPerCandle: number;
  onTicksPerCandleChange: (ticks: number) => void;
  renkoSize: number;
  onRenkoSizeChange: (size: number) => void;
  rangeValue: number;
  onRangeValueChange: (value: number) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  showSMA: boolean;
  onToggleSMA: () => void;
  layout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  isSyncEnabled: boolean;
  onToggleSync: () => void;
  isReplayActive: boolean;
  onToggleReplay: () => void;
  showOptions: boolean;
  onToggleOptions: () => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
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
  { label: 'Volume Footprint', value: 'footprint', icon: BarChart2 },
  { label: 'Tick by Tick', value: 'tick', icon: Activity },
];

const Header: React.FC<HeaderProps> = ({
  symbol,
  onSymbolChange,
  interval,
  onIntervalChange,
  chartType,
  onChartTypeChange,
  ticksPerCandle,
  onTicksPerCandleChange,
  renkoSize,
  onRenkoSizeChange,
  rangeValue,
  onRangeValueChange,
  isDarkMode,
  toggleDarkMode,
  showSMA,
  onToggleSMA,
  layout,
  onLayoutChange,
  isSyncEnabled,
  onToggleSync,
  isReplayActive,
  onToggleReplay,
  showOptions,
  onToggleOptions,
  timezone,
  onTimezoneChange
}) => {
  const [showChartTypes, setShowChartTypes] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const CurrentChartIcon = chartTypes.find(ct => ct.value === chartType)?.icon || BarChart2;

  return (
    <header className="h-14 border-b border-tv-border bg-tv-bg flex items-center px-4 justify-between select-none">
      <div className="flex items-center h-full">
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

        {chartType === 'tick' && (
          <>
            <div className="flex items-center gap-1 bg-[#1e222d] rounded px-2 py-1 mr-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Ticks</span>
              <select
                value={ticksPerCandle}
                onChange={(e) => onTicksPerCandleChange(Number(e.target.value))}
                className="bg-transparent text-[11px] font-bold text-blue-400 focus:outline-none cursor-pointer"
              >
                {[1, 5, 10, 20, 50, 100].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="h-6 w-px bg-tv-border mr-4" />
          </>
        )}

        {chartType === 'renko' && (
          <>
            <div className="flex items-center gap-1 bg-[#1e222d] rounded px-2 py-1 mr-4 border border-tv-border">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Brick</span>
              <input
                type="number"
                value={renkoSize}
                onChange={(e) => onRenkoSizeChange(Number(e.target.value))}
                className="bg-transparent text-[11px] font-bold text-blue-400 focus:outline-none w-10 text-center"
              />
            </div>
            <div className="h-6 w-px bg-tv-border mr-4" />
          </>
        )}

        {chartType === 'range' && (
          <>
            <div className="flex items-center gap-1 bg-[#1e222d] rounded px-2 py-1 mr-4 border border-tv-border">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Range</span>
              <input
                type="number"
                value={rangeValue}
                onChange={(e) => onRangeValueChange(Number(e.target.value))}
                className="bg-transparent text-[11px] font-bold text-blue-400 focus:outline-none w-10 text-center"
              />
            </div>
            <div className="h-6 w-px bg-tv-border mr-4" />
          </>
        )}

        <div className="relative h-full flex items-center">
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
              <div className="fixed inset-0 z-40" onClick={() => setShowChartTypes(false)} />
              <div className="absolute top-[calc(100%-4px)] left-0 w-56 bg-[#1e222d] border border-tv-border rounded shadow-xl z-50 py-1">
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

        <div className="h-6 w-px bg-tv-border mx-4" />

        <div className="relative h-full flex items-center">
          <button
            onClick={() => setShowIndicators(!showIndicators)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-tv-text hover:bg-tv-grid rounded transition-colors"
          >
            <FlaskConical className="w-4 h-4 text-blue-500" />
            <span className="text-[13px] font-semibold">Indicators</span>
          </button>

          {showIndicators && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowIndicators(false)} />
              <div className="absolute top-[calc(100%-4px)] left-0 w-56 bg-[#1e222d] border border-tv-border rounded shadow-xl z-50 py-1">
                <button
                  onClick={() => {
                    onToggleSMA();
                    setShowIndicators(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                    showSMA ? 'bg-blue-600/20 text-blue-500' : 'text-tv-text hover:bg-tv-grid'
                  }`}
                >
                  <span className="font-medium">SMA 20</span>
                  {showSMA && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleReplay}
          className={`p-2 rounded transition-colors ${isReplayActive ? 'text-blue-500 bg-blue-500/10' : 'text-tv-text hover:bg-tv-grid'}`}
          title="Bar Replay"
        >
          <PlayCircle className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleOptions}
          className={`p-2 rounded transition-colors ${showOptions ? 'text-blue-500 bg-blue-500/10' : 'text-tv-text hover:bg-tv-grid'}`}
          title="Option Chain"
        >
          <Table className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-tv-border mx-1" />

        <button
          onClick={onToggleSync}
          className={`p-2 rounded transition-colors ${isSyncEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-tv-text hover:bg-tv-grid'}`}
          title="Sync Crosshair/Time"
        >
          <Link className={`w-5 h-5 ${isSyncEnabled ? 'rotate-45' : ''}`} />
        </button>

        <div className="h-6 w-px bg-tv-border mx-1" />

        <div className="flex items-center bg-[#1e222d] rounded border border-tv-border px-2 py-1">
          <span className="text-[10px] text-gray-500 mr-2 font-bold uppercase">TZ</span>
          <select
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-blue-400 focus:outline-none cursor-pointer"
          >
            <option value="UTC">UTC</option>
            <option value="Asia/Kolkata">IST</option>
          </select>
        </div>

        <div className="h-6 w-px bg-tv-border mx-1" />

        <div className="relative">
          <button
            onClick={() => setShowLayouts(!showLayouts)}
            className={`p-2 rounded transition-colors ${showLayouts ? 'text-blue-500 bg-blue-500/10' : 'text-tv-text hover:bg-tv-grid'}`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          {showLayouts && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLayouts(false)} />
              <div className="absolute top-[calc(100%+8px)] right-0 w-32 bg-[#1e222d] border border-tv-border rounded shadow-xl z-50 py-1">
                {(['1x1', '1x2', '2x1', '2x2'] as LayoutType[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      onLayoutChange(l);
                      setShowLayouts(false);
                    }}
                    className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                      layout === l ? 'bg-blue-600/20 text-blue-500' : 'text-tv-text hover:bg-tv-grid'
                    }`}
                  >
                    {l} Grid
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

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
