/**
 * Storage — Abstraction propre de chrome.storage.local.
 * Implémentation complète dans l'Issue #2.
 */

export interface StorageSchema {
  etatCampagne: {
    active: boolean;
    profilsTraitesAujourdhui: number;
    dateDernierRun: string;
  };
  config: {
    modeExpert: boolean;
    maxParJour: number;
    pauseMin: number;
    pauseMax: number;
    messageTemplate: string;
  };
  historiqueInvits: string[];
  echecsInvits: string[];
}

const DEFAULTS: StorageSchema = {
  etatCampagne: {
    active: false,
    profilsTraitesAujourdhui: 0,
    dateDernierRun: '',
  },
  config: {
    modeExpert: false,
    maxParJour: 30,
    pauseMin: 20,
    pauseMax: 45,
    messageTemplate: 'Bonjour {nom}, je souhaite vous ajouter à mon réseau professionnel.',
  },
  historiqueInvits: [],
  echecsInvits: [],
};

/**
 * Récupère l'état complet depuis le storage.
 */
export async function getState(): Promise<StorageSchema> {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      resolve({ ...DEFAULTS, ...result } as StorageSchema);
    });
  });
}

/**
 * Initialise le storage avec les valeurs par défaut si vide.
 */
export async function initStorage(): Promise<void> {
  const current = await getState();
  if (!current.etatCampagne.dateDernierRun) {
    await chrome.storage.local.set(DEFAULTS);
  }
}
