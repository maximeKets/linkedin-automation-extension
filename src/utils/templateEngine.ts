/**
 * Moteur de Template — Personnalisation des messages d'invitation.
 */

export interface ProfileData {
  prenom: string;
  nom: string;
  titre: string;
  entreprise: string;
}

/**
 * Remplace les variables {prenom}, {nom}, {titre}, {entreprise} dans un template.
 * Si une variable est absente de ProfileData, elle est remplacée par une chaîne vide.
 */
export function fillTemplate(template: string, data: Partial<ProfileData>): string {
  if (!template) return '';

  let filled = template;

  // Liste des placeholders supportés
  const mappings: Record<string, string> = {
    '{prenom}': data.prenom || '',
    '{nom}': data.nom || '',
    '{titre}': data.titre || '',
    '{entreprise}': data.entreprise || '',
  };

  // On remplace d'abord {nom} par prénom pour la compatibilité descendante, 
  // puis on gère le reste de manière plus spécifique si besoin.
  // Note: LinkedIn demande souvent "{nom}" pour le prénom dans les interfaces fr.
  
  Object.entries(mappings).forEach(([tag, value]) => {
    // Escape special regex characters in tag
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filled = filled.replace(new RegExp(escapedTag, 'g'), value);
  });

  // Nettoyage : supprimer les espaces doubles qui pourraient résulter d'une variable vide
  filled = filled.replace(/\s{2,}/g, ' ');
  // Supprimer l'espace avant une virgule ou un point (cas fréquent après variable vide)
  filled = filled.replace(/\s+([,.])/g, '$1');
  filled = filled.trim();

  // Limite LinkedIn (300 caractères pour les notes d'invitation)
  if (filled.length > 300) {
    console.warn('[TemplateEngine] Message tronqué : dépasse 300 caractères.');
    return filled.substring(0, 297) + '...';
  }

  return filled;
}

/**
 * Tente d'extraire le prénom et le nom depuis un nom complet.
 */
export function parseFullName(fullName: string): { prenom: string; nom: string } {
  if (!fullName) return { prenom: '', nom: '' };

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { prenom: parts[0], nom: '' };

  const prenom = parts[0];
  const nom = parts.slice(1).join(' ');

  return { prenom, nom };
}

/**
 * Tente d'isoler l'entreprise depuis un titre de poste LinkedIn.
 * Ex: "Développeur chez Google" -> "Google"
 */
export function parseCompanyFromTitle(title: string): { titre: string; entreprise: string } {
  if (!title) return { titre: '', entreprise: '' };

  // Mots-clés séparateurs courants sur LinkedIn (FR/EN)
  const separators = [/\s+chez\s+/i, /\s+@\s+/, /\s+at\s+/i];
  
  for (const sep of separators) {
    const parts = title.split(sep);
    if (parts.length > 1) {
      return {
        titre: parts[0].trim(),
        entreprise: parts[1].trim()
      };
    }
  }

  return { titre: title.trim(), entreprise: '' };
}
