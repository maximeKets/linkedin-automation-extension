/**
 * Tests — Moteur de Template et Extraction
 * Closes #7
 */

import { describe, it, expect } from 'vitest';
import { fillTemplate, parseFullName, parseCompanyFromTitle } from '../utils/templateEngine';

describe('Template Engine', () => {
  const data = {
    prenom: 'Jean',
    nom: 'Dupont',
    titre: 'Développeur Fullstack',
    entreprise: 'Google'
  };

  it('remplace correctement tous les placeholders', () => {
    const template = 'Bonjour {prenom} {nom}, comment ça va chez {entreprise} en tant que {titre} ?';
    const result = fillTemplate(template, data);
    // On s'attend à ce que l'espace avant le ? soit préservé car on ne nettoie agressivement que , et .
    expect(result).toBe('Bonjour Jean Dupont, comment ça va chez Google en tant que Développeur Fullstack ?');
  });

  it('gère les variables manquantes gracieusement', () => {
    const template = 'Bonjour {prenom} {nom}, j\'aime {entreprise}';
    const result = fillTemplate(template, { prenom: 'Jean' });
    expect(result).toBe('Bonjour Jean, j\'aime');
  });

  it('nettoie les espaces doubles après remplacement', () => {
    const template = 'Hello {prenom}  {nom}'; // Double espace volontaire + nom vide
    const result = fillTemplate(template, { prenom: 'Jean' });
    expect(result).toBe('Hello Jean');
  });

  it('tronque les messages trop longs (> 300)', () => {
    const longString = 'A'.repeat(350);
    const result = fillTemplate(longString, {});
    expect(result.length).toBe(300);
    expect(result.endsWith('...')).toBe(true);
  });
});

describe('Parsing Utilities', () => {
  it('parse correctement le nom complet', () => {
    expect(parseFullName('Jean')).toEqual({ prenom: 'Jean', nom: '' });
    expect(parseFullName('Jean Dupont')).toEqual({ prenom: 'Jean', nom: 'Dupont' });
    expect(parseFullName('Jean-Pierre De La Roche')).toEqual({ prenom: 'Jean-Pierre', nom: 'De La Roche' });
  });

  it('isole l\'entreprise depuis le titre (séparateurs variés)', () => {
    expect(parseCompanyFromTitle('Développeur chez Google')).toEqual({
      titre: 'Développeur',
      entreprise: 'Google'
    });
    expect(parseCompanyFromTitle('CTO @ Acme Corp')).toEqual({
      titre: 'CTO',
      entreprise: 'Acme Corp'
    });
    expect(parseCompanyFromTitle('Designer at Figma')).toEqual({
      titre: 'Designer',
      entreprise: 'Figma'
    });
    expect(parseCompanyFromTitle('Freelance indépendant')).toEqual({
      titre: 'Freelance indépendant',
      entreprise: ''
    });
  });
});
