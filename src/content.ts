/**
 * Content Script — Moteur d'exécution.
 * S'exécute dans le contexte de la page LinkedIn.
 *
 * Utilise la couche storage (Issue #2) pour lire/écrire l'état.
 * La logique métier complète (machine à états) sera implémentée dans l'Issue #4.
 */

import { getState, initStorage, type CampaignState } from './core/storage';

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
      const { active } = changes.etatCampagne.newValue as CampaignState;
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
async function bootstrap(): Promise<void> {
  // Initialise le storage avec les defaults si premier lancement
  await initStorage();

  const state = await getState();
  log('Content script chargé sur', window.location.href);
  log('État campagne:', JSON.stringify(state.etatCampagne));

  if (isSearchPage()) {
    log('Page de recherche détectée ✓');
  }

  watchCampaignState();
}

bootstrap();
