/**
 * Entry point — LinkedIn Stealth Automator
 * Appelé par le navigateur lors de l'injection du content-script.
 */

import { ExecutionEngine } from './content';

// Lancement automatique du moteur sur les pages LinkedIn
const engine = new ExecutionEngine();
engine.init();
