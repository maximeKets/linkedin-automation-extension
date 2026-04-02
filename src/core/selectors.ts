/**
 * LinkedIn Selectors — Centralisation des sélecteurs CSS pour le Content Script.
 * Sujet à changement par LinkedIn (SPA React).
 */

export const SELECTORS = {
  // ─── Recherche ──────────────────────────────────────────
  /** Cartes de résultats de profil dans la recherche */
  SEARCH_RESULT_CARD: '.reusable-search__result-container',

  /** Bouton "Se connecter" sur une carte de résultat */
  CONNECT_BUTTON_FROM_CARD: 'button[aria-label^="Se connecter"], button[aria-label^="Connect"]',

  /** Nom du profil sur une carte de résultat */
  PROFILE_NAME: '.entity-result__title-text a span[aria-hidden="true"]',

  /** Poste/Titre sur une carte de résultat */
  PROFILE_TITLE: '.entity-result__primary-subtitle',

  /** Bouton "Suivant" de la pagination */
  NEXT_PAGE_BUTTON: 'button[aria-label="Suivant"], button[aria-label="Next"]',

  // ─── Modales ────────────────────────────────────────────
  /** Modale générique Artdeco */
  MODAL_CONTAINER: '.artdeco-modal',

  /** Croix de fermeture d'une modale */
  MODAL_CLOSE_BUTTON: 'button[aria-label="Fermer"], button[aria-label="Dismiss"]',

  // ─── Modale d'invitation ────────────────────────────────
  /** Bouton "Ajouter une note" dans la modale de connexion */
  ADD_NOTE_BUTTON: 'button[aria-label="Ajouter une note"], button[aria-label="Add a note"]',

  /** Champ de texte pour la note personnalisée */
  NOTE_TEXT_AREA: 'textarea[name="message"]',

  /** Bouton "Envoyer" de la modale d'invitation */
  SEND_INVITATION_BUTTON: 'button[aria-label="Envoyer maintenant"], button[aria-label="Send now"]',

  // ─── Détection d'anomalies ──────────────────────────────
  /** Modale "Email requis" (souvent contient un input email) */
  EMAIL_REQUIRED_INPUT: 'input[name="email"]',

  /** Message de limite hebdomadaire atteinte */
  WEEKLY_LIMIT_MESSAGE: '.ip-fuse-limit-alert__header, [class*="limit-reached"]',
} as const;
