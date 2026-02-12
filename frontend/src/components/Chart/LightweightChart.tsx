import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import type { CandlestickData, HistogramData } from 'lightweight-charts';

interface Drawing {
  type: 'trendline' | 'fibonacci';
  points: { time: number; price: number }[];
}

interface LightweightChartProps {
  data: CandlestickData[];
  volumeData?: HistogramData[];
  type?: 'candle' | 'line';
  onCrosshairMove?: (param: any) => void;
  activeTool?: string;
}

const LightweightChart: React.FC<LightweightChartProps> = ({
  data,
  volumeData,
  type = 'candle',
  onCrosshairMove,
  activeTool
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#D1D4DC',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: {
        mode: 0,
        vertLine: { labelBackgroundColor: '#2B2B43' },
        horzLine: { labelBackgroundColor: '#2B2B43' },
      },
      timeScale: {
        borderColor: '#2B2B43',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
      },
    });

    chartRef.current = chart;

    const chartAny = chart as any;

    if (type === 'candle') {
      seriesRef.current = chartAny.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
    } else {
      seriesRef.current = chartAny.addSeries(LineSeries, {
        color: '#2196F3',
        lineWidth: 2,
      });
    }

    volumeSeriesRef.current = chartAny.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    if (onCrosshairMove) {
      chart.subscribeCrosshairMove(onCrosshairMove);
    }

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        if (canvasRef.current) {
          canvasRef.current.width = chartContainerRef.current.clientWidth;
          canvasRef.current.height = chartContainerRef.current.clientHeight;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [type, onCrosshairMove]);

  useEffect(() => {
    if (seriesRef.current && data) {
      seriesRef.current.setData(data);
    }
  }, [data]);

  useEffect(() => {
    if (volumeSeriesRef.current && volumeData) {
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [volumeData]);

  // Handle Drawing Logic
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderDrawings = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const allDrawings = [...drawings, ...(currentDrawing ? [currentDrawing] : [])];

      allDrawings.forEach(drawing => {
        if (drawing.points.length < 2) return;

        const p1 = drawing.points[0];
        const p2 = drawing.points[1];

        const x1 = chart.timeScale().timeToCoordinate(p1.time as any);
        const y1 = series.priceToCoordinate(p1.price);
        const x2 = chart.timeScale().timeToCoordinate(p2.time as any);
        const y2 = series.priceToCoordinate(p2.price);

        if (x1 === null || y1 === null || x2 === null || y2 === null) return;

        if (drawing.type === 'trendline') {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = '#2196F3';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (drawing.type === 'fibonacci') {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const diff = p2.price - p1.price;

          levels.forEach(level => {
            const price = p1.price + diff * level;
            const y = series.priceToCoordinate(price);
            if (y === null) return;

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.strokeStyle = `rgba(209, 212, 220, ${0.5 - level * 0.3})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#D1D4DC';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${(level * 100).toFixed(1)}% (${price.toFixed(2)})`, 10, y - 5);
          });

          // Main line
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(33, 150, 243, 0.5)';
          ctx.stroke();
        }
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (activeTool !== 'trendline' && activeTool !== 'fibonacci') return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) return;

      if (!currentDrawing) {
        setCurrentDrawing({
          type: activeTool as any,
          points: [{ time: time as any, price }]
        });
      } else {
        setDrawings([...drawings, { ...currentDrawing, points: [...currentDrawing.points, { time: time as any, price }] }]);
        setCurrentDrawing(null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!currentDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) return;

      setCurrentDrawing({
        ...currentDrawing,
        points: [currentDrawing.points[0], { time: time as any, price }]
      });
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);

    // Sync rendering
    const animationId = requestAnimationFrame(function loop() {
      renderDrawings();
      requestAnimationFrame(loop);
    });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [drawings, currentDrawing, activeTool]);

  return (
    <div className="relative w-full h-full">
      <div ref={chartContainerRef} className="absolute inset-0" />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 ${activeTool === 'cursor' ? 'pointer-events-none' : 'cursor-crosshair'}`}
      />
    </div>
  );
};

export default LightweightChart;
