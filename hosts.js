// Destinations carried over Koyeb. All others use DIRECT locally.
const EXACT = new Set([
  'gemini.google.com','aistudio.google.com','accounts.google.com',
  'www.google.com','ogs.google.com','apis.google.com',
  'generativelanguage.googleapis.com','daily-cloudcode-pa.googleapis.com',
  'aicode.googleapis.com','content.googleapis.com','people.googleapis.com',
  'oauth2.googleapis.com','fonts.googleapis.com','fonts.gstatic.com',
  'ssl.gstatic.com','www.gstatic.com','lh3.googleusercontent.com',
  'play.google.com','accounts.youtube.com','clients6.google.com'
]);
const SUFFIXES = ['.googleapis.com','.gstatic.com','.googleusercontent.com','.clients6.google.com'];
export function relayHost(host) {
  if (typeof host !== 'string') return false;
  host = host.toLowerCase().replace(/\.$/, '');
  if (!/^[a-z0-9.-]{1,253}$/.test(host) || host.includes('..')) return false;
  return EXACT.has(host) || SUFFIXES.some(s => host.endsWith(s));
}
