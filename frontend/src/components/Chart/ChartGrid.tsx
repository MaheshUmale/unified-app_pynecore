import React from 'react';
import LightweightChart from './LightweightChart';
import type { CandlestickData, HistogramData } from 'lightweight-charts';

export type LayoutType = '1x1' | '1x2' | '2x1' | '2x2';

interface ChartPaneConfig {
  id: string;
  symbol: string;
  interval: string;
  type: 'candle' | 'line' | 'renko' | 'range';
  data: CandlestickData[];
  volumeData?: HistogramData[];
}

interface ChartGridProps {
  layout: LayoutType;
  configs: ChartPaneConfig[];
  isDarkMode: boolean;
  activeTool: string;
  clearDrawings?: boolean;
  isSyncEnabled: boolean;
  showSMA: boolean;
  timezone: string;
  onCrosshairMove?: (chartId: string, param: any) => void;
}

const ChartGrid: React.FC<ChartGridProps> = ({
  layout,
  configs,
  isDarkMode,
  activeTool,
  clearDrawings,
  isSyncEnabled,
  showSMA,
  timezone,
  onCrosshairMove
}) => {
  const getGridClass = () => {
    switch (layout) {
      case '1x1': return 'grid-cols-1 grid-rows-1';
      case '1x2': return 'grid-cols-2 grid-rows-1';
      case '2x1': return 'grid-cols-1 grid-rows-2';
      case '2x2': return 'grid-cols-2 grid-rows-2';
      default: return 'grid-cols-1 grid-rows-1';
    }
  };

  const visibleConfigs = configs.slice(0, layout === '2x2' ? 4 : layout === '1x1' ? 1 : 2);

  return (
    <div className={`grid w-full h-full gap-1 bg-gray-800 p-1 ${getGridClass()}`}>
      {visibleConfigs.map((config) => (
        <div key={config.id} className="relative bg-[#131722] overflow-hidden border border-gray-700">
           <div className="absolute top-2 left-12 z-20 flex items-center gap-2 bg-[#1e222d]/80 px-2 py-1 rounded text-xs text-gray-300 pointer-events-none">
             <span className="font-bold text-blue-400">{config.symbol}</span>
             <span>{config.interval}m</span>
             <span className="capitalize">{config.type}</span>
           </div>
           <LightweightChart
             chartId={config.id}
             isSyncEnabled={isSyncEnabled}
             data={config.data}
             volumeData={config.volumeData}
             type={config.type}
             isDarkMode={isDarkMode}
             activeTool={activeTool}
             clearDrawings={clearDrawings}
             showSMA={showSMA}
             timezone={timezone}
             onCrosshairMove={(p) => onCrosshairMove?.(config.id, p)}
           />
        </div>
      ))}
    </div>
  );
};

export default ChartGrid;
