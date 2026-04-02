/**
 * Tests unitaires — domUtils.ts
 * Closes #3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  waitForElement,
  waitForElements,
  waitForElementRemoval,
  getUrnFromProfile,
  clickElement,
  sleep,
  randomBetween,
} from '../utils/domUtils';

// ─── Setup DOM minimal ───────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = '';
  // Mock scrollIntoView as it's not implemented in jsdom
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── waitForElement ──────────────────────────────────────

describe('waitForElement()', () => {
  it('resolve immediatement si element existe deja', async () => {
    document.body.innerHTML = '<div class="target">Hello</div>';
    const el = await waitForElement('.target');
    expect(el).toBeTruthy();
    expect(el.textContent).toBe('Hello');
  });

  it('resolve quand element est ajoute au DOM', async () => {
    const promise = waitForElement('.lazy-target', 2000);

    // Simuler un ajout lazy apres 50ms
    setTimeout(() => {
      const div = document.createElement('div');
      div.className = 'lazy-target';
      div.textContent = 'Loaded';
      document.body.appendChild(div);
    }, 50);

    const el = await promise;
    expect(el.textContent).toBe('Loaded');
  });

  it('rejette apres timeout', async () => {
    await expect(waitForElement('.does-not-exist', 100))
      .rejects
      .toThrow('timeout');
  });
});

// ─── waitForElements ─────────────────────────────────────

describe('waitForElements()', () => {
  it('resolve quand minCount elements sont presents', async () => {
    document.body.innerHTML = `
      <div class="card">1</div>
      <div class="card">2</div>
      <div class="card">3</div>
    `;
    const els = await waitForElements('.card', 2);
    expect(els.length).toBeGreaterThanOrEqual(2);
  });

  it('attend que le nombre minimum soit atteint', async () => {
    document.body.innerHTML = '<div class="card">1</div>';

    const promise = waitForElements('.card', 3, 2000);

    setTimeout(() => {
      document.body.innerHTML += '<div class="card">2</div>';
    }, 30);
    setTimeout(() => {
      document.body.innerHTML += '<div class="card">3</div>';
    }, 60);

    const els = await promise;
    expect(els.length).toBeGreaterThanOrEqual(3);
  });

  it('rejette si timeout avant minCount', async () => {
    document.body.innerHTML = '<div class="card">1</div>';
    await expect(waitForElements('.card', 10, 100))
      .rejects
      .toThrow('timeout');
  });
});

// ─── waitForElementRemoval ───────────────────────────────

describe('waitForElementRemoval()', () => {
  it('resolve immediatement si element absent', async () => {
    await waitForElementRemoval('.modal');
    // No error = success
  });

  it('resolve quand element est retire du DOM', async () => {
    document.body.innerHTML = '<div class="modal">Modal</div>';

    const promise = waitForElementRemoval('.modal', 2000);

    setTimeout(() => {
      const modal = document.querySelector('.modal');
      modal?.parentNode?.removeChild(modal);
    }, 50);

    await promise;
    expect(document.querySelector('.modal')).toBeNull();
  });

  it('rejette si element pas retire avant timeout', async () => {
    document.body.innerHTML = '<div class="modal">Modal</div>';
    await expect(waitForElementRemoval('.modal', 100))
      .rejects
      .toThrow('timeout');
  });
});

// ─── getUrnFromProfile ───────────────────────────────────

describe('getUrnFromProfile()', () => {
  it('extrait URN depuis data-* attribute', () => {
    const el = document.createElement('div');
    el.setAttribute('data-chameleon-result-urn', 'urn:li:fsd_profile:ABC123');
    document.body.appendChild(el);

    const urn = getUrnFromProfile(el);
    expect(urn).toBe('urn:li:fsd_profile:ABC123');
  });

  it('extrait URN depuis le HTML interne', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span data-id="urn:li:fsd_profile:XYZ789">Name</span>';
    document.body.appendChild(el);

    const urn = getUrnFromProfile(el);
    expect(urn).toBe('urn:li:fsd_profile:XYZ789');
  });

  it('extrait URL canonique depuis les liens <a>', () => {
    const el = document.createElement('div');
    el.innerHTML = '<a href="/in/john-doe/">John Doe</a>';
    document.body.appendChild(el);

    const urn = getUrnFromProfile(el);
    expect(urn).toBe('/in/john-doe/');
  });

  it('gere les noms avec accents dans les URLs', () => {
    const el = document.createElement('div');
    el.innerHTML = '<a href="/in/jean-fran%C3%A7ois-dupont/">Jean</a>';
    document.body.appendChild(el);

    const urn = getUrnFromProfile(el);
    expect(urn).toBe('/in/jean-fran%C3%A7ois-dupont/');
  });

  it('retourne null si aucune info trouvee', () => {
    const el = document.createElement('div');
    el.textContent = 'Just text, no URN';
    document.body.appendChild(el);

    // Mock window.location pour ne pas avoir de fallback
    Object.defineProperty(window, 'location', {
      value: { pathname: '/feed/' },
      writable: true,
    });

    const urn = getUrnFromProfile(el);
    expect(urn).toBeNull();
  });

  it('fallback sur URL de la page courante', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/in/maxime-kets/' },
      writable: true,
    });

    const urn = getUrnFromProfile();
    expect(urn).toBe('/in/maxime-kets/');
  });
});

// ─── clickElement ────────────────────────────────────────

describe('clickElement()', () => {
  it('dispatche les evenements mouse dans le bon ordre', async () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);

    const events: string[] = [];
    btn.addEventListener('mousedown', () => events.push('mousedown'));
    btn.addEventListener('mouseup', () => events.push('mouseup'));
    btn.addEventListener('click', () => events.push('click'));

    await clickElement(btn);

    expect(events).toEqual(['mousedown', 'mouseup', 'click']);
  });
});

// ─── Helpers ─────────────────────────────────────────────

describe('sleep()', () => {
  it('attend le delai specifie', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // tolerance
  });
});

describe('randomBetween()', () => {
  it('retourne un nombre dans la plage', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomBetween(10, 20);
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThanOrEqual(20);
    }
  });

  it('retourne min quand min === max', () => {
    expect(randomBetween(5, 5)).toBe(5);
  });
});
