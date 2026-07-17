// File Sharding & Telemetry Utilities for MiniDrive

const CHUNK_SIZE = 1024 * 1024; // 1MB

/**
 * Mocks file chunking and encryption.
 * In a real scenario, we'd use window.crypto.subtle to encrypt the bytes.
 */
export const shardAndEncryptFile = async (file: File): Promise<string[]> => {
  const shards: string[] = [];
  const buffer = await file.arrayBuffer();
  
  for (let i = 0; i < buffer.byteLength; i += CHUNK_SIZE) {
    const chunk = buffer.slice(i, i + CHUNK_SIZE);
    
    // Simulate encryption by creating a mock hash/hex of the chunk
    // Real implementation: encrypt with Web Crypto API and store securely
    const shardId = await generateHash(chunk);
    shards.push(shardId);
    
    // Store in IndexedDB for the MVP
    await storeShardInDB(shardId, chunk);
  }
  
  return shards;
};

/**
 * Basic Web Crypto hash generation for a chunk of data.
 */
export const generateHash = async (data: ArrayBuffer): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b: number) => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hashHex;
};

/**
 * Simple IndexedDB wrapper for storing file chunks (shards) locally on device.
 */
export const storeShardInDB = (id: string, data: ArrayBuffer): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MiniDriveDB', 1);
    
    request.onupgradeneeded = (e: Event): void => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('shards')) {
        db.createObjectStore('shards');
      }
    };
    
    request.onsuccess = (e: Event): void => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction('shards', 'readwrite');
      const store = tx.objectStore('shards');
      store.put(data, id);
      tx.oncomplete = (): void => resolve();
      tx.onerror = (): void => reject(tx.error);
    };
    
    request.onerror = (): void => reject(request.error);
  });
};

/**
 * Gets all shard IDs currently stored in IndexedDB.
 */
export const getAllStoredShardIds = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MiniDriveDB', 1);
    request.onsuccess = (e: Event): void => {
      const db = (e.target as IDBOpenDBRequest).result;
      // If store doesn't exist, return empty
      if (!db.objectStoreNames.contains('shards')) {
        resolve([]);
        return;
      }
      const tx = db.transaction('shards', 'readonly');
      const store = tx.objectStore('shards');
      const getAllKeys = store.getAllKeys();
      
      getAllKeys.onsuccess = (): void => resolve(getAllKeys.result as string[]);
      getAllKeys.onerror = (): void => reject(getAllKeys.error);
    };
    request.onerror = (): void => reject(request.error);
  });
};
