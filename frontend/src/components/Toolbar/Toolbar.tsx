import React from 'react';
import { MousePointer2, TrendingUp, Hash, Trash2, Minus, Columns, Type, Square, Circle, Eraser } from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onClearAll: () => void;
}

const tools = [
  { id: 'cursor', icon: MousePointer2, title: 'Cursor' },
  { id: 'trendline', icon: TrendingUp, title: 'Trendline' },
  { id: 'fibonacci', icon: Hash, title: 'Fibonacci' },
  { id: 'horizontal', icon: Minus, title: 'Horizontal Line' },
  { id: 'vertical', icon: Columns, title: 'Vertical Line' },
  { id: 'text', icon: Type, title: 'Text' },
  { id: 'rect', icon: Square, title: 'Rectangle' },
  { id: 'circle', icon: Circle, title: 'Circle' },
  { id: 'eraser', icon: Eraser, title: 'Eraser' },
];

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange, onClearAll }) => {
  return (
    <aside className="w-12 border-r border-tv-border bg-tv-bg flex flex-col items-center py-2 gap-1 select-none">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded transition-colors group relative ${
              activeTool === tool.id ? 'bg-blue-600 text-white' : 'text-tv-text hover:bg-tv-grid'
            }`}
            title={tool.title}
          >
            <Icon className="w-5 h-5" />

            {/* Tooltip mimic */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#2a2e39] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-tv-border shadow-lg">
              {tool.title}
            </div>
          </button>
        );
      })}

      <div className="w-8 h-px bg-tv-border my-1" />

      <button
        onClick={onClearAll}
        className="p-2 text-tv-text hover:bg-red-500/20 hover:text-red-500 rounded transition-colors group relative"
        title="Clear All Drawings"
      >
        <Trash2 className="w-5 h-5" />
        <div className="absolute left-full ml-2 px-2 py-1 bg-[#2a2e39] text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-tv-border shadow-lg">
          Clear All Drawings
        </div>
      </button>
    </aside>
  );
};

export default Toolbar;
