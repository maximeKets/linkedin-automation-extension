/**
 * Content Script — Moteur d'exécution (Machine à états).
 * Closes #4
 *
 * Cet automate parcourt la page de recherche LinkedIn, gère les modales
 * et envoie des invitations personnalisées en respectant les limites du storage.
 */

import {
  getState,
  initStorage,
  updateCampaignState,
  incrementDailyCounter,
  addToHistory,
  addToFailures,
  stopCampaign,
  type CampaignState,
  type Config,
} from './core/storage';

import {
  waitForElement,
  waitForElements,
  waitForElementRemoval,
  getUrnFromProfile,
  clickElement,
  sleep,
  randomBetween,
} from './utils/domUtils';

import { injectTextInReact } from './utils/reactUtils';
import { SELECTORS } from './core/selectors';

const LOG_TAG = '[Engine]';

/**
 * Automate principal.
 */
class ExecutionEngine {
  private active = false;
  private config: Config | null = null;
  private isProcessing = false;

  /**
   * Démarre l'écouteur de changements de storage.
   */
  public async init(): Promise<void> {
    await initStorage();
    const state = await getState();
    this.active = state.etatCampagne.active;
    this.config = state.config;

    console.log(`${LOG_TAG} Initialisé. Actif: ${this.active}`);

    // Surveiller les changements d'activation
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.etatCampagne?.newValue) {
        const newState = changes.etatCampagne.newValue as CampaignState;
        if (newState.active !== this.active) {
          this.active = newState.active;
          console.log(`${LOG_TAG} État changé: ${this.active ? 'DÉMARRAGE' : 'ARRÊT'}`);
          if (this.active && !this.isProcessing) {
            this.run();
          }
        }
      }
      if (changes.config?.newValue) {
        this.config = changes.config.newValue as Config;
      }
    });

    // Démarrage auto si déjà actif au chargement
    if (this.active) {
      this.run();
    }
  }

  /**
   * Boucle principale de l'automate.
   */
  private async run(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.active) {
        console.log(`${LOG_TAG} Début du cycle de scan...`);
        
        // 1. Attendre les résultats de recherche
        const cards = await this.getScanTargets();
        if (cards.length === 0) {
          console.log(`${LOG_TAG} Aucun profil trouvé sur cette page.`);
          const hasNext = await this.goToNextPage();
          if (!hasNext) {
            console.log(`${LOG_TAG} Fin des résultats. Arrêt.`);
            await stopCampaign();
            break;
          }
          continue;
        }

        // 2. Traiter chaque profil de la page
        for (const card of cards) {
          if (!this.active) break;

          const urn = getUrnFromProfile(card);
          if (!urn) continue;

          // Vérifier si déjà traité
          const state = await getState();
          if (state.historiqueInvits.includes(urn) || state.echecsInvits.includes(urn)) {
            continue;
          }

          // Vérifier quota
          if (state.etatCampagne.profilsTraitesAujourdhui >= state.config.maxParJour) {
            console.log(`${LOG_TAG} Quota journalier atteint.`);
            await stopCampaign();
            return;
          }

          // Pause humanisée avant action
          const pause = randomBetween(
            (this.config?.pauseMin || 30) * 1000,
            (this.config?.pauseMax || 60) * 1000
          );
          console.log(`${LOG_TAG} Pause de ${Math.round(pause / 1000)}s avant ${urn}...`);
          await sleep(pause);

          if (!this.active) break;

          // 3. Exécuter le flux d'invitation
          const name = this.extractName(card);
          await this.processProfile(card, urn, name);
        }

        // 4. Passer à la page suivante si on est toujours actif
        if (this.active) {
          await this.goToNextPage();
        }
      }
    } catch (error) {
      console.error(`${LOG_TAG} Erreur fatale dans le moteur:`, error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Récupère les cartes de profil à traiter.
   */
  private async getScanTargets(): Promise<Element[]> {
    try {
      return await waitForElements(SELECTORS.SEARCH_RESULT_CARD, 1, 5000);
    } catch {
      return [];
    }
  }

  /**
   * Gère le flux complet pour un profil donné.
   */
  private async processProfile(card: Element, urn: string, name: string): Promise<void> {
    console.log(`${LOG_TAG} Traitment de ${urn} (${name})...`);

    try {
      // Trouver le bouton "Se connecter"
      const connectBtn = card.querySelector(SELECTORS.CONNECT_BUTTON_FROM_CARD);
      if (!connectBtn) {
        console.log(`${LOG_TAG} Bouton "Se connecter" non trouvé pour ${urn} (déjà connecté ?)`);
        await addToHistory(urn); // On skip
        return;
      }

      // 1. Clic "Se connecter"
      await clickElement(connectBtn);

      // 2. Détecter la modale (Email requis vs Standard vs Limite)
      const modalType = await this.detectModalType();

      if (modalType === 'LIMIT_REACHED') {
        console.warn(`${LOG_TAG} Limite hebdomadaire LinkedIn atteinte !`);
        await stopCampaign();
        return;
      }

      if (modalType === 'EMAIL_REQUIRED') {
        console.log(`${LOG_TAG} Email requis pour ${urn}. Mapping vers échec.`);
        await this.closeModal();
        await addToFailures(urn);
        return;
      }

      if (modalType === 'STANDARD') {
        await this.handleStandardInvitation(urn, name);
      } else {
        throw new Error('Type de modale inconnu ou timeout');
      }

    } catch (error) {
      console.error(`${LOG_TAG} Échec pour ${urn}:`, error);
      await addToFailures(urn);
      await this.closeModal();
    }
  }

  /**
   * Détecte le type de modale apparue après le clic.
   */
  private async detectModalType(): Promise<'STANDARD' | 'EMAIL_REQUIRED' | 'LIMIT_REACHED' | 'UNKNOWN'> {
    return new Promise((resolve) => {
      const check = () => {
        if (document.querySelector(SELECTORS.WEEKLY_LIMIT_MESSAGE)) return 'LIMIT_REACHED';
        if (document.querySelector(SELECTORS.EMAIL_REQUIRED_INPUT)) return 'EMAIL_REQUIRED';
        if (document.querySelector(SELECTORS.ADD_NOTE_BUTTON)) return 'STANDARD';
        if (document.querySelector(SELECTORS.NOTE_TEXT_AREA)) return 'STANDARD'; // Déjà sur la note ?
        return null;
      };

      const found = check();
      if (found) return resolve(found);

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const res = check();
        if (res) {
          clearInterval(interval);
          resolve(res);
        } else if (attempts > 30) { // 3 secondes
          clearInterval(interval);
          resolve('UNKNOWN');
        }
      }, 100);
    });
  }

  /**
   * Gère le remplissage et l'envoi de l'invitation standard.
   */
  private async handleStandardInvitation(urn: string, name: string): Promise<void> {
    // 1. Clic sur "Ajouter une note" si nécessaire
    const addNoteBtn = document.querySelector(SELECTORS.ADD_NOTE_BUTTON);
    if (addNoteBtn) {
      await clickElement(addNoteBtn);
      await sleep(randomBetween(500, 1000));
    }

    // 2. Injection du texte
    const textarea = await waitForElement(SELECTORS.NOTE_TEXT_AREA, 3000) as HTMLTextAreaElement;
    const message = this.buildMessage(name);
    
    console.log(`${LOG_TAG} Injection du message...`);
    injectTextInReact(textarea, message);
    await sleep(randomBetween(800, 1500));

    // 3. Envoi
    const sendBtn = document.querySelector(SELECTORS.SEND_INVITATION_BUTTON);
    if (!sendBtn) throw new Error('Bouton "Envoyer" non trouvé');

    await clickElement(sendBtn);
    
    // 4. Attendre confirmation (fermeture modale)
    await waitForElementRemoval(SELECTORS.MODAL_CONTAINER, 5000);
    
    console.log(`${LOG_TAG} Invitation envoyée avec succès à ${urn}`);
    await addToHistory(urn);
    await incrementDailyCounter();
  }

  /**
   * Tente d'extraire le prénom d'une carte de résultat.
   */
  private extractName(card: Element): string {
    const nameEl = card.querySelector(SELECTORS.PROFILE_NAME);
    if (!nameEl) return '';

    const fullName = nameEl.textContent?.trim() || '';
    // On prend le premier mot (prénom)
    return fullName.split(' ')[0] || '';
  }

  /**
   * Construit le message avec remplacement du {nom}.
   */
  private buildMessage(name: string): string {
    const raw = this.config?.messageTemplate || 'Bonjour {nom}, j\'aimerais rejoindre votre réseau.';
    // Si on a un nom, on l'utilise, sinon on enlève le marqueur proprement
    const result = name 
      ? raw.replace('{nom}', name) 
      : raw.replace('{nom}', '').replace('  ', ' ');

    return result.trim();
  }

  /**
   * Ferme toute modale ouverte via la croix.
   */
  private async closeModal(): Promise<void> {
    const closeBtn = document.querySelector(SELECTORS.MODAL_CLOSE_BUTTON);
    if (closeBtn) {
      await clickElement(closeBtn);
      await sleep(500);
    }
  }

  /**
   * Gère la pagination vers la page suivante.
   */
  private async goToNextPage(): Promise<boolean> {
    const nextBtn = document.querySelector(SELECTORS.NEXT_PAGE_BUTTON) as HTMLButtonElement;
    if (!nextBtn || nextBtn.disabled) return false;

    console.log(`${LOG_TAG} Passage à la page suivante...`);
    await clickElement(nextBtn);
    
    // Attendre que l'URL change ou que les nouveaux résultats arrivent
    await sleep(2000);
    try {
      await waitForElements(SELECTORS.SEARCH_RESULT_CARD, 1, 10000);
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Lancement ───────────────────────────────────────────
const engine = new ExecutionEngine();
engine.init();
