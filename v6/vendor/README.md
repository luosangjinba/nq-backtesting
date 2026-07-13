# Vendored browser dependencies

## Lightweight Charts

- File: `lightweight-charts.standalone.production.js`
- Version: `5.2.0`, matching `v6/package.json` and `v6/package-lock.json`
- Source: `https://unpkg.com/lightweight-charts@5.2.0/dist/lightweight-charts.standalone.production.js`
- License: Apache License 2.0, preserved in the vendored file banner

V6 owns this browser asset so its runtime does not depend on the V5 directory.
When upgrading, update the package lock and this file together, then run the V6
chart browser regression pack.
