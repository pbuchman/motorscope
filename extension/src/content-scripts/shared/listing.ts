/// <reference lib="dom" />
import {normalizeUrl} from './url';

export interface ListingDomConfig {
    selectors: {
        article: string;
        listingLink: string;
        favoritesButton: string;
        iconContainer: string;
    };
    dataAttributes: {
        processed: string;
        tracked: string;
    };
    cssClasses: {
        trackedIcon: string;
    };
}

export interface ListingDependencies {
    log: (...args: unknown[]) => void;
    buildIcon: (listingUrl: string) => HTMLButtonElement;
}

/**
 * Normalize tracked URLs for efficient lookups.
 */
export const normalizeTrackedUrls = (urls: string[]): Set<string> => {
    return new Set(urls.map(normalizeUrl));
};

/**
 * Check whether a URL exists in tracked set after normalization.
 */
export const isUrlTracked = (
    url: string,
    trackedUrls: ReadonlySet<string>,
): boolean => trackedUrls.has(normalizeUrl(url));

/**
 * Build MotorScope icon button matching OTOMOTO structure.
 */
export const createMotorScopeIcon = (
    listingUrl: string,
    deps: {
        getIconUrl: () => string;
        onClick: (event: MouseEvent) => void;
    },
): HTMLButtonElement => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Otwórz w MotorScope');
    button.setAttribute('tabindex', '0');
    button.className = 'motorscope-tracked-icon ooa-xaeen7';
    button.setAttribute('data-button-variant', 'flat');

    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'n-button-svg-wrapper n-button-svg-wrapper-pre';
    svgWrapper.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.src = deps.getIconUrl();
    img.width = 30;
    img.height = 30;
    img.alt = 'MotorScope';
    img.style.cssText = 'display: block;';

    svgWrapper.appendChild(img);

    const textWrapper = document.createElement('span');
    textWrapper.className = 'n-button-text-wrapper';

    button.appendChild(svgWrapper);
    button.appendChild(textWrapper);

    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        deps.onClick(event);
    });

    return button;
};

const hasProcessedAttribute = (article: Element, attr: string): boolean => {
    return article.hasAttribute(attr);
};

/**
 * Process single OTOMOTO article.
 */
export const processArticleElement = (
    article: Element,
    trackedUrls: ReadonlySet<string>,
    config: ListingDomConfig,
    deps: ListingDependencies,
): boolean => {
    if (hasProcessedAttribute(article, config.dataAttributes.processed)) {
        return false;
    }

    const link = article.querySelector(config.selectors.listingLink) as HTMLAnchorElement | null;
    if (!link?.href) {
        return false;
    }

    article.setAttribute(config.dataAttributes.processed, 'true');

    if (!isUrlTracked(link.href, trackedUrls)) {
        return false;
    }

    article.setAttribute(config.dataAttributes.tracked, 'true');

    const favoritesButton = article.querySelector(config.selectors.favoritesButton);
    if (!favoritesButton) {
        deps.log('Favorites button not found for tracked listing');
        return false;
    }

    const favoritesWrapper = favoritesButton.closest(config.selectors.iconContainer);
    if (!favoritesWrapper) {
        deps.log('Favorites wrapper not found for tracked listing');
        return false;
    }

    if (favoritesWrapper.querySelector(`.${config.cssClasses.trackedIcon}`)) {
        return false;
    }

    const icon = deps.buildIcon(link.href);
    favoritesWrapper.appendChild(icon);
    deps.log('Added icon for tracked listing:', link.href);
    return true;
};

type RootQuery = Document | Element;

/**
 * Process all matching articles inside root node.
 */
export const processArticles = (
    root: RootQuery,
    trackedUrls: ReadonlySet<string>,
    config: ListingDomConfig,
    deps: ListingDependencies,
): number => {
    const articles = root.querySelectorAll(config.selectors.article);
    let added = 0;

    articles.forEach(article => {
        if (processArticleElement(article, trackedUrls, config, deps)) {
            added += 1;
        }
    });

    return added;
};

/**
 * Reset processed attributes and remove injected icons.
 */
export const resetArticleProcessingState = (
    root: RootQuery,
    config: ListingDomConfig,
): void => {
    root.querySelectorAll(`[${config.dataAttributes.processed}]`).forEach(el => {
        el.removeAttribute(config.dataAttributes.processed);
        el.removeAttribute(config.dataAttributes.tracked);
        el.querySelector(`.${config.cssClasses.trackedIcon}`)?.remove();
    });
};

