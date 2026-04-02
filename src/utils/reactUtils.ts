/**
 * React Utilities — Hacks pour interagir avec le Virtual DOM de LinkedIn.
 * Implémentation complète dans l'Issue #3.
 */

/**
 * Injecte du texte dans un input/textarea contrôlé par React.
 * Utilise le setter natif du prototype + événement input synthétique
 * pour tromper le Virtual DOM et activer les boutons d'envoi.
 *
 * @param element - L'input ou textarea cible
 * @param text - Le texte à injecter
 */
export function injectTextInReact(
  element: HTMLInputElement | HTMLTextAreaElement,
  text: string
): void {
  const descriptor =
    element instanceof HTMLTextAreaElement
      ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
      : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  if (descriptor?.set) {
    descriptor.set.call(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
