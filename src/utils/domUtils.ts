/**
 * DOM Utilities — Briques fondamentales d'interaction avec le DOM LinkedIn.
 * Implémentation complète dans l'Issue #3.
 */

/**
 * Attend l'apparition d'un élément dans le DOM via MutationObserver.
 * @param selector - Sélecteur CSS de l'élément à attendre
 * @param timeout - Délai maximum en ms (défaut: 10000)
 */
export function waitForElement(selector: string, timeout = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver((_mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElement: timeout après ${timeout}ms pour "${selector}"`));
    }, timeout);
  });
}

/**
 * Extrait l'URN LinkedIn d'un élément de profil.
 * Stub — implémentation complète dans l'Issue #3.
 */
export function getUrnFromProfile(_element?: Element): string | null {
  // TODO: Issue #3 — Extraction URN depuis data-* ou URL canonique
  return null;
}
