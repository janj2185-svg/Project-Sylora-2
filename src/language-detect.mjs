/**
 * Lightweight script/language cues for reply routing — not a substitute for a MT model.
 */
export function detectLanguageHint(text = '') {
  const s = String(text || '');
  if (!s.trim()) return null;
  if (/[\u0400-\u04FF]/.test(s)) {
    // Ukrainian vs Russian heuristics (common letters / words)
    if (/\b(і|ї|є|ґ|що|як|мене|будь|ласка|дякую)\b/i.test(s) || /[іїєґ]/i.test(s)) return 'uk';
    if (/\b(это|что|как|меня|пожалуйста|спасибо)\b/i.test(s)) return 'ru';
    return 'uk';
  }
  if (/[ąćęłńóśźż]/i.test(s) || /\b(cześć|dziękuję|proszę|nie)\b/i.test(s)) return 'pl';
  if (/[äöüß]/i.test(s) || /\b(und|ich|nicht|danke)\b/i.test(s)) return 'de';
  if (/[áéíóúñ¿¡]/i.test(s) || /\b(hola|gracias|por favor)\b/i.test(s)) return 'es';
  if (/[àâçéèêëîïôùûü]/i.test(s) || /\b(bonjour|merci|s'il vous plaît)\b/i.test(s)) return 'fr';
  if (/\b(the|and|you|please|thanks|hello)\b/i.test(s)) return 'en';
  return null;
}
