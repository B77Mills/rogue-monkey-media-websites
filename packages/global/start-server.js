const newrelic = require('newrelic');
const { startServer } = require('@parameter1/base-cms-marko-web');
const { set, get } = require('@parameter1/base-cms-object-path');
const loadInquiry = require('@parameter1/base-cms-marko-web-inquiry');
const htmlSitemapPagination = require('@parameter1/base-cms-marko-web-html-sitemap/middleware/paginated');

const document = require('./components/document');
const components = require('./components');
const fragments = require('./fragments');
const sharedRoutes = require('./routes');
const paginated = require('./middleware/paginated');
const oembedHandler = require('./oembed-handler');

const routes = (siteRoutes, siteConfig) => (app) => {
  // Handle submissions on /__inquiry
  loadInquiry(app);
  // Shared/global routes (all sites)
  sharedRoutes(app, siteConfig);
  // Load site routes
  siteRoutes(app);
};

module.exports = (options = {}) => {
  const { onStart } = options;
  const googleNewsInput = {
    days: 7,
    includeContentTypes: ['News'],
    excludeLabels: ['Sponsored'],
  };
  return startServer({
    ...options,
    routes: routes(options.routes, options.siteConfig),
    document: options.document || document,
    components: options.components || components,
    fragments: options.fragments || fragments,
    sitemapsHeaders: {
      'x-google-news-input': JSON.stringify(googleNewsInput),
    },
    onStart: async (app) => {
      if (typeof onStart === 'function') await onStart(app);
      app.set('trust proxy', 'loopback, linklocal, uniquelocal');

      // Use paginated middleware
      app.use(paginated());

      // Use paginated middleware
      app.use(htmlSitemapPagination());

      // Setup GAM.
      const gamConfig = get(options, 'siteConfig.gam');
      set(app.locals, 'GAM', gamConfig);

      // Setup NativeX.
      const nativeXConfig = get(options, 'siteConfig.nativeX');
      set(app.locals, 'nativeX', nativeXConfig);

      // Setup IdentityX.
      const identityXConfig = get(options, 'siteConfig.identityX');
      set(app.locals, 'identityX', identityXConfig);
    },
    onAsyncBlockError: e => newrelic.noticeError(e),

    embeddedMediaHandlers: {
      oembed: oembedHandler,
    },
  });
};
