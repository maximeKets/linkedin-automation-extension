/**
 * Tests d'intégration — LinkedIn Stealth Automator
 * Issue #8
 * 
 * Simule le flux complet : Storage <=> ExecutionEngine <=> DOM
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { chromeMock, resetStore, getStoreSnapshot } from './chromeMock';

// 1. Mock de l'environnement Chrome et des utilitaires
vi.stubGlobal('chrome', chromeMock);

vi.mock('../utils/domUtils', async () => {
  const actual = await vi.importActual<typeof import('../utils/domUtils')>('../utils/domUtils');
  return {
    ...actual,
    waitForElement: vi.fn(),
    waitForElements: vi.fn(),
    waitForElementRemoval: vi.fn(),
    clickElement: vi.fn().mockResolvedValue(undefined),
    sleep: vi.fn().mockResolvedValue(undefined),
    randomDelayHuman: vi.fn().mockResolvedValue(undefined),
    humanScroll: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../utils/reactUtils', () => ({
  injectTextInReact: vi.fn((el, text) => { (el as any).value = text; }),
}));

import { ExecutionEngine } from '../content';
import { waitForElements, waitForElement } from '../utils/domUtils';
import { SELECTORS } from '../core/selectors';

describe('Integration — E2E Flows', () => {
  let engine: ExecutionEngine;

  beforeEach(async () => {
    resetStore();
    document.body.innerHTML = '<div id="root"></div>';
    vi.clearAllMocks();
    
    // Initialiser le storage avec des valeurs par défaut
    chromeMock.storage.local.set({
      config: { 
        maxParJour: 30, 
        pauseMin: 0, 
        pauseMax: 0, 
        messageTemplate: 'Hello {prenom}!',
        officeHours: { start: '00:00', end: '23:59', enabled: true }
      },
      etatCampagne: { active: false, profilsTraitesAujourdhui: 0, dateDernierRun: '' },
      historiqueInvits: [],
      echecsInvits: []
    });

    engine = new ExecutionEngine();
    await engine.init();
  });

  afterEach(() => {
    (engine as any).active = false;
  });

  it('scénario complet : scanne et invite 2 nouveaux profils', async () => {
    // 1. Préparer le DOM réaliste
    document.body.innerHTML = `
      <div class="${SELECTORS.SEARCH_RESULT_CARD.slice(1)}" data-chameleon-result-urn="urn:li:fsd_profile:1">
        <div class="entity-result__title-text">
          <a href="#">
            <span aria-hidden="true">Jean Dupont</span>
          </a>
        </div>
        <div class="entity-result__primary-subtitle">CTO chez Acme</div>
        <button aria-label="Se connecter">Se connecter</button>
      </div>
      <div class="${SELECTORS.SEARCH_RESULT_CARD.slice(1)}" data-chameleon-result-urn="urn:li:fsd_profile:2">
        <div class="entity-result__title-text">
          <a href="#">
            <span aria-hidden="true">Marie Curie</span>
          </a>
        </div>
        <div class="entity-result__primary-subtitle">Scientifique</div>
        <button aria-label="Se connecter">Se connecter</button>
      </div>
    `;

    const cards = Array.from(document.querySelectorAll(SELECTORS.SEARCH_RESULT_CARD));
    vi.mocked(waitForElements).mockResolvedValueOnce(cards);
    vi.mocked(waitForElements).mockResolvedValue([]); // Stop loop after first page

    // Simuler l'apparition de la modale "Standard"
    vi.mocked(waitForElement).mockImplementation((selector) => {
      if (selector === SELECTORS.NOTE_TEXT_AREA) {
        const area = document.createElement('textarea');
        area.name = 'message';
        document.body.appendChild(area);
        return Promise.resolve(area);
      }
      return Promise.reject(new Error('Element not found'));
    });

    // Mock des boutons de la modale
    document.body.insertAdjacentHTML('beforeend', `
       <button aria-label="Ajouter une note">Ajouter une note</button>
       <button aria-label="Envoyer maintenant">Envoyer</button>
       <div class="artdeco-modal">Modale</div>
    `);

    // 2. Lancer la campagne
    chromeMock.storage.local.set({ etatCampagne: { active: true, profilsTraitesAujourdhui: 0, dateDernierRun: '2026-04-02' } });
    
    await new Promise(r => setTimeout(r, 800));

    // 3. Vérifications
    const store = getStoreSnapshot() as any;
    expect(store.etatCampagne.profilsTraitesAujourdhui).toBe(2);
    expect(store.historiqueInvits).toContain('urn:li:fsd_profile:1');
    expect(store.historiqueInvits).toContain('urn:li:fsd_profile:2');
  });

  it('scénario skip : ignore les profils déjà invités', async () => {
    chromeMock.storage.local.set({ 
      historiqueInvits: ['urn:li:fsd_profile:already_invited'],
      etatCampagne: { active: true, profilsTraitesAujourdhui: 0, dateDernierRun: '2026-04-02' }
    });

    document.body.innerHTML = `
      <div class="${SELECTORS.SEARCH_RESULT_CARD.slice(1)}" data-chameleon-result-urn="urn:li:fsd_profile:already_invited">
        <div class="entity-result__title-text"><a><span aria-hidden="true">Déjà</span></a></div>
        <button aria-label="Se connecter">Connect</button>
      </div>
    `;

    vi.mocked(waitForElements).mockResolvedValueOnce(Array.from(document.querySelectorAll(SELECTORS.SEARCH_RESULT_CARD))).mockResolvedValue([]);

    await new Promise(r => setTimeout(r, 300));

    const store = getStoreSnapshot() as any;
    expect(store.etatCampagne.profilsTraitesAujourdhui).toBe(0);
    expect(store.historiqueInvits).toHaveLength(1);
  });

  it('scénario quota : s\'arrête quand la limite journalière est atteinte', async () => {
    chromeMock.storage.local.set({ 
      config: { maxParJour: 1, pauseMin: 0, pauseMax: 0, messageTemplate: 'Hi' },
      etatCampagne: { active: true, profilsTraitesAujourdhui: 1, dateDernierRun: '2026-04-02' }
    });

    document.body.innerHTML = `
      <div class="${SELECTORS.SEARCH_RESULT_CARD.slice(1)}" data-chameleon-result-urn="urn:li:fsd_profile:next">
        <button aria-label="Se connecter">Connect</button>
      </div>
    `;

    vi.mocked(waitForElements).mockResolvedValue(Array.from(document.querySelectorAll(SELECTORS.SEARCH_RESULT_CARD)));

    await new Promise(r => setTimeout(r, 200));

    const store = getStoreSnapshot() as any;
    expect(store.etatCampagne.active).toBe(false);
  });

  it('scénario email : gère l\'échec gracieux si email requis', async () => {
    chromeMock.storage.local.set({ 
      etatCampagne: { active: true, profilsTraitesAujourdhui: 0, dateDernierRun: '2026-04-02' }
    });

    document.body.innerHTML = `
      <div class="${SELECTORS.SEARCH_RESULT_CARD.slice(1)}" data-chameleon-result-urn="urn:li:fsd_profile:restricted">
        <div class="entity-result__title-text"><a><span aria-hidden="true">Restreint</span></a></div>
        <button aria-label="Se connecter">Se connecter</button>
      </div>
    `;

    vi.mocked(waitForElements).mockResolvedValueOnce(Array.from(document.querySelectorAll(SELECTORS.SEARCH_RESULT_CARD))).mockResolvedValue([]);
    
    // Simuler la modale d'email
    document.body.insertAdjacentHTML('beforeend', `
       <input name="email" type="text" />
       <button aria-label="Fermer">Fermer</button>
    `);

    await new Promise(r => setTimeout(r, 800));

    const store = getStoreSnapshot() as any;
    expect(store.echecsInvits).toContain('urn:li:fsd_profile:restricted');
  });
});
