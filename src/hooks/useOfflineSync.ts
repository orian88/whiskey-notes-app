import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useOnlineStatus } from './useOnlineStatus';
import { offlineDataManager } from '../utils/offlineDataManager';

interface ISyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingSyncCount: number;
}

export const useOfflineSync = () => {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<ISyncStatus>({
    isOnline,
    isSyncing: false,
    lastSyncTime: null,
    pendingSyncCount: 0
  });

  // 동기화 대기열 처리
  const processSyncQueue = useCallback(async () => {
    if (!isOnline || syncStatus.isSyncing) return;

    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      
      const syncQueue = await offlineDataManager.getSyncQueue();
      console.log('동기화 대기열 처리 시작:', syncQueue.length, '개 항목');

      for (const item of syncQueue) {
        try {
          const { table_name, operation, data } = item;

          switch (operation) {
            case 'create':
              await supabase.from(table_name).insert([data]);
              break;
            case 'update':
              await supabase.from(table_name).update(data).eq('id', data.id);
              break;
            case 'delete':
              await supabase.from(table_name).delete().eq('id', data.id);
              break;
          }

          // 성공적으로 동기화된 항목을 대기열에서 제거
          await offlineDataManager.removeFromSyncQueue(item.id);
          console.log('동기화 성공:', table_name, operation, data.id);
        } catch (error) {
          console.error('동기화 실패:', item, error);
          // 실패한 항목은 재시도를 위해 남겨둠
        }
      }

      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
        pendingSyncCount: 0
      }));

    } catch (error) {
      console.error('동기화 대기열 처리 중 오류:', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [isOnline, syncStatus.isSyncing]);

  // 온라인 상태 변경 시 자동 동기화
  useEffect(() => {
    if (isOnline && !syncStatus.isOnline) {
      console.log('온라인 상태로 변경됨, 동기화 시작');
      processSyncQueue();
    }
    
    setSyncStatus(prev => ({ ...prev, isOnline }));
  }, [isOnline, processSyncQueue, syncStatus.isOnline]);

  // 주기적 동기화 (5분마다)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      processSyncQueue();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, [isOnline, processSyncQueue]);

  // 대기열 상태 업데이트
  const updateSyncStatus = useCallback(async () => {
    try {
      const syncQueue = await offlineDataManager.getSyncQueue();
      setSyncStatus(prev => ({
        ...prev,
        pendingSyncCount: syncQueue.length
      }));
    } catch (error) {
      console.error('동기화 상태 업데이트 실패:', error);
    }
  }, []);

  // 수동 동기화 트리거
  const triggerSync = useCallback(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, [isOnline, processSyncQueue]);

  // 오프라인 데이터와 온라인 데이터 병합
  const mergeOfflineData = useCallback(async (tableName: string, onlineData: any[]) => {
    try {
      const offlineData = await offlineDataManager.getData(tableName);
      
      // 오프라인 데이터를 온라인 데이터에 병합
      const mergedData = [...onlineData];
      
      offlineData.forEach(offlineItem => {
        const existingIndex = mergedData.findIndex(item => item.id === offlineItem.id);
        if (existingIndex >= 0) {
          // 기존 항목 업데이트
          mergedData[existingIndex] = offlineItem;
        } else {
          // 새 항목 추가
          mergedData.push(offlineItem);
        }
      });

      return mergedData;
    } catch (error) {
      console.error('오프라인 데이터 병합 실패:', error);
      return onlineData;
    }
  }, []);

  return {
    ...syncStatus,
    processSyncQueue,
    triggerSync,
    updateSyncStatus,
    mergeOfflineData
  };
};
