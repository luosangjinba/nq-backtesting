import { createDataAcquisitionSurface } from '../src/data-acquisition-ui/public.js';

const surface = createDataAcquisitionSurface({
  root: document.querySelector('#data-acquisition-app'),
});

window.addEventListener('pagehide', () => surface.dispose(), { once: true });
