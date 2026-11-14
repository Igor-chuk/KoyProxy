import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { relayHost } from './hosts.js';
const context = {dnsDomainIs: (host, domain) => host.endsWith(domain)};
vm.createContext(context);
vm.runInContext(readFileSync(new URL('./gemini.pac', import.meta.url), 'utf8'), context);
test('PAC and server rules agree on Google and non-Google hosts', () => {
  for (const host of [
    'gemini.google.com','geminiweb-pa.clients6.google.com',
    'signaler-pa.clients6.google.com','wa-pa.clients6.google.com',
    'clients6.google.com', 'A.B.CLIENTS6.GOOGLE.COM',
    'aicode.googleapis.com','gemini.gstatic.com','example.org',
    'fakeclients6.google.com','clients6.google.com.evil.net'
  ]) {
    const pac = context.FindProxyForURL('https://' + host + '/', host);
    assert.equal(pac === 'PROXY 127.0.0.1:8888', relayHost(host), host);
  }
});
