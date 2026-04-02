import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

/**
 * Popup — Interface principale de l'extension.
 * Éphémère : lit l'état depuis chrome.storage.local et écrit la config.
 * Ne gère aucune logique métier lourde.
 */

interface CampaignState {
  active: boolean;
  profilsTraitesAujourdhui: number;
  dateDernierRun: string;
}

interface Config {
  modeExpert: boolean;
  maxParJour: number;
  pauseMin: number;
  pauseMax: number;
  messageTemplate: string;
}

const DEFAULT_STATE: CampaignState = {
  active: false,
  profilsTraitesAujourdhui: 0,
  dateDernierRun: '',
};

const DEFAULT_CONFIG: Config = {
  modeExpert: false,
  maxParJour: 30,
  pauseMin: 20,
  pauseMax: 45,
  messageTemplate: 'Bonjour {nom}, je souhaite vous ajouter à mon réseau professionnel.',
};

function App() {
  const [state, setState] = useState<CampaignState>(DEFAULT_STATE);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);

  // Load state from storage on mount
  useEffect(() => {
    chrome.storage.local.get(['etatCampagne', 'config'], (result) => {
      if (result.etatCampagne) setState(result.etatCampagne);
      if (result.config) setConfig(result.config);
    });

    // Listen for real-time changes from the content script
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.etatCampagne?.newValue) {
        setState(changes.etatCampagne.newValue);
      }
      if (changes.config?.newValue) {
        setConfig(changes.config.newValue);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const progress = config.maxParJour > 0
    ? Math.min((state.profilsTraitesAujourdhui / config.maxParJour) * 100, 100)
    : 0;

  const toggleCampaign = async () => {
    const newState: CampaignState = {
      ...state,
      active: !state.active,
      dateDernierRun: new Date().toISOString().split('T')[0],
    };
    await chrome.storage.local.set({ etatCampagne: newState });
    setState(newState);
  };

  return (
    <>
      {/* Header */}
      <div class="header">
        <div class="header-logo">Li</div>
        <div class="header-title">Stealth Automator</div>
        <div class="header-version">v0.1.0</div>
      </div>

      {/* Status card */}
      <div class="status-card">
        <div class="status-label">Invitations aujourd'hui</div>
        <div class="status-count">
          {state.profilsTraitesAujourdhui} <span>/ {config.maxParJour}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Start / Stop button */}
      <button
        class={`btn-start ${state.active ? 'active' : 'idle'}`}
        onClick={toggleCampaign}
        id="btn-toggle-campaign"
      >
        {state.active ? '⏸ ARRÊTER' : '▶ DÉMARRER'}
      </button>

      {/* Info */}
      <div class="info-row">
        <span>⏱️ Pause</span>
        <span class="value">{config.pauseMin}s – {config.pauseMax}s</span>
      </div>
      <div class="info-row">
        <span>📅 Dernier run</span>
        <span class="value">{state.dateDernierRun || '—'}</span>
      </div>
    </>
  );
}

// Mount Preact app
const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
