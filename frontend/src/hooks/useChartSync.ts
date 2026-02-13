import { useRef, useCallback } from 'react';
import type { IChartApi, LogicalRange, MouseEventParams, ISeriesApi, SeriesType } from 'lightweight-charts';

export interface ChartSyncState {
  logicalRange?: LogicalRange;
  crosshair?: {
    time?: number | string;
    price?: number;
    seriesId?: string;
  };
}

type SyncCallback = (sourceId: string, state: ChartSyncState) => void;

class ChartSyncManager {
  private subscribers: Map<string, SyncCallback> = new Map();

  subscribe(id: string, callback: SyncCallback) {
    this.subscribers.set(id, callback);
    return () => this.subscribers.delete(id);
  }

  broadcast(sourceId: string, state: ChartSyncState) {
    this.subscribers.forEach((callback, id) => {
      if (id !== sourceId) {
        callback(sourceId, state);
      }
    });
  }
}

const globalSyncManager = new ChartSyncManager();

export const useChartSync = (chartId: string) => {
  const syncManager = globalSyncManager;

  const handleSync = useCallback((callback: (state: ChartSyncState) => void) => {
    return syncManager.subscribe(chartId, (sourceId, state) => {
      callback(state);
    });
  }, [chartId]);

  const broadcast = useCallback((state: ChartSyncState) => {
    syncManager.broadcast(chartId, state);
  }, [chartId]);

  return { handleSync, broadcast };
};
