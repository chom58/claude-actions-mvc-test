/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: '🚀 はじめに',
      items: [
        'getting-started/installation',
        'getting-started/configuration',
        'getting-started/first-steps',
      ],
    },
    {
      type: 'category',
      label: '📚 ガイド',
      items: [
        'guides/user-management',
        'guides/authentication',
        'guides/file-upload',
        'guides/database',
        'guides/testing',
      ],
    },
    {
      type: 'category',
      label: '🏗️ アーキテクチャ',
      items: [
        'architecture/overview',
        'architecture/mvc-pattern',
        'architecture/database-schema',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: '🔧 開発',
      items: [
        'development/setup',
        'development/coding-standards',
        'development/debugging',
        'development/performance',
      ],
    },
    {
      type: 'category',
      label: '🚀 デプロイ',
      items: [
        'deployment/production',
        'deployment/docker',
        'deployment/environment',
        'deployment/monitoring',
      ],
    },
    {
      type: 'category',
      label: '❓ FAQ',
      items: [
        'faq/common-issues',
        'faq/troubleshooting',
      ],
    },
  ],
};

module.exports = sidebars;