/**
 * DOM Utilities — Briques fondamentales d'interaction avec le DOM LinkedIn.
 * Closes #3
 *
 * LinkedIn est une SPA React avec du lazy-loading intensif.
 * Ces utilitaires gerent l'asynchronicite du DOM de maniere deterministe.
 */

// ─── Selecteurs LinkedIn connus ───────────────────────────

/** Patterns connus pour extraire les URN depuis le DOM LinkedIn. */
const URN_PATTERNS = {
  /** Attribut data contenant l'URN directement */
  DATA_URN: /urn:li:fsd_profile:[A-Za-z0-9_-]+/,
  /** URL canonique /in/username/ */
  CANONICAL_URL: /\/in\/([A-Za-z0-9\u00C0-\u024F._%-]+)\/?/,
  /** URN dans les href des liens de profil */
  HREF_URN: /\/in\/([A-Za-z0-9\u00C0-\u024F._%-]+)/,
} as const;

// ─── waitForElement ───────────────────────────────────────

/**
 * Attend l'apparition d'un element dans le DOM via MutationObserver.
 * Encapsule un MutationObserver dans une Promise pour attendre
 * l'apparition d'elements DOM (lazy-loading) sans bloquer le thread.
 *
 * @param selector - Selecteur CSS de l'element a attendre
 * @param timeout - Delai maximum en ms (defaut: 10000)
 * @returns L'element trouve
 * @throws Error si timeout depasse
 */
export function waitForElement(selector: string, timeout = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    // Verifier si l'element existe deja
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver((_mutations, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timeoutId);
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElement: timeout apres ${timeout}ms pour "${selector}"`));
    }, timeout);
  });
}

/**
 * Attend que PLUSIEURS elements apparaissent (au moins `minCount`).
 * Utile pour attendre le chargement des cartes de profil sur la page de recherche.
 *
 * @param selector - Selecteur CSS
 * @param minCount - Nombre minimum d'elements attendus (defaut: 1)
 * @param timeout - Delai maximum en ms (defaut: 10000)
 */
export function waitForElements(
  selector: string,
  minCount = 1,
  timeout = 10000
): Promise<Element[]> {
  return new Promise((resolve, reject) => {
    const check = () => {
      const els = document.querySelectorAll(selector);
      if (els.length >= minCount) return Array.from(els);
      return null;
    };

    const existing = check();
    if (existing) {
      resolve(existing);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver((_mutations, obs) => {
      const found = check();
      if (found) {
        clearTimeout(timeoutId);
        obs.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(
        `waitForElements: timeout apres ${timeout}ms pour "${selector}" (min: ${minCount})`
      ));
    }, timeout);
  });
}

/**
 * Attend la disparition d'un element du DOM.
 * Utile pour confirmer la fermeture d'une modale.
 *
 * @param selector - Selecteur CSS de l'element a attendre la disparition
 * @param timeout - Delai maximum en ms (defaut: 5000)
 */
export function waitForElementRemoval(selector: string, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(selector)) {
      resolve();
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver((_mutations, obs) => {
      if (!document.querySelector(selector)) {
        clearTimeout(timeoutId);
        obs.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElementRemoval: timeout apres ${timeout}ms pour "${selector}"`));
    }, timeout);
  });
}

// ─── getUrnFromProfile ────────────────────────────────────

/**
 * Extrait l'URN LinkedIn d'un element de profil.
 * Strategie multi-niveaux :
 *   1. Cherche un URN direct dans les attributs data-* de l'element
 *   2. Cherche un URN dans les liens <a> enfants
 *   3. Extrait l'URL canonique /in/username/ comme fallback
 *   4. Fallback sur l'URL de la page courante
 *
 * JAMAIS le nom comme identifiant (risque de collision).
 *
 * @param element - Element DOM du profil (carte de recherche, etc.)
 * @returns L'URN ou l'URL canonique, ou null si non trouve
 */
export function getUrnFromProfile(element?: Element): string | null {
  if (element) {
    // Strategie 1 : URN direct dans les attributs data-*
    const urnFromData = extractUrnFromDataAttributes(element);
    if (urnFromData) return urnFromData;

    // Strategie 2 : URN dans le HTML interne (data-chameleon-result-urn, etc.)
    const outerHtml = element.outerHTML;
    const urnMatch = outerHtml.match(URN_PATTERNS.DATA_URN);
    if (urnMatch) return urnMatch[0];

    // Strategie 3 : URL canonique depuis les liens <a>
    const canonicalUrl = extractCanonicalUrlFromLinks(element);
    if (canonicalUrl) return canonicalUrl;
  }

  // Strategie 4 : Fallback sur l'URL courante
  const pageMatch = window.location.pathname.match(URN_PATTERNS.CANONICAL_URL);
  if (pageMatch) return `/in/${pageMatch[1]}/`;

  return null;
}

/**
 * Cherche un URN dans les attributs data-* d'un element et ses parents.
 */
function extractUrnFromDataAttributes(element: Element): string | null {
  let current: Element | null = element;

  while (current) {
    // Parcourir tous les attributs data-*
    for (const attr of Array.from(current.attributes)) {
      if (attr.name.startsWith('data-')) {
        const match = attr.value.match(URN_PATTERNS.DATA_URN);
        if (match) return match[0];
      }
    }
    // Remonter au parent (max 5 niveaux pour limiter la traversee)
    current = current.parentElement;
    if (current === document.body) break;
  }

  return null;
}

/**
 * Extrait l'URL canonique depuis les liens <a> enfants d'un element.
 */
function extractCanonicalUrlFromLinks(element: Element): string | null {
  const links = element.querySelectorAll('a[href*="/in/"]');

  for (const link of Array.from(links)) {
    const href = link.getAttribute('href');
    if (href) {
      const match = href.match(URN_PATTERNS.HREF_URN);
      if (match) return `/in/${match[1]}/`;
    }
  }

  return null;
}

// ─── clickElement ─────────────────────────────────────────

/**
 * Simule un clic humain sur un element avec evenements natifs.
 * Dispatche mousedown, mouseup, click avec des delais aleatoires
 * entre chaque evenement pour simuler un comportement humain.
 *
 * @param element - L'element a cliquer
 */
export async function clickElement(element: Element): Promise<void> {
  const htmlElement = element as HTMLElement;

  // S'assurer que l'element est visible et dans le viewport
  htmlElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(randomBetween(50, 150));

  // Obtenir les coordonnees du centre de l'element
  const rect = htmlElement.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const eventOptions: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  };

  // Dispatch des evenements dans l'ordre naturel
  htmlElement.dispatchEvent(new MouseEvent('mousedown', eventOptions));
  await sleep(randomBetween(30, 80));

  htmlElement.dispatchEvent(new MouseEvent('mouseup', eventOptions));
  await sleep(randomBetween(10, 30));

  htmlElement.dispatchEvent(new MouseEvent('click', eventOptions));
}

/**
 * Clic simple sans humanisation (pour les actions internes rapides).
 */
export function clickElementFast(element: Element): void {
  (element as HTMLElement).click();
}

// ─── Helpers ──────────────────────────────────────────────

/**
 * Pause asynchrone.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retourne un entier aleatoire entre min et max (inclus).
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Scroll la page d'une quantite aleatoire (bruit de fond).
 */
export async function humanScroll(): Promise<void> {
  const scrollAmount = randomBetween(100, 400);
  window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
  await sleep(randomBetween(300, 800));
}
