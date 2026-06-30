# V5 Vendor Assets

## Lightweight Charts

- File: `lightweight-charts.standalone.production.js`
- Version: `5.2.0`
- Source: `https://unpkg.com/lightweight-charts@5.2.0/dist/lightweight-charts.standalone.production.js`
- SHA-256:
  `c0992580867c4912cc9385b3c2728315bcc1a76c7f1087dca908430fccdf31d7`
- License: Apache License 2.0, preserved in the vendored file banner.

V5 loads this local standalone build before `v5/src/app.js` so the normal
static browser path uses the real chart engine without a runtime network
dependency. Unit/runtime harnesses may still omit `window.LightweightCharts` to
exercise the DOM fallback path.
