/**
 * Tests — Sécurité et Rate Limiting
 * Closes #5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isWithinOfficeHours, enforceConfigLimits, DEFAULTS } from '../core/storage';

describe('Office Hours Filter', () => {
  it('identifie correctement les heures de bureau (cas standard)', () => {
    const config = { ...DEFAULTS.config, heuresDebut: 8, heuresFin: 18 };
    
    // Forcer l'heure à 10h
    vi.setSystemTime(new Date('2026-04-02T10:00:00'));
    expect(isWithinOfficeHours(config)).toBe(true);

    // Forcer l'heure à 20h
    vi.setSystemTime(new Date('2026-04-02T20:00:00'));
    expect(isWithinOfficeHours(config)).toBe(false);
  });

  it('gère les plages horaires qui traversent minuit', () => {
    const config = { ...DEFAULTS.config, heuresDebut: 22, heuresFin: 6 };
    
    // 23h -> Ok (dans la plage 22h-6h)
    vi.setSystemTime(new Date('2026-04-02T23:00:00'));
    expect(isWithinOfficeHours(config)).toBe(true);

    // 03h -> Ok
    vi.setSystemTime(new Date('2026-04-03T03:00:00'));
    expect(isWithinOfficeHours(config)).toBe(true);

    // 10h -> Pas Ok
    vi.setSystemTime(new Date('2026-04-02T10:00:00'));
    expect(isWithinOfficeHours(config)).toBe(false);
  });
});

describe('Expert Mode Limits', () => {
  it('bride à 30 en mode normal', () => {
    const config = { ...DEFAULTS.config, modeExpert: false, maxParJour: 100 };
    const safe = enforceConfigLimits(config);
    expect(safe.maxParJour).toBe(30);
  });

  it('permet jusqu\'à 100 en mode expert', () => {
    const config = { ...DEFAULTS.config, modeExpert: true, maxParJour: 100 };
    const safe = enforceConfigLimits(config);
    expect(safe.maxParJour).toBe(100);
  });

  it('bride les pauses minimum', () => {
    // Mode normal: min 20s
    let config = { ...DEFAULTS.config, modeExpert: false, pauseMin: 5 };
    expect(enforceConfigLimits(config).pauseMin).toBe(20);

    // Mode expert: min 5s
    config = { ...DEFAULTS.config, modeExpert: true, pauseMin: 2 };
    expect(enforceConfigLimits(config).pauseMin).toBe(5);
  });
});
