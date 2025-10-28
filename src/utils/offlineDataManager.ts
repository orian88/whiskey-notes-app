// IndexedDB를 사용한 오프라인 데이터 저장 유틸리티
class OfflineDataManager {
  private dbName = 'WhiskeyNotesOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB 초기화 실패:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB 초기화 성공');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 구매 기록 저장소
        if (!db.objectStoreNames.contains('purchases')) {
          const purchaseStore = db.createObjectStore('purchases', { keyPath: 'id' });
          purchaseStore.createIndex('whiskey_id', 'whiskey_id', { unique: false });
          purchaseStore.createIndex('purchase_date', 'purchase_date', { unique: false });
          purchaseStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 위스키 저장소
        if (!db.objectStoreNames.contains('whiskeys')) {
          const whiskeyStore = db.createObjectStore('whiskeys', { keyPath: 'id' });
          whiskeyStore.createIndex('name', 'name', { unique: false });
          whiskeyStore.createIndex('brand', 'brand', { unique: false });
        }

        // 테이스팅 노트 저장소
        if (!db.objectStoreNames.contains('tasting_notes')) {
          const tastingStore = db.createObjectStore('tasting_notes', { keyPath: 'id' });
          tastingStore.createIndex('whiskey_id', 'whiskey_id', { unique: false });
          tastingStore.createIndex('tasting_date', 'tasting_date', { unique: false });
        }

        // 개인 노트 저장소
        if (!db.objectStoreNames.contains('personal_notes')) {
          const personalStore = db.createObjectStore('personal_notes', { keyPath: 'id' });
          personalStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 컬렉션 아이템 저장소
        if (!db.objectStoreNames.contains('collection_items')) {
          const collectionStore = db.createObjectStore('collection_items', { keyPath: 'id' });
          collectionStore.createIndex('whiskey_id', 'whiskey_id', { unique: false });
        }

        // 동기화 대기열 저장소
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('table_name', 'table_name', { unique: false });
          syncStore.createIndex('operation', 'operation', { unique: false });
          syncStore.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });
  }

  // 데이터 저장
  async saveData(tableName: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      
      const request = store.put({
        ...data,
        offline_saved: true,
        created_at: new Date().toISOString()
      });

      request.onsuccess = () => {
        console.log(`${tableName} 데이터 오프라인 저장 성공:`, data.id);
        resolve();
      };

      request.onerror = () => {
        console.error(`${tableName} 데이터 오프라인 저장 실패:`, request.error);
        reject(request.error);
      };
    });
  }

  // 데이터 조회
  async getData(tableName: string, id?: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([tableName], 'readonly');
      const store = transaction.objectStore(tableName);
      
      let request: IDBRequest;
      
      if (id) {
        request = store.get(id);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        const result = id ? (request.result ? [request.result] : []) : request.result;
        resolve(result);
      };

      request.onerror = () => {
        console.error(`${tableName} 데이터 조회 실패:`, request.error);
        reject(request.error);
      };
    });
  }

  // 데이터 삭제
  async deleteData(tableName: string, id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`${tableName} 데이터 오프라인 삭제 성공:`, id);
        resolve();
      };

      request.onerror = () => {
        console.error(`${tableName} 데이터 오프라인 삭제 실패:`, request.error);
        reject(request.error);
      };
    });
  }

  // 동기화 대기열에 추가
  async addToSyncQueue(tableName: string, operation: 'create' | 'update' | 'delete', data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      const syncItem = {
        table_name: tableName,
        operation,
        data,
        created_at: new Date().toISOString(),
        retry_count: 0
      };

      const request = store.add(syncItem);

      request.onsuccess = () => {
        console.log('동기화 대기열에 추가됨:', syncItem);
        resolve();
      };

      request.onerror = () => {
        console.error('동기화 대기열 추가 실패:', request.error);
        reject(request.error);
      };
    });
  }

  // 동기화 대기열 조회
  async getSyncQueue(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readonly');
      const store = transaction.objectStore('sync_queue');
      
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('동기화 대기열 조회 실패:', request.error);
        reject(request.error);
      };
    });
  }

  // 동기화 대기열에서 항목 제거
  async removeFromSyncQueue(id: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('동기화 대기열에서 제거됨:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('동기화 대기열 제거 실패:', request.error);
        reject(request.error);
      };
    });
  }

  // 모든 오프라인 데이터 삭제
  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    const tables = ['purchases', 'whiskeys', 'tasting_notes', 'personal_notes', 'collection_items', 'sync_queue'];
    
    for (const tableName of tables) {
      const transaction = this.db!.transaction([tableName], 'readwrite');
      const store = transaction.objectStore(tableName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// 싱글톤 인스턴스
export const offlineDataManager = new OfflineDataManager();

// 오프라인 상태에서 CRUD 작업을 처리하는 헬퍼 함수들
export const offlineCRUD = {
  // 오프라인에서 데이터 생성
  async create(tableName: string, data: any): Promise<any> {
    const id = data.id || crypto.randomUUID();
    const dataWithId = { ...data, id };
    
    await offlineDataManager.saveData(tableName, dataWithId);
    await offlineDataManager.addToSyncQueue(tableName, 'create', dataWithId);
    
    return dataWithId;
  },

  // 오프라인에서 데이터 읽기
  async read(tableName: string, id?: string): Promise<any[]> {
    return await offlineDataManager.getData(tableName, id);
  },

  // 오프라인에서 데이터 업데이트
  async update(tableName: string, id: string, data: any): Promise<any> {
    const updatedData = { ...data, id };
    
    await offlineDataManager.saveData(tableName, updatedData);
    await offlineDataManager.addToSyncQueue(tableName, 'update', updatedData);
    
    return updatedData;
  },

  // 오프라인에서 데이터 삭제
  async delete(tableName: string, id: string): Promise<void> {
    await offlineDataManager.deleteData(tableName, id);
    await offlineDataManager.addToSyncQueue(tableName, 'delete', { id });
  }
};

export default offlineDataManager;
