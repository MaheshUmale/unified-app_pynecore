import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, ArrowUpRight, ArrowDownRight, Trash2, X } from 'lucide-react';

interface WatchlistItem {
  symbol: string;
  price: number;
  change: number;
  isUp: boolean;
}

interface SidebarProps {
  onSymbolSelect?: (symbol: string) => void;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'AAPL', price: 185.92, change: 0.68, isUp: true },
  { symbol: 'BTCUSD', price: 43250.50, change: -0.28, isUp: false },
  { symbol: 'TSLA', price: 193.57, change: 2.17, isUp: true },
  { symbol: 'MSFT', price: 402.56, change: 0.21, isUp: true },
  { symbol: 'ETHUSD', price: 2315.20, change: -0.68, isUp: false },
  { symbol: 'NSE:NIFTY', price: 22012.35, change: 1.12, isUp: true },
];

const Sidebar: React.FC<SidebarProps> = ({ onSymbolSelect }) => {
  const [items, setItems] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem('tv-watchlist');
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    localStorage.setItem('tv-watchlist', JSON.stringify(items));
  }, [items]);

  const addSymbol = () => {
    if (!newSymbol) return;
    const upper = newSymbol.toUpperCase();
    if (items.some(i => i.symbol === upper)) {
      setNewSymbol('');
      setIsAdding(false);
      return;
    }

    // In a real app, we'd fetch the current price. Here we mock it.
    const newItem: WatchlistItem = {
      symbol: upper,
      price: 100 + Math.random() * 1000,
      change: (Math.random() * 4) - 2,
      isUp: Math.random() > 0.5
    };
    newItem.change = parseFloat(newItem.change.toFixed(2));
    newItem.isUp = newItem.change >= 0;

    setItems([...items, newItem]);
    setNewSymbol('');
    setIsAdding(false);
  };

  const removeSymbol = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setItems(items.filter(i => i.symbol !== symbol));
  };

  return (
    <aside className="w-72 border-l border-tv-border bg-tv-bg flex flex-col select-none">
      <div className="p-4 border-b border-tv-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-tv-text">Watchlist</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className={`p-1 hover:bg-tv-grid rounded text-tv-text ${isAdding ? 'bg-blue-600' : ''}`}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-1 hover:bg-tv-grid rounded text-tv-text">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="flex gap-1">
            <input
              autoFocus
              className="flex-1 bg-tv-grid border border-tv-border rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
              placeholder="Add symbol..."
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
            />
            <button onClick={addSymbol} className="bg-blue-600 p-1 rounded text-white"><Plus className="w-4 h-4" /></button>
            <button onClick={() => setIsAdding(false)} className="bg-tv-grid p-1 rounded text-white"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-tv-text/50 border-b border-tv-border/50 text-left">
              <th className="px-4 py-2 font-normal text-[11px]">Symbol</th>
              <th className="px-4 py-2 font-normal text-right text-[11px]">Last</th>
              <th className="px-4 py-2 font-normal text-right text-[11px]">Chg%</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.symbol}
                className="hover:bg-tv-grid cursor-pointer group relative"
                onClick={() => onSymbolSelect?.(item.symbol)}
              >
                <td className="px-4 py-2.5 font-bold text-tv-text">{item.symbol}</td>
                <td className="px-4 py-2.5 text-right text-tv-text">{item.price.toLocaleString()}</td>
                <td className={`px-4 py-2.5 text-right flex items-center justify-end gap-1 ${item.isUp ? 'text-green-500' : 'text-red-500'}`}>
                  {item.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(item.change)}%
                </td>
                <td className="px-1">
                   <button
                     onClick={(e) => removeSymbol(e, item.symbol)}
                     className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
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
