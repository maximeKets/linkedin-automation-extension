/**
 * React Utilities — Hacks pour interagir avec le Virtual DOM de LinkedIn.
 * Closes #3
 *
 * LinkedIn utilise React (ou un framework similaire) qui controle les inputs
 * via son Virtual DOM. Les modifications directes de .value ne sont pas
 * detectees par React. Ces utilitaires contournent cette limitation.
 */

// ─── injectTextInReact ────────────────────────────────────

/**
 * Injecte du texte dans un input/textarea controle par React.
 * Utilise le setter natif du prototype + evenement input synthetique
 * pour tromper le Virtual DOM et activer les boutons d'envoi.
 *
 * Technique:
 * 1. Recupere le setter natif via Object.getOwnPropertyDescriptor
 * 2. Appelle le setter natif avec .call(element, text)
 * 3. Dispatche un evenement 'input' synthetique avec bubbles: true
 * 4. Dispatche aussi 'change' pour couvrir les cas ou React ecoute change
 *
 * @param element - L'input ou textarea cible
 * @param text - Le texte a injecter
 * @returns true si l'injection a reussi, false sinon
 */
export function injectTextInReact(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string
): boolean {
  try {
    // Determiner le bon prototype selon le type d'element
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    if (!descriptor?.set) {
      // Fallback : affectation directe (ne fonctionne pas toujours avec React)
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return false;
    }

    // Focus l'element d'abord (requis par certains handlers React)
    element.focus();

    // Utiliser le setter natif pour contourner le Virtual DOM
    descriptor.set.call(element, text);

    // Dispatcher les evenements que React ecoute
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    // Dispatcher aussi un KeyboardEvent pour les handlers onKeyUp
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

    return true;
  } catch {
    return false;
  }
}

// ─── clearReactInput ──────────────────────────────────────

/**
 * Vide un input/textarea controle par React.
 * Utile avant d'injecter un nouveau texte.
 *
 * @param element - L'input ou textarea a vider
 */
export function clearReactInput(
  element: HTMLInputElement | HTMLTextAreaElement
): void {
  injectTextInReact(element, '');
}

// ─── simulateReactClick ───────────────────────────────────

/**
 * Simule un clic sur un bouton React en dispatchant les evenements
 * dans l'ordre attendu par les handlers React.
 * Certains boutons React ne reagissent qu'aux evenements synthetiques
 * avec les bonnes proprietes.
 *
 * @param button - Le bouton a cliquer
 */
export function simulateReactClick(button: HTMLElement): void {
  // React ecoute souvent sur le mousedown ou le pointerdown
  button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

// ─── getReactFiber ────────────────────────────────────────

/**
 * Tente d'acceder au React Fiber Node d'un element DOM.
 * Permet d'inspecter le state/props du composant React.
 * Usage avance — pour debug ou extraction de donnees.
 *
 * @param element - L'element DOM a inspecter
 * @returns L'objet fiber ou null si non trouve
 */
export function getReactFiber(element: Element): Record<string, unknown> | null {
  const fiberKey = Object.keys(element).find(
    (key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
  );

  if (fiberKey) {
    return (element as unknown as Record<string, unknown>)[fiberKey] as Record<string, unknown>;
  }

  return null;
}

/**
 * Extrait les props React d'un element DOM via son Fiber Node.
 *
 * @param element - L'element DOM a inspecter
 * @returns Les props ou null si non accessible
 */
export function getReactProps(element: Element): Record<string, unknown> | null {
  const propsKey = Object.keys(element).find(
    (key) => key.startsWith('__reactProps$')
  );

  if (propsKey) {
    return (element as unknown as Record<string, unknown>)[propsKey] as Record<string, unknown>;
  }

  // Fallback via fiber
  const fiber = getReactFiber(element);
  if (fiber?.memoizedProps) {
    return fiber.memoizedProps as Record<string, unknown>;
  }

  return null;
}
