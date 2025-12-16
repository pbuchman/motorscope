/**
 * React internals utilities for content scripts
 * Used to extract data from React fiber tree (OTOMOTO uses React)
 */

export interface ReactFiber {
    memoizedProps?: Record<string, unknown>;
    pendingProps?: Record<string, unknown>;
    child?: ReactFiber;
    sibling?: ReactFiber;
    return?: ReactFiber;
}

export type SearchDirection = 'up' | 'down';

/**
 * Get React fiber from DOM element
 */
export const getReactFiber = (element: HTMLElement): ReactFiber | null => {
    const key = Object.keys(element).find(k =>
        k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
    );
    return key ? (element as unknown as Record<string, ReactFiber>)[key] : null;
};

export interface FiberSearchOptions {
    /** Maximum depth to traverse */
    maxDepth?: number;
    /** Direction to search */
    direction: SearchDirection;
    /** Predicate to check if a value is found */
    predicate: (props: Record<string, unknown>) => unknown | null;
}

/**
 * Search React fiber tree for a value matching predicate
 */
export const searchFiber = (
    fiber: ReactFiber | null | undefined,
    options: FiberSearchOptions,
    currentDepth = 0,
): unknown | null => {
    const {maxDepth = 30, direction, predicate} = options;

    if (!fiber || currentDepth > maxDepth) return null;

    const props = (fiber.memoizedProps || fiber.pendingProps || {}) as Record<string, unknown>;
    const found = predicate(props);
    if (found !== null && found !== undefined) {
        return found;
    }

    if (direction === 'down') {
        const fromChild = searchFiber(fiber.child, options, currentDepth + 1);
        if (fromChild !== null && fromChild !== undefined) return fromChild;

        const fromSibling = searchFiber(fiber.sibling, options, currentDepth + 1);
        if (fromSibling !== null && fromSibling !== undefined) return fromSibling;
    } else {
        const fromParent = searchFiber(fiber.return, options, currentDepth + 1);
        if (fromParent !== null && fromParent !== undefined) return fromParent;
    }

    return null;
};


