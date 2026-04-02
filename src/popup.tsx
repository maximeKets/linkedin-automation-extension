import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  getState,
  startCampaign,
  stopCampaign,
  updateConfig,
  isWithinOfficeHours,
  DEFAULTS,
  type CampaignState,
  type Config,
} from './core/storage';

/**
 * Popup — Interface principale de l'extension.
 * Éphémère : lit l'état via la couche storage et écrit la config.
 * Ne gère aucune logique métier lourde.
 */

function App() {
  const [campaignState, setCampaignState] = useState<CampaignState>(DEFAULTS.etatCampagne);
  const [config, setConfig] = useState<Config>(DEFAULTS.config);

  // Load state from storage on mount
  useEffect(() => {
    getState().then((stored) => {
      setCampaignState(stored.etatCampagne);
      setConfig(stored.config);
    });

    // Listen for real-time changes from the content script
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.etatCampagne?.newValue) {
        setCampaignState(changes.etatCampagne.newValue as CampaignState);
      }
      if (changes.config?.newValue) {
        setConfig(changes.config.newValue as Config);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const progress = config.maxParJour > 0
    ? Math.min((campaignState.profilsTraitesAujourdhui / config.maxParJour) * 100, 100)
    : 0;

  const toggleCampaign = async () => {
    if (campaignState.active) {
      await stopCampaign();
    } else {
      if (!isWithinOfficeHours(config)) {
        alert(`Hors horaires de bureau (${config.heuresDebut}h-${config.heuresFin}h).`);
        return;
      }
      await startCampaign();
    }
  };

  const handleExpertToggle = async (e: any) => {
    const isChecked = e.currentTarget.checked;
    if (isChecked) {
      const confirmed = window.confirm(
        "⚠️ Mode Expert : L'augmentation des limites augmente significativement le risque de restriction de votre compte LinkedIn. Je comprends les risques."
      );
      if (!confirmed) return;
    }
    await updateConfig({ modeExpert: isChecked });
  };

  const updateHours = async (field: 'heuresDebut' | 'heuresFin', value: string) => {
    const val = parseInt(value, 10);
    if (!isNaN(val)) {
      await updateConfig({ [field]: val });
    }
  };

  const isWorkingHours = isWithinOfficeHours(config);

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
          {campaignState.profilsTraitesAujourdhui} <span>/ {config.maxParJour}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Start / Stop button */}
      {!isWorkingHours && !campaignState.active ? (
        <div class="scheduled-info">
          <span>⏲️ Reprise programmée à {config.heuresDebut}h00</span>
        </div>
      ) : (
        <button
          class={`btn-start ${campaignState.active ? 'active' : 'idle'}`}
          onClick={toggleCampaign}
          id="btn-toggle-campaign"
        >
          {campaignState.active ? '⏸ ARRÊTER' : '▶ DÉMARRER'}
        </button>
      )}

      {/* Info */}
      <div class="info-row">
        <span>⏱️ Pause</span>
        <span class="value">{config.pauseMin}s – {config.pauseMax}s</span>
      </div>
      <div class="info-row">
        <span>📅 Dernier run</span>
        <span class="value">{campaignState.dateDernierRun || '—'}</span>
      </div>

      <div class="divider" />

      {/* Expert Mode Section */}
      <div class="expert-section">
        <div class="expert-toggle-row">
          <label htmlFor="expert-mode">Mode Expert 🛡️</label>
          <input
            type="checkbox"
            id="expert-mode"
            checked={config.modeExpert}
            onChange={handleExpertToggle}
          />
        </div>

        {config.modeExpert && (
          <div class="expert-config animated-in">
            <div class="input-group">
              <label>Limites {config.heuresDebut}h - {config.heuresFin}h</label>
              <div class="hours-inputs">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={config.heuresDebut}
                  onChange={(e) => updateHours('heuresDebut', e.currentTarget.value)}
                />
                <span>à</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={config.heuresFin}
                  onChange={(e) => updateHours('heuresFin', e.currentTarget.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Mount Preact app
const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
