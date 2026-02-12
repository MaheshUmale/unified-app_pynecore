import React from 'react';
import { MousePointer2, TrendingUp, Type, Ruler, Square, Circle, Trash2, ArrowRight } from 'lucide-react';

const tools = [
  { icon: MousePointer2, label: 'Cursor', id: 'cursor' },
  { icon: TrendingUp, label: 'Trendline', id: 'trendline' },
  { icon: ArrowRight, label: 'Ray', id: 'ray' },
  { icon: Type, label: 'Fibonacci', id: 'fibonacci' },
  { icon: Ruler, label: 'Measure', id: 'measure' },
  { icon: Square, label: 'Rectangle', id: 'rectangle' },
  { icon: Circle, label: 'Circle', id: 'circle' },
];

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onClearAll: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange, onClearAll }) => {
  return (
    <div className="w-12 border-r border-tv-border bg-tv-bg flex flex-col items-center py-4 gap-4">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded transition-colors group relative ${
              activeTool === tool.id ? 'bg-blue-600 text-white' : 'text-tv-text hover:bg-tv-grid'
            }`}
            title={tool.label}
          >
            <Icon className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[#2a2e39] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {tool.label}
            </span>
          </button>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-4">
        <button
          onClick={onClearAll}
          className="p-2 text-tv-text hover:bg-tv-grid rounded transition-colors"
          title="Clear All Drawings"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
