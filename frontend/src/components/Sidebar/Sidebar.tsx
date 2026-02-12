import React from 'react';
import { Plus, MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { WatchlistItem } from '../../types/chart';

const mockWatchlist: WatchlistItem[] = [
  { symbol: 'AAPL', price: 185.92, change: 1.25, changePercent: 0.68 },
  { symbol: 'BTCUSD', price: 43250.50, change: -120.40, changePercent: -0.28 },
  { symbol: 'TSLA', price: 193.57, change: 4.12, changePercent: 2.17 },
  { symbol: 'MSFT', price: 402.56, change: 0.85, changePercent: 0.21 },
  { symbol: 'ETHUSD', price: 2315.20, change: -15.80, changePercent: -0.68 },
];

const Sidebar: React.FC = () => {
  return (
    <div className="w-72 border-l border-tv-border bg-tv-bg flex flex-col">
      <div className="p-4 border-b border-tv-border flex justify-between items-center">
        <h3 className="text-tv-text font-bold text-sm">Watchlist</h3>
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
        <table className="w-full text-left text-xs">
          <thead className="text-tv-text/50 border-b border-tv-border">
            <tr>
              <th className="px-4 py-2 font-normal">Symbol</th>
              <th className="px-4 py-2 font-normal text-right">Last</th>
              <th className="px-4 py-2 font-normal text-right">Chg%</th>
            </tr>
          </thead>
          <tbody>
            {mockWatchlist.map((item) => (
              <tr key={item.symbol} className="hover:bg-tv-grid cursor-pointer group">
                <td className="px-4 py-3 font-bold text-tv-text">{item.symbol}</td>
                <td className="px-4 py-3 text-right text-tv-text">{item.price.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right flex items-center justify-end gap-1 ${
                  item.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {item.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {item.changePercent.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-48 border-t border-tv-border p-4 bg-[#1e222d]">
        <h3 className="text-tv-text font-bold text-sm mb-2">Details</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-tv-text/50">Volume</span>
            <span className="text-tv-text">42.5M</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-tv-text/50">Avg Vol (10d)</span>
            <span className="text-tv-text">38.2M</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-tv-text/50">Market Cap</span>
            <span className="text-tv-text">2.8T</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
