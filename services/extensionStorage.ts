const get = async <T>(key: string): Promise<T | undefined> => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result[key] as T | undefined);
      });
    });
  }

  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : undefined;
  } catch (error) {
    return Promise.reject(error);
  }
};

const set = async (key: string, value: unknown): Promise<void> => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

export const extensionStorage = { get, set };

