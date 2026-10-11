import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));

test('manifest points only to real square icons built from the official crest', () => {
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const png = fs.readFileSync(`public${icon.src}`);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(`${width}x${height}`, icon.sizes);
  }
  assert.ok(fs.statSync('public/logo.jpg').size > 10_000);
});

test('service worker handles navigations using the network without caching private content', () => {
  const worker = fs.readFileSync('public/sw.js', 'utf8');
  assert.match(worker, /event\.request\.mode === 'navigate'/);
  assert.match(worker, /event\.respondWith\(fetch\(event\.request\)\)/);
  assert.doesNotMatch(worker, /caches\.open|cache\.put|cache\.add|new Cache/);
});

test('logged-out users can fetch manifest and service worker, but not private APIs', async () => {
  const source = fs.readFileSync('src/proxy.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  const dependencies = {
    'next/server': { NextResponse: {
      next: () => new Response(null, { status: 204 }),
      json: (body, options) => Response.json(body, options),
      redirect: url => Response.redirect(url)
    } },
    '@/auth': { auth: async () => null },
    '@/lib/prisma': { prisma: {} }
  };
  new Function('require', 'module', 'exports', js)(name => {
    if (name in dependencies) return dependencies[name];
    throw Error(`Unexpected dependency ${name}`);
  }, mod, mod.exports);
  for (const path of ['/manifest.json', '/sw.js']) {
    const response = await mod.exports.proxy({ nextUrl: { pathname: path }, url: `https://school.test${path}` });
    assert.equal(response.status, 204, path);
  }
  const privateApi = await mod.exports.proxy({ nextUrl: { pathname: '/api/students' }, url: 'https://school.test/api/students' });
  assert.equal(privateApi.status, 401);
});
