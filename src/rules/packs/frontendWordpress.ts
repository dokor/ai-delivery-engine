import type { RulePack } from '../rulePack.types.ts';

export const frontendWordpressPack: RulePack = {
  id: 'frontend/wordpress',
  title: 'WordPress',
  description: 'Conventions for WordPress themes/plugins: escaping, hooks, coding standards.',
  rules: [
    {
      id: 'wordpress/escaping',
      severity: 'error',
      kind: 'guidance',
      explanation: 'Escape all output and sanitize all input.',
      rationale: 'Unescaped output is the primary source of XSS in WordPress.',
      suggestion: 'Use esc_html/esc_attr/esc_url on output and sanitize_* on input.',
      appliesTo: ['**/*.php']
    },
    {
      id: 'wordpress/hooks',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Extend via actions and filters; never edit WordPress core.',
      rationale: 'Core edits are overwritten on update and break maintainability.',
      suggestion: 'Register add_action/add_filter hooks in a theme or plugin instead of editing core.'
    },
    {
      id: 'wordpress/coding-standards',
      severity: 'warn',
      kind: 'tool',
      explanation: 'Enforce WordPress Coding Standards via PHP_CodeSniffer (WPCS).',
      rationale: 'WPCS already encodes the official standards; ADE orchestrates it.',
      suggestion: 'Configure phpcs with the WordPress ruleset and run it as an ADE tool.',
      tool: 'phpcs'
    }
  ]
};
