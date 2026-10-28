import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // SSR sur un petit serveur en Europe (adapter-node). Pas de SPA.
    adapter: adapter({ out: 'build' }),
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'img-src': ['self', 'data:', 'blob:'],
        'style-src': ['self', 'unsafe-inline'],
        'script-src': ['self'],
        'connect-src': ['self'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self']
      }
    }
  }
};

export default config;
