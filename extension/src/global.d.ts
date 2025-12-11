// Global type declarations for Chrome Extension APIs
declare namespace chrome {
    export namespace runtime {
        export function sendMessage(message: any): Promise<any>;

        export function openOptionsPage(): void;

        export function getURL(path: string): string;

        export function getManifest(): {
            oauth2?: {
                client_id: string;
                scopes: string[];
            };
            [key: string]: any;
        };

        export const onInstalled: {
            addListener(callback: () => void): void;
        };
        export const onStartup: {
            addListener(callback: () => void): void;
        };
        export const onMessage: {
            addListener(callback: (request: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void;
            removeListener(callback: (request: any) => void): void;
        };
        export const lastError: { message: string } | undefined;
    }

    export namespace tabs {
        export interface Tab {
            id?: number;
            url?: string;
            title?: string;
            active?: boolean;
        }

        export function query(
            queryInfo: { active?: boolean; currentWindow?: boolean },
            callback: (tabs: Tab[]) => void
        ): void;

        export function create(
            createProperties: { url?: string; active?: boolean }
        ): void;
    }

    export namespace scripting {
        export interface InjectionResult {
            result?: any;
        }

        export function executeScript(
            injection: {
                target: { tabId: number };
                func: () => any;
            },
            callback?: (results: InjectionResult[]) => void
        ): void;
    }

    export namespace storage {
        export namespace local {
            export function get(
                keys: string | string[] | null,
                callback: (result: { [key: string]: any }) => void
            ): void;

            export function set(
                items: { [key: string]: any },
                callback?: () => void
            ): void;

            export function remove(
                keys: string | string[],
                callback?: () => void
            ): void;
        }
        export namespace session {
            export function get(
                keys: string | string[] | null,
                callback: (result: { [key: string]: any }) => void
            ): void;

            export function set(
                items: { [key: string]: any },
                callback?: () => void
            ): void;

            export function remove(
                keys: string | string[],
                callback?: () => void
            ): void;
        }
        export const onChanged: {
            addListener(
                callback: (
                    changes: { [key: string]: { oldValue?: any; newValue?: any } },
                    namespace: string
                ) => void
            ): void;
            removeListener(
                callback: (
                    changes: { [key: string]: any },
                    namespace: string
                ) => void
            ): void;
        };
    }

    export namespace alarms {
        export interface Alarm {
            name: string;
            scheduledTime: number;
            periodInMinutes?: number;
        }

        export function create(
            name: string,
            alarmInfo: { delayInMinutes?: number; periodInMinutes?: number; when?: number }
        ): void;

        export function clear(name: string): Promise<boolean>;

        export function get(name: string): Promise<Alarm | undefined>;

        export function getAll(): Promise<Alarm[]>;

        export const onAlarm: {
            addListener(callback: (alarm: Alarm) => void): void;
        };
    }

    export namespace notifications {
        export interface NotificationOptions {
            type: 'basic' | 'image' | 'list' | 'progress';
            iconUrl: string;
            title: string;
            message: string;
            priority?: number;
            buttons?: { title: string }[];
        }

        export function create(
            notificationId: string | undefined,
            options: NotificationOptions,
            callback?: (notificationId: string) => void
        ): void;
        export function create(
            options: NotificationOptions,
            callback?: (notificationId: string) => void
        ): void;
    }

    export namespace identity {
        export interface TokenDetails {
            interactive?: boolean;
            account?: { id: string };
            scopes?: string[];
        }

        export function getAuthToken(
            details: TokenDetails,
            callback: (token?: string) => void
        ): void;

        export function getRedirectURL(path?: string): string;

        export function launchWebAuthFlow(
            details: { url: string; interactive?: boolean },
            callback: (responseUrl?: string) => void
        ): void;

        export function removeCachedAuthToken(
            details: { token: string },
            callback?: () => void
        ): void;

        export function clearAllCachedAuthTokens(callback?: () => void): void;
    }
}
