export interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type ChartType = 'candle' | 'line' | 'renko' | 'range' | 'footprint' | 'tick';

export interface FootprintLevel {
  price: number;
  buy: number;
  sell: number;
}

export type FootprintData = Record<number, FootprintLevel[]>;

export interface DrawingTool {
  type: 'trendline' | 'fibonacci';
  active: boolean;
}

export interface WatchlistItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}
