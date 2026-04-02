/**
 * Tests unitaires — reactUtils.ts
 * Closes #3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  injectTextInReact,
  clearReactInput,
  simulateReactClick,
  getReactFiber,
  getReactProps,
} from '../utils/reactUtils';

beforeEach(() => {
  document.body.innerHTML = '';
});

// ─── injectTextInReact ───────────────────────────────────

describe('injectTextInReact()', () => {
  it('injecte du texte dans un input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const result = injectTextInReact(input, 'Hello LinkedIn');
    expect(result).toBe(true);
    expect(input.value).toBe('Hello LinkedIn');
  });

  it('injecte du texte dans un textarea', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const result = injectTextInReact(textarea, 'Bonjour {nom}');
    expect(result).toBe(true);
    expect(textarea.value).toBe('Bonjour {nom}');
  });

  it('dispatche les evenements input et change', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    const events: string[] = [];
    input.addEventListener('input', () => events.push('input'));
    input.addEventListener('change', () => events.push('change'));
    input.addEventListener('keyup', () => events.push('keyup'));

    injectTextInReact(input, 'Test');
    expect(events).toContain('input');
    expect(events).toContain('change');
    expect(events).toContain('keyup');
  });

  it('focus element avant injection', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    let focused = false;
    input.addEventListener('focus', () => { focused = true; });

    injectTextInReact(input, 'Test');
    expect(focused).toBe(true);
  });

  it('gere les caracteres speciaux (accents, emojis)', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    injectTextInReact(input, 'Bonjour Francois! 🚀');
    expect(input.value).toBe('Bonjour Francois! 🚀');
  });
});

// ─── clearReactInput ─────────────────────────────────────

describe('clearReactInput()', () => {
  it('vide un input', () => {
    const input = document.createElement('input');
    input.value = 'Some text';
    document.body.appendChild(input);

    clearReactInput(input);
    expect(input.value).toBe('');
  });
});

// ─── simulateReactClick ──────────────────────────────────

describe('simulateReactClick()', () => {
  it('dispatche pointer + mouse events dans le bon ordre', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);

    const events: string[] = [];
    btn.addEventListener('pointerdown', () => events.push('pointerdown'));
    btn.addEventListener('mousedown', () => events.push('mousedown'));
    btn.addEventListener('pointerup', () => events.push('pointerup'));
    btn.addEventListener('mouseup', () => events.push('mouseup'));
    btn.addEventListener('click', () => events.push('click'));

    simulateReactClick(btn);
    expect(events).toEqual(['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']);
  });
});

// ─── getReactFiber / getReactProps ────────────────────────

describe('getReactFiber()', () => {
  it('retourne null pour un element sans fiber', () => {
    const div = document.createElement('div');
    expect(getReactFiber(div)).toBeNull();
  });

  it('retourne le fiber si present', () => {
    const div = document.createElement('div');
    const mockFiber = { memoizedProps: { className: 'test' } };
    (div as unknown as Record<string, unknown>)['__reactFiber$abc123'] = mockFiber;

    const fiber = getReactFiber(div);
    expect(fiber).toBe(mockFiber);
  });
});

describe('getReactProps()', () => {
  it('retourne null pour un element sans props', () => {
    const div = document.createElement('div');
    expect(getReactProps(div)).toBeNull();
  });

  it('retourne les props directes si presentes', () => {
    const div = document.createElement('div');
    const mockProps = { onClick: () => {}, className: 'card' };
    (div as unknown as Record<string, unknown>)['__reactProps$xyz456'] = mockProps;

    const props = getReactProps(div);
    expect(props).toBe(mockProps);
  });

  it('fallback sur fiber.memoizedProps', () => {
    const div = document.createElement('div');
    const mockProps = { title: 'Profile' };
    (div as unknown as Record<string, unknown>)['__reactFiber$abc'] = {
      memoizedProps: mockProps,
    };

    const props = getReactProps(div);
    expect(props).toBe(mockProps);
  });
});
