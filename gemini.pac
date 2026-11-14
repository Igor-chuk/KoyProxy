function FindProxyForURL(url, host) {
  host = host.toLowerCase();
  var exact = [
    'gemini.google.com','aistudio.google.com','accounts.google.com',
    'www.google.com','ogs.google.com','apis.google.com',
    'generativelanguage.googleapis.com','daily-cloudcode-pa.googleapis.com',
    'aicode.googleapis.com','content.googleapis.com','people.googleapis.com',
    'oauth2.googleapis.com','fonts.googleapis.com','fonts.gstatic.com',
    'ssl.gstatic.com','www.gstatic.com','lh3.googleusercontent.com',
    'play.google.com','accounts.youtube.com','clients6.google.com'
  ];
  if (exact.indexOf(host) !== -1 || dnsDomainIs(host, '.googleapis.com') ||
      dnsDomainIs(host, '.gstatic.com') || dnsDomainIs(host, '.googleusercontent.com') ||
      dnsDomainIs(host, '.clients6.google.com'))
    return 'PROXY 127.0.0.1:8888';
  return 'DIRECT';
}
