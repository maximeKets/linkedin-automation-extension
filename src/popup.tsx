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
  const [isLinkedInSearch, setIsLinkedInSearch] = useState(false);
  const [messageDraft, setMessageDraft] = useState(config.messageTemplate);

  // Load state from storage on mount
  useEffect(() => {
    getState().then((stored) => {
      setCampaignState(stored.etatCampagne);
      setConfig(stored.config);
      setMessageDraft(stored.config.messageTemplate);
    });

    // Detect current tab context
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || '';
        setIsLinkedInSearch(url.includes('linkedin.com/search/results/people'));
      });
    }

    // Listen for real-time changes from the content script
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.etatCampagne?.newValue) {
        setCampaignState(changes.etatCampagne.newValue as CampaignState);
      }
      if (changes.config?.newValue) {
        const newConf = changes.config.newValue as Config;
        setConfig(newConf);
        // Sync local draft from storage only if not currently focused by user
        if (document.activeElement?.id !== 'message-editor') {
          setMessageDraft(newConf.messageTemplate);
        }
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

  const updateConfigField = async (partial: Partial<Config>) => {
    const updated = await updateConfig(partial);
    setConfig(updated);
  };

  const [debounceTimer, setDebounceTimer] = useState<number | null>(null);
  
  const handleMessageChange = (e: any) => {
    const newVal = e.currentTarget.value;
    setMessageDraft(newVal);
    
    if (debounceTimer) window.clearTimeout(debounceTimer);
    const timer = window.setTimeout(() => {
      updateConfigField({ messageTemplate: newVal });
    }, 800);
    setDebounceTimer(timer);
  };

  const isWorkingHours = isWithinOfficeHours(config);
  const canStart = isLinkedInSearch && messageDraft.trim().length > 0;

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

      {/* Context Warning */}
      {!isLinkedInSearch && (
        <div class="alert warn animated-in">
          ⚠️ Ouvrez une page de recherche LinkedIn (Membres) pour démarrer.
        </div>
      )}

      {/* Message Editor */}
      <div class="message-section">
        <label htmlFor="message-editor">Message d'invitation</label>
        <textarea
          id="message-editor"
          value={messageDraft}
          onInput={handleMessageChange}
          placeholder="Ex: Bonjour {nom}, ravi de..."
          disabled={campaignState.active}
        ></textarea>
        <div class="message-hint">Utilisez <code>{`{nom}`}</code> pour le prénom.</div>
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
          disabled={!canStart && !campaignState.active}
        >
          {campaignState.active ? '⏸ ARRÊTER' : '▶ DÉMARRER'}
        </button>
      )}

      {/* Config: Pauses */}
      <div class="config-grid">
        <div class="config-item">
          <label>Pause Min (s)</label>
          <input
            type="number"
            min="5"
            max={config.pauseMax}
            value={config.pauseMin}
            onInput={(e) => updateConfigField({ pauseMin: parseInt(e.currentTarget.value, 10) || 20 })}
          />
        </div>
        <div class="config-item">
          <label>Pause Max (s)</label>
          <input
            type="number"
            min={config.pauseMin}
            max="300"
            value={config.pauseMax}
            onInput={(e) => updateConfigField({ pauseMax: parseInt(e.currentTarget.value, 10) || 45 })}
          />
        </div>
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
                  onChange={(e) => updateConfigField({ heuresDebut: parseInt(e.currentTarget.value, 10) || 0 })}
                />
                <span>à</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={config.heuresFin}
                  onChange={(e) => updateConfigField({ heuresFin: parseInt(e.currentTarget.value, 10) || 0 })}
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
