/**
 * Tests unitaires — Couche de persistance (storage.ts)
 * Closes #2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chromeMock, resetStore, getStoreSnapshot } from './chromeMock';

// Injecter le mock chrome global AVANT d'importer storage
vi.stubGlobal('chrome', chromeMock);

import {
  getState,
  initStorage,
  updateCampaignState,
  updateConfig,
  addToHistory,
  addToFailures,
  isAlreadyInvited,
  isQuotaReached,
  incrementDailyCounter,
  resetDailyCounterIfNewDay,
  startCampaign,
  stopCampaign,
  DEFAULTS,
} from '../core/storage';

describe('Storage Layer', () => {
  beforeEach(() => {
    resetStore();
  });

  // ─── getState ───────────────────────────────────────────

  describe('getState()', () => {
    it('retourne les DEFAULTS quand le storage est vide', async () => {
      const state = await getState();
      expect(state.etatCampagne).toEqual(DEFAULTS.etatCampagne);
      expect(state.config).toEqual(DEFAULTS.config);
      expect(state.historiqueInvits).toEqual([]);
      expect(state.echecsInvits).toEqual([]);
    });

    it('merge les valeurs existantes avec les defaults', async () => {
      chromeMock.storage.local.set({
        etatCampagne: { active: true, profilsTraitesAujourdhui: 5, dateDernierRun: '2026-04-01' },
      });
      const state = await getState();
      expect(state.etatCampagne.active).toBe(true);
      expect(state.etatCampagne.profilsTraitesAujourdhui).toBe(5);
      // Config should still be defaults
      expect(state.config.maxParJour).toBe(30);
    });
  });

  // ─── initStorage ────────────────────────────────────────

  describe('initStorage()', () => {
    it('ecrit les defaults si le storage est vide', async () => {
      await initStorage();
      const snap = getStoreSnapshot();
      expect(snap.etatCampagne).toBeDefined();
      expect(snap.config).toBeDefined();
    });

    it('ne reecrit pas si deja initialise', async () => {
      chromeMock.storage.local.set({
        etatCampagne: { active: true, profilsTraitesAujourdhui: 10, dateDernierRun: '2026-04-01' },
        config: DEFAULTS.config,
      });
      await initStorage();
      const state = await getState();
      // Should preserve existing values
      expect(state.etatCampagne.active).toBe(true);
      expect(state.etatCampagne.profilsTraitesAujourdhui).toBe(10);
    });
  });

  // ─── updateCampaignState ────────────────────────────────

  describe('updateCampaignState()', () => {
    it('merge partiellement etat de campagne', async () => {
      await initStorage();
      const updated = await updateCampaignState({ active: true });
      expect(updated.active).toBe(true);
      expect(updated.profilsTraitesAujourdhui).toBe(0); // preserved
    });

    it('persiste les changements', async () => {
      await initStorage();
      await updateCampaignState({ profilsTraitesAujourdhui: 15 });
      const state = await getState();
      expect(state.etatCampagne.profilsTraitesAujourdhui).toBe(15);
    });
  });

  // ─── updateConfig avec bridage ──────────────────────────

  describe('updateConfig()', () => {
    it('applique le bridage a 30 en mode normal', async () => {
      await initStorage();
      const safe = await updateConfig({ maxParJour: 50 });
      expect(safe.maxParJour).toBe(30);
    });

    it('autorise jusqu a 100 en mode expert', async () => {
      await initStorage();
      const safe = await updateConfig({ modeExpert: true, maxParJour: 80 });
      expect(safe.maxParJour).toBe(80);
    });

    it('cap a 100 meme en mode expert', async () => {
      await initStorage();
      const safe = await updateConfig({ modeExpert: true, maxParJour: 200 });
      expect(safe.maxParJour).toBe(100);
    });

    it('garantit maxParJour >= 1', async () => {
      await initStorage();
      const safe = await updateConfig({ maxParJour: -5 });
      expect(safe.maxParJour).toBe(1);
    });

    it('garantit pauseMax >= pauseMin', async () => {
      await initStorage();
      const safe = await updateConfig({ pauseMin: 30, pauseMax: 10 });
      expect(safe.pauseMax).toBeGreaterThanOrEqual(safe.pauseMin);
    });

    it('desactive mode expert -> force le bridage', async () => {
      await initStorage();
      await updateConfig({ modeExpert: true, maxParJour: 80 });
      const safe = await updateConfig({ modeExpert: false });
      expect(safe.maxParJour).toBe(30);
    });
  });

  // ─── Historique et echecs ───────────────────────────────

  describe('addToHistory() / isAlreadyInvited()', () => {
    it('ajoute un URN a historique', async () => {
      await initStorage();
      await addToHistory('urn:li:fsd_profile:123');
      const invited = await isAlreadyInvited('urn:li:fsd_profile:123');
      expect(invited).toBe(true);
    });

    it('evite les doublons', async () => {
      await initStorage();
      await addToHistory('urn:li:fsd_profile:123');
      await addToHistory('urn:li:fsd_profile:123');
      const state = await getState();
      expect(state.historiqueInvits).toHaveLength(1);
    });

    it('retourne false pour un URN inconnu', async () => {
      await initStorage();
      const invited = await isAlreadyInvited('urn:li:fsd_profile:unknown');
      expect(invited).toBe(false);
    });
  });

  describe('addToFailures()', () => {
    it('ajoute un URN aux echecs', async () => {
      await initStorage();
      await addToFailures('urn:li:fsd_profile:fail1');
      const state = await getState();
      expect(state.echecsInvits).toContain('urn:li:fsd_profile:fail1');
    });

    it('evite les doublons echecs', async () => {
      await initStorage();
      await addToFailures('urn:li:fsd_profile:fail1');
      await addToFailures('urn:li:fsd_profile:fail1');
      const state = await getState();
      expect(state.echecsInvits).toHaveLength(1);
    });
  });

  // ─── Compteur journalier ────────────────────────────────

  describe('incrementDailyCounter()', () => {
    it('incremente le compteur', async () => {
      await initStorage();
      const count = await incrementDailyCounter();
      expect(count).toBe(1);
      const count2 = await incrementDailyCounter();
      expect(count2).toBe(2);
    });
  });

  describe('isQuotaReached()', () => {
    it('retourne false quand sous la limite', async () => {
      await initStorage();
      expect(await isQuotaReached()).toBe(false);
    });

    it('retourne true quand le quota est atteint', async () => {
      await initStorage();
      await updateCampaignState({ profilsTraitesAujourdhui: 30 });
      expect(await isQuotaReached()).toBe(true);
    });
  });

  describe('resetDailyCounterIfNewDay()', () => {
    it('reset le compteur si la date a change', async () => {
      await initStorage();
      await updateCampaignState({
        profilsTraitesAujourdhui: 25,
        dateDernierRun: '2025-01-01', // date passee
      });
      const wasReset = await resetDailyCounterIfNewDay();
      expect(wasReset).toBe(true);
      const state = await getState();
      expect(state.etatCampagne.profilsTraitesAujourdhui).toBe(0);
    });

    it('ne reset pas si meme jour', async () => {
      await initStorage();
      const today = new Date().toISOString().split('T')[0];
      await updateCampaignState({
        profilsTraitesAujourdhui: 10,
        dateDernierRun: today,
      });
      const wasReset = await resetDailyCounterIfNewDay();
      expect(wasReset).toBe(false);
      const state = await getState();
      expect(state.etatCampagne.profilsTraitesAujourdhui).toBe(10);
    });
  });

  // ─── Lifecycle ──────────────────────────────────────────

  describe('startCampaign() / stopCampaign()', () => {
    it('startCampaign active la campagne', async () => {
      await initStorage();
      await startCampaign();
      const state = await getState();
      expect(state.etatCampagne.active).toBe(true);
      expect(state.etatCampagne.dateDernierRun).toBeTruthy();
    });

    it('stopCampaign desactive la campagne', async () => {
      await initStorage();
      await startCampaign();
      await stopCampaign();
      const state = await getState();
      expect(state.etatCampagne.active).toBe(false);
    });

    it('startCampaign reset le compteur si nouveau jour', async () => {
      await initStorage();
      await updateCampaignState({
        profilsTraitesAujourdhui: 20,
        dateDernierRun: '2025-01-01',
      });
      await startCampaign();
      const state = await getState();
      expect(state.etatCampagne.profilsTraitesAujourdhui).toBe(0);
      expect(state.etatCampagne.active).toBe(true);
    });
  });
});
