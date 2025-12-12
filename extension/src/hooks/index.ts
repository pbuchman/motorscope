/**
 * Hooks Index
 *
 * Central export point for all custom hooks.
 */

// Chrome extension messaging hooks
export {
    isChromeExtension,
    hasChromeStorage,
    sendMessage,
    useMessageListener,
    useStorageListener,
    useChromeMessaging,
    MessageTypes,
} from './useChromeMessaging';
export type {MessageType, ExtensionMessage} from './useChromeMessaging';

// Chrome tab and page hooks
export {useCurrentTab} from './useCurrentTab';
export {usePageContent} from './usePageContent';
export {useExtensionNavigation} from './useExtensionNavigation';

