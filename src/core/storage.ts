/**
 * Storage — Abstraction typée de chrome.storage.local.
 *
 * Seule source de vérité de l'application.
 * Fait le pont entre la Popup (éphémère) et le Content Script (moteur).
 *
 * Closes #2
 */

// ─── Types ────────────────────────────────────────────────

export interface CampaignState {
  active: boolean;
  profilsTraitesAujourdhui: number;
  dateDernierRun: string; // ISO date YYYY-MM-DD
}

export interface Config {
  modeExpert: boolean;
  maxParJour: number;     // Bridé à 30 si modeExpert = false
  pauseMin: number;       // Secondes (défaut: 20)
  pauseMax: number;       // Secondes (défaut: 45)
  heuresDebut: number;     // Heure de début (0-23, défaut: 7)
  heuresFin: number;       // Heure de fin (0-23, défaut: 22)
  messageTemplate: string;
}

export interface StorageSchema {
  etatCampagne: CampaignState;
  config: Config;
  historiqueInvits: string[];  // URN ou URL canonique (JAMAIS le nom)
  echecsInvits: string[];      // URN des profils en échec
}

// ─── Constantes ───────────────────────────────────────────

/** Limite absolue d'invitations/jour en mode normal. */
const MAX_PAR_JOUR_SAFE = 30;

/** Limite absolue d'invitations/jour en mode expert. */
const MAX_PAR_JOUR_EXPERT = 100;

/** Valeurs par défaut — appliquées au premier lancement. */
export const DEFAULTS: StorageSchema = {
  etatCampagne: {
    active: false,
    profilsTraitesAujourdhui: 0,
    dateDernierRun: '',
  },
  config: {
    modeExpert: false,
    maxParJour: MAX_PAR_JOUR_SAFE,
    pauseMin: 20,
    pauseMax: 45,
    heuresDebut: 7,
    heuresFin: 22,
    messageTemplate: 'Bonjour {nom}, je souhaite vous ajouter à mon réseau professionnel.',
  },
  historiqueInvits: [],
  echecsInvits: [],
};

// ─── Helpers internes ─────────────────────────────────────

/**
 * Wrapper Promise autour de chrome.storage.local.get.
 * Retourne un objet partiel typé.
 */
function storageGet<K extends keyof StorageSchema>(
  keys: K | K[] | null
): Promise<Pick<StorageSchema, K>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result as Pick<StorageSchema, K>);
    });
  });
}

/**
 * Wrapper Promise autour de chrome.storage.local.set.
 */
function storageSet(items: Partial<StorageSchema>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });
}

/**
 * Retourne la date du jour au format YYYY-MM-DD.
 */
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Applique le bridage de sécurité sur la config.
 * En mode normal (modeExpert=false), maxParJour ne peut pas dépasser 30.
 * En mode expert, maxParJour est cappé à 100.
 */
export function enforceConfigLimits(config: Config): Config {
  const capped = { ...config };

  if (!capped.modeExpert) {
    capped.maxParJour = Math.min(capped.maxParJour, MAX_PAR_JOUR_SAFE);
  } else {
    capped.maxParJour = Math.min(capped.maxParJour, MAX_PAR_JOUR_EXPERT);
  }

  // Garanties de cohérence
  capped.maxParJour = Math.max(1, capped.maxParJour);
  
  // En mode normal, pauses minimum de 20s. En expert, minimum 5s.
  const minPauseAllowed = capped.modeExpert ? 5 : 20;
  capped.pauseMin = Math.max(minPauseAllowed, capped.pauseMin);
  capped.pauseMax = Math.max(capped.pauseMin, capped.pauseMax);

  // Bornes horaires 0-23
  capped.heuresDebut = Math.max(0, Math.min(23, capped.heuresDebut));
  capped.heuresFin = Math.max(0, Math.min(23, capped.heuresFin));

  return capped;
}

// ─── API Publique ─────────────────────────────────────────

/**
 * Récupère l'état complet depuis le storage, avec fallback sur les DEFAULTS.
 */
export async function getState(): Promise<StorageSchema> {
  const raw = await storageGet(null);
  return {
    etatCampagne: { ...DEFAULTS.etatCampagne, ...(raw as Partial<StorageSchema>).etatCampagne },
    config: { ...DEFAULTS.config, ...(raw as Partial<StorageSchema>).config },
    historiqueInvits: (raw as Partial<StorageSchema>).historiqueInvits ?? DEFAULTS.historiqueInvits,
    echecsInvits: (raw as Partial<StorageSchema>).echecsInvits ?? DEFAULTS.echecsInvits,
  };
}

/**
 * Initialise le storage avec les valeurs par défaut si premier lancement.
 */
export async function initStorage(): Promise<void> {
  const state = await getState();
  if (!state.etatCampagne.dateDernierRun) {
    await storageSet(DEFAULTS);
  }
}

/**
 * Met à jour partiellement l'état de campagne.
 * Merge les champs fournis avec l'état existant.
 */
export async function updateCampaignState(
  partial: Partial<CampaignState>
): Promise<CampaignState> {
  const state = await getState();
  const updated: CampaignState = { ...state.etatCampagne, ...partial };
  await storageSet({ etatCampagne: updated });
  return updated;
}

/**
 * Met à jour partiellement la configuration.
 * Applique automatiquement le bridage de sécurité (maxParJour).
 */
export async function updateConfig(partial: Partial<Config>): Promise<Config> {
  const state = await getState();
  const merged = { ...state.config, ...partial };
  const safe = enforceConfigLimits(merged);
  await storageSet({ config: safe });
  return safe;
}

/**
 * Ajoute un URN à l'historique des invitations envoyées.
 * Évite les doublons.
 */
export async function addToHistory(urn: string): Promise<void> {
  const state = await getState();
  if (!state.historiqueInvits.includes(urn)) {
    state.historiqueInvits.push(urn);
    await storageSet({ historiqueInvits: state.historiqueInvits });
  }
}

/**
 * Ajoute un URN à la liste des échecs d'invitation.
 * Évite les doublons.
 */
export async function addToFailures(urn: string): Promise<void> {
  const state = await getState();
  if (!state.echecsInvits.includes(urn)) {
    state.echecsInvits.push(urn);
    await storageSet({ echecsInvits: state.echecsInvits });
  }
}

/**
 * Vérifie si un profil (URN) a déjà été invité.
 */
export async function isAlreadyInvited(urn: string): Promise<boolean> {
  const state = await getState();
  return state.historiqueInvits.includes(urn);
}

/**
 * Vérifie si le quota journalier est atteint.
 */
export async function isQuotaReached(): Promise<boolean> {
  const state = await getState();
  return state.etatCampagne.profilsTraitesAujourdhui >= state.config.maxParJour;
}

/**
 * Incrémente le compteur de profils traités aujourd'hui.
 * Met à jour la date du dernier run.
 * Retourne le nouveau compteur.
 */
export async function incrementDailyCounter(): Promise<number> {
  const state = await getState();
  const newCount = state.etatCampagne.profilsTraitesAujourdhui + 1;
  await updateCampaignState({
    profilsTraitesAujourdhui: newCount,
    dateDernierRun: todayISO(),
  });
  return newCount;
}

/**
 * Remet le compteur journalier à zéro si la date a changé.
 * Appelé au démarrage du moteur et avant chaque invitation.
 * Retourne true si le compteur a été réinitialisé.
 */
export async function resetDailyCounterIfNewDay(): Promise<boolean> {
  const state = await getState();
  const today = todayISO();

  if (state.etatCampagne.dateDernierRun !== today) {
    await updateCampaignState({
      profilsTraitesAujourdhui: 0,
      dateDernierRun: today,
    });
    return true;
  }

  return false;
}

/**
 * Vérifie si l'heure actuelle est dans la plage configurée.
 */
export function isWithinOfficeHours(config: Config): boolean {
  const now = new Date();
  const hour = now.getHours();

  // Cas normal : 07:00 -> 22:00 (début < fin)
  if (config.heuresDebut < config.heuresFin) {
    return hour >= config.heuresDebut && hour < config.heuresFin;
  }
  
  // Cas nuit : 22:00 -> 07:00 (début > fin)
  return hour >= config.heuresDebut || hour < config.heuresFin;
}

/**
 * Stoppe la campagne proprement.
 */
export async function stopCampaign(): Promise<void> {
  await updateCampaignState({ active: false });
}

/**
 * Démarre la campagne.
 * Réinitialise le compteur si nouveau jour.
 */
export async function startCampaign(): Promise<void> {
  await resetDailyCounterIfNewDay();
  await updateCampaignState({
    active: true,
    dateDernierRun: todayISO(),
  });
}
