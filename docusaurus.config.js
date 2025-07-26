const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'MVC Template Documentation',
  tagline: '原宿クリエイティブコミュニティプラットフォーム - 包括的なドキュメント',
  url: 'https://your-domain.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  organizationName: 'chom58',
  projectName: 'claude-actions-mvc-test',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/chom58/claude-actions-mvc-test/tree/main/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/chom58/claude-actions-mvc-test/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'MVC Template',
        logo: {
          alt: 'MVC Template Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'ドキュメント',
          },
          {
            to: '/api',
            label: 'API',
            position: 'left',
          },
          {
            to: '/blog',
            label: 'ブログ',
            position: 'left'
          },
          {
            href: 'https://github.com/chom58/claude-actions-mvc-test',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'ドキュメント',
            items: [
              {
                label: 'はじめに',
                to: '/docs/intro',
              },
              {
                label: 'API リファレンス',
                to: '/api',
              },
              {
                label: 'チュートリアル',
                to: '/docs/tutorial',
              },
            ],
          },
          {
            title: 'コミュニティ',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/chom58/claude-actions-mvc-test',
              },
              {
                label: 'Issues',
                href: 'https://github.com/chom58/claude-actions-mvc-test/issues',
              },
            ],
          },
          {
            title: 'その他',
            items: [
              {
                label: 'ブログ',
                to: '/blog',
              },
              {
                label: '変更履歴',
                href: 'https://github.com/chom58/claude-actions-mvc-test/blob/main/CHANGELOG.md',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} MVC Template Project. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'json', 'javascript', 'typescript', 'sql'],
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
    }),

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'api',
        path: 'docs/api',
        routeBasePath: 'api',
        sidebarPath: require.resolve('./sidebars.api.js'),
        editUrl: 'https://github.com/chom58/claude-actions-mvc-test/tree/main/',
      },
    ],
  ],
};