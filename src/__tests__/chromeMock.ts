/**
 * Mock de chrome.storage.local pour les tests unitaires.
 * Simule le comportement de l'API Chrome Storage.
 */

type StorageData = Record<string, unknown>;
type ChangeListener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
) => void;

let store: StorageData = {};
const listeners: ChangeListener[] = [];

export const chromeMock = {
  storage: {
    local: {
      get(keys: string | string[] | null, callback: (result: StorageData) => void): void {
        if (keys === null) {
          callback({ ...store });
        } else {
          const keyList = Array.isArray(keys) ? keys : [keys];
          const result: StorageData = {};
          for (const key of keyList) {
            if (key in store) {
              result[key] = store[key];
            }
          }
          callback(result);
        }
      },
      set(items: StorageData, callback?: () => void): void {
        const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: store[key], newValue: value };
          store[key] = value;
        }
        // Notify listeners
        for (const listener of listeners) {
          listener(changes);
        }
        callback?.();
      },
      clear(callback?: () => void): void {
        store = {};
        callback?.();
      },
    },
    onChanged: {
      addListener(fn: ChangeListener): void {
        listeners.push(fn);
      },
      removeListener(fn: ChangeListener): void {
        const idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      },
    },
  },
};

/**
 * Réinitialise le store pour chaque test.
 */
export function resetStore(): void {
  store = {};
  listeners.length = 0;
}

/**
 * Accès direct au store interne (pour assertions).
 */
export function getStoreSnapshot(): StorageData {
  return { ...store };
}
