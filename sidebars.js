// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'intro',
    'architecture',
    {
      type: 'category',
      label: 'Economic Analysis',
      items: [
        'current-landscape',
        'cost-comparison',
        'tco-model',
        'roi-framework',
        'case-studies',
      ],
    },
    {
      type: 'category',
      label: 'Technical Architecture',
      items: [
        'ai-models',
        'rag-architecture',
        'integration-patterns',
        'human-handoff',
        'quality-safety',
      ],
    },
    {
      type: 'category',
      label: 'Implementation',
      items: [
        'knowledge-base',
        'monitoring-eval',
        'cs-org-training',
      ],
    },
    {
      type: 'category',
      label: 'Risk & Governance',
      items: [
        'risk-assessment',
        'faq',
      ],
    },
  ],
};

module.exports = sidebars;
