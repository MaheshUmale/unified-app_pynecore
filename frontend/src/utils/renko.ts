import type { OHLC } from '../types/chart';

export function calculateRenko(data: OHLC[], brickSize: number): OHLC[] {
  if (data.length === 0 || brickSize <= 0) return [];

  const renkoData: OHLC[] = [];
  let prevOpen = data[0].open;
  let prevClose = data[0].open;
  let trend: 1 | -1 | 0 = 0; // 1 for up, -1 for down
  let accumulatedVolume = 0;

  data.forEach((candle) => {
    accumulatedVolume += candle.volume || 0;
    const price = candle.close;

    let formed = true;
    while (formed) {
      formed = false;
      if (trend === 0) {
        // Initial brick formation
        if (price >= prevClose + brickSize) {
          trend = 1;
          const newClose = prevClose + brickSize;
          renkoData.push({
            time: candle.time,
            open: prevClose,
            high: newClose,
            low: prevClose,
            close: newClose,
            volume: accumulatedVolume,
          });
          prevOpen = prevClose;
          prevClose = newClose;
          accumulatedVolume = 0;
          formed = true;
        } else if (price <= prevClose - brickSize) {
          trend = -1;
          const newClose = prevClose - brickSize;
          renkoData.push({
            time: candle.time,
            open: prevClose,
            high: prevClose,
            low: newClose,
            close: newClose,
            volume: accumulatedVolume,
          });
          prevOpen = prevClose;
          prevClose = newClose;
          accumulatedVolume = 0;
          formed = true;
        }
      } else if (trend === 1) {
        // Up trend: look for another up brick or a reversal
        if (price >= prevClose + brickSize) {
          const newClose = prevClose + brickSize;
          renkoData.push({
            time: candle.time,
            open: prevClose,
            high: newClose,
            low: prevClose,
            close: newClose,
            volume: accumulatedVolume,
          });
          prevOpen = prevClose;
          prevClose = newClose;
          accumulatedVolume = 0;
          formed = true;
        } else if (price <= prevOpen - brickSize) {
          // Reversal
          trend = -1;
          const newOpen = prevOpen;
          const newClose = prevOpen - brickSize;
          renkoData.push({
            time: candle.time,
            open: newOpen,
            high: newOpen,
            low: newClose,
            close: newClose,
            volume: accumulatedVolume,
          });
          prevOpen = newOpen;
          prevClose = newClose;
          accumulatedVolume = 0;
          formed = true;
        }
      } else if (trend === -1) {
        // Down trend: look for another down brick or a reversal
        if (price <= prevClose - brickSize) {
          const newClose = prevClose - brickSize;
          renkoData.push({
            time: candle.time,
            open: prevClose,
            high: prevClose,
            low: newClose,
            close: newClose,
            volume: accumulatedVolume,
          });
          prevOpen = prevClose;
          prevClose = newClose;
          accumulatedVolume = 0;
          formed = true;
        } else if (price >= prevOpen + brickSize) {
          // Reversal
          trend = 1;
          const newOpen = prevOpen;
          const newClose = prevOpen + brickSize;
          renkoData.push({
            time: candle.time,
            open: newOpen,
            high: newClose,
            low: newOpen,
            close: newClose,
            volume: accumulatedVolume,
          });
          prevOpen = newOpen;
          prevClose = newClose;
          accumulatedVolume = 0;
          formed = true;
        }
      }
    }
  });

  // Ensure synthetic time for 45-degree angle
  return renkoData.map((d, i) => ({
    ...d,
    time: (data[0].time + i * 60) as any,
  }));
}
