/**
 * Extension Session Storage
 *
 * Type-safe wrapper around chrome.storage.session for runtime state.
 * Used ONLY for transient runtime state (refresh status, etc.).
 * NOT for settings or persistent data - those come from API.
 */

const get = async <T>(key: string): Promise<T | undefined> => {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        return new Promise((resolve, reject) => {
            chrome.storage.session.get([key], (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(result[key] as T | undefined);
            });
        });
    }

    // Fallback to sessionStorage for development (NOT localStorage)
    try {
        const data = sessionStorage.getItem(key);
        return data ? (JSON.parse(data) as T) : undefined;
    } catch (error) {
        return Promise.reject(error);
    }
};

const set = async (key: string, value: unknown): Promise<void> => {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
        return new Promise((resolve, reject) => {
            chrome.storage.session.set({[key]: value}, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve();
            });
        });
    }

    // Fallback to sessionStorage for development (NOT localStorage)
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
};

export const extensionStorage = {get, set};

