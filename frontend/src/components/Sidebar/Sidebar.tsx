import React from 'react';
import { Plus, MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SidebarProps {
  onSymbolSelect?: (symbol: string) => void;
}

const watchlist = [
  { symbol: 'AAPL', price: 185.92, change: 0.68, isUp: true },
  { symbol: 'BTCUSD', price: 43250.50, change: -0.28, isUp: false },
  { symbol: 'TSLA', price: 193.57, change: 2.17, isUp: true },
  { symbol: 'MSFT', price: 402.56, change: 0.21, isUp: true },
  { symbol: 'ETHUSD', price: 2315.20, change: -0.68, isUp: false },
  { symbol: 'NSE:NIFTY', price: 22012.35, change: 1.12, isUp: true },
];

const Sidebar: React.FC<SidebarProps> = ({ onSymbolSelect }) => {
  return (
    <aside className="w-72 border-l border-tv-border bg-tv-bg flex flex-col select-none">
      <div className="p-4 border-b border-tv-border flex items-center justify-between">
        <h2 className="font-bold text-tv-text">Watchlist</h2>
        <div className="flex gap-2">
          <button className="p-1 hover:bg-tv-grid rounded text-tv-text">
            <Plus className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-tv-grid rounded text-tv-text">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-tv-text/50 border-b border-tv-border/50 text-left">
              <th className="px-4 py-2 font-normal">Symbol</th>
              <th className="px-4 py-2 font-normal text-right">Last</th>
              <th className="px-4 py-2 font-normal text-right">Chg%</th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((item) => (
              <tr
                key={item.symbol}
                className="hover:bg-tv-grid cursor-pointer group"
                onClick={() => onSymbolSelect?.(item.symbol)}
              >
                <td className="px-4 py-2.5 font-bold text-tv-text">{item.symbol}</td>
                <td className="px-4 py-2.5 text-right text-tv-text">{item.price.toLocaleString()}</td>
                <td className={`px-4 py-2.5 text-right flex items-center justify-end gap-1 ${item.isUp ? 'text-green-500' : 'text-red-500'}`}>
                  {item.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {item.change}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-tv-border">
        <h3 className="text-sm font-bold text-tv-text mb-2">Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-tv-text/50">Volume</span>
            <span className="text-tv-text font-medium">42.5M</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-tv-text/50">Avg Vol (10d)</span>
            <span className="text-tv-text font-medium">38.2M</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-tv-text/50">Market Cap</span>
            <span className="text-tv-text font-medium">2.8T</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
