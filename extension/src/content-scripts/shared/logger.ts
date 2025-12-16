/**
 * Shared logging utility for content scripts
 */

export type LogPrefix = string;

export const createLogger = (prefix: LogPrefix) => {
    return (...args: unknown[]): void => {
        console.log(prefix, ...args);
    };
};

