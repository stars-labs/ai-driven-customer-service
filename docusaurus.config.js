// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'AI-Driven Customer Service',
  tagline: 'Economic analysis, architecture patterns, and implementation guide for replacing traditional CS with AI',


  url: 'https://stars-labs.github.io',
  baseUrl: '/ai-driven-customer-service/',

  organizationName: 'stars-labs',
  projectName: 'ai-driven-customer-service',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    localeConfigs: {
      en: {
        label: 'English',
      },
      zh: {
        label: '中文',
      },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'AI Customer Service',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Guide',
          },
          {
            type: 'doc',
            docId: 'case-studies',
            position: 'left',
            label: 'Case Studies',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Analysis',
            items: [
              {
                label: 'Introduction',
                to: '/',
              },
              {
                label: 'Cost Comparison',
                to: '/cost-comparison',
              },
              {
                label: 'TCO Model',
                to: '/tco-model',
              },
            ],
          },
          {
            title: 'Implementation',
            items: [
              {
                label: 'Architecture',
                to: '/architecture',
              },
              {
                label: 'RAG Pattern',
                to: '/rag-architecture',
              },
              {
                label: 'Integration',
                to: '/integration-patterns',
              },
            ],
          },
          {
            title: 'Resources',
            items: [
              {
                label: 'Case Studies',
                to: '/case-studies',
              },
              {
                label: 'FAQ',
                to: '/faq',
              },
            ],
          },
        ],
        copyright: `Copyright ${new Date().getFullYear()} AI-Driven Customer Service Guide. Built with Docusaurus.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
        additionalLanguages: ['bash', 'python', 'json', 'yaml', 'sql'],
      },
    }),
};

module.exports = config;
