import test from 'node:test';
import assert from 'node:assert/strict';
import {relayHost} from './hosts.js';
test('Gemini and Antigravity domain selection', () => {
  for (const host of ['gemini.google.com','daily-cloudcode-pa.googleapis.com','aicode.googleapis.com','foo.googleapis.com','www.gstatic.com','geminiweb-pa.clients6.google.com','signaler-pa.clients6.google.com','wa-pa.clients6.google.com','clients6.google.com']) assert.equal(relayHost(host), true, host);
  for (const host of ['example.org','evilgoogleapis.com','googleapis.com.evil.org','localhost','127.0.0.1','clients6.google.com.evil.net','fakeclients6.google.com']) assert.equal(relayHost(host), false, host);
});
