// Content script for otomoto.pl
// Auto-reveals VIN number for logged-in users

const log = (...args: unknown[]) => {
  console.log('[MotoTracker:Otomoto]', ...args);
};

const SELECTORS = {
  loginButton: '[data-testid="usermenu-link-login"]',
  loginButtonText: 'span.n-button-text-wrapper',
  vinContainer: '[data-testid="vin"]',
  vinRevealButton: '[data-testid="advert-vin"] button',
  vinDisplay: '[data-testid="advert-vin"] p',
};

/**
 * Check if user is logged in by verifying login button is NOT present
 */
const isUserLoggedIn = (): boolean => {
  const loginButton = document.querySelector(SELECTORS.loginButton);

  if (!loginButton) {
    log('No login button - user appears to be logged in');
    return true;
  }

  const buttonText = loginButton.querySelector(SELECTORS.loginButtonText);
  return !buttonText?.textContent?.includes('Zaloguj się');
};

/**
 * Check if VIN is already revealed
 */
const isVinRevealed = (): boolean => {
  const vinDisplay = document.querySelector(SELECTORS.vinDisplay);
  return vinDisplay !== null && !vinDisplay.closest('button');
};

/**
 * Find the "Wyświetl VIN" button
 */
const findRevealButton = (): HTMLButtonElement | null => {
  let button = document.querySelector<HTMLButtonElement>(SELECTORS.vinRevealButton);
  if (button?.textContent?.includes('Wyświetl VIN')) {
    return button;
  }

  const vinContainer = document.querySelector(SELECTORS.vinContainer);
  if (vinContainer) {
    const buttons = vinContainer.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.includes('Wyświetl VIN')) {
        return btn as HTMLButtonElement;
      }
    }
  }

  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    if (btn.textContent?.includes('Wyświetl VIN')) {
      return btn as HTMLButtonElement;
    }
  }

  return null;
};

/**
 * Click the "Wyświetl VIN" button to reveal VIN
 */
const revealVin = (): boolean => {
  const revealButton = findRevealButton();
  if (!revealButton) return false;
  revealButton.click();
  return true;
};

/**
 * Main function to check and reveal VIN
 */
const checkAndRevealVin = (): void => {
  if (!window.location.href.includes('/oferta/')) return;

  const vinContainer = document.querySelector(SELECTORS.vinContainer);
  log('VIN container found:', !!vinContainer);

  if (!vinContainer) return;

  if (isVinRevealed()) {
    const vinDisplay = document.querySelector(SELECTORS.vinDisplay);
    log('SUCCESS! VIN revealed:', vinDisplay?.textContent);
    return;
  }

  if (!isUserLoggedIn()) return;

  const clicked = revealVin();

  if (clicked) {
    setTimeout(() => {
      const vinDisplay = document.querySelector(SELECTORS.vinDisplay);
      if (vinDisplay && !vinDisplay.closest('button')) {
        log('SUCCESS! VIN revealed:', vinDisplay.textContent);
      } else {
        setTimeout(() => {
          const vinDisplay2 = document.querySelector(SELECTORS.vinDisplay);
          if (vinDisplay2 && !vinDisplay2.closest('button')) {
            log('SUCCESS! VIN revealed:', vinDisplay2.textContent);
          }
        }, 2000);
      }
    }, 1000);
  }
};

/**
 * Initialize the content script
 */
const init = (): void => {
  const runCheck = () => setTimeout(checkAndRevealVin, 2000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runCheck);
  } else {
    runCheck();
  }

  let checkTimeout: number | null = null;

  const observer = new MutationObserver(() => {
    if (checkTimeout) clearTimeout(checkTimeout);
    checkTimeout = window.setTimeout(() => {
      const vinContainer = document.querySelector(SELECTORS.vinContainer);
      if (vinContainer && !isVinRevealed()) {
        checkAndRevealVin();
      }
    }, 1000);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
};

init();

