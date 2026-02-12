import type { OHLC } from '../types/chart';

export function calculateRangeBars(data: OHLC[], rangeSize: number): OHLC[] {
  if (data.length === 0) return [];

  const rangeData: OHLC[] = [];
  let currentBar: OHLC | null = null;

  data.forEach((candle) => {
    if (!currentBar) {
      currentBar = { ...candle };
      return;
    }

    currentBar.high = Math.max(currentBar.high, candle.high);
    currentBar.low = Math.min(currentBar.low, candle.low);
    currentBar.close = candle.close;

    while (currentBar.high - currentBar.low >= rangeSize) {
      const direction = currentBar.close > currentBar.open ? 1 : -1;
      const closedBar: OHLC = {
        ...currentBar,
        close: direction === 1 ? currentBar.low + rangeSize : currentBar.high - rangeSize,
      };
      rangeData.push(closedBar);

      const remainingHigh: number = currentBar.high;
      const remainingLow: number = currentBar.low;
      const remainingClose: number = currentBar.close;

      currentBar = {
        time: candle.time,
        open: closedBar.close,
        high: Math.max(closedBar.close, remainingHigh),
        low: Math.min(closedBar.close, remainingLow),
        close: remainingClose,
      };
    }
  });

  if (currentBar) rangeData.push(currentBar);

  return rangeData.map((d, i) => ({
    ...d,
    time: (data[0].time + i * 60) as any,
  }));
}
