/**
 * Content Script — Moteur d'exécution.
 * S'exécute dans le contexte de la page LinkedIn.
 * Pour l'instant, squelette minimal : log de chargement + écoute du storage.
 *
 * La logique métier complète sera implémentée dans l'Issue #4.
 */

const SCRIPT_TAG = '[LinkedIn Stealth Automator]';

function log(message: string, ...args: unknown[]): void {
  console.debug(`${SCRIPT_TAG} ${message}`, ...args);
}

/**
 * Vérifie qu'on est bien sur une page de recherche LinkedIn.
 */
function isSearchPage(): boolean {
  return window.location.pathname.startsWith('/search/');
}

/**
 * Écoute les changements de l'état de campagne dans le storage.
 * Quand active passe à true, le moteur démarrera (Issue #4).
 */
function watchCampaignState(): void {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.etatCampagne?.newValue) {
      const { active } = changes.etatCampagne.newValue;
      if (active && isSearchPage()) {
        log('Campagne activée — moteur prêt (en attente Issue #4)');
      } else if (active && !isSearchPage()) {
        log('Campagne activée mais pas sur une page de recherche. En attente...');
      } else {
        log('Campagne désactivée.');
      }
    }
  });
}

// ─── Bootstrap ───────────────────────────────────────────
log('Content script chargé sur', window.location.href);

if (isSearchPage()) {
  log('Page de recherche détectée ✓');
}

watchCampaignState();
