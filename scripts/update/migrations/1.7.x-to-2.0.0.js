#!/usr/bin/env node

/**
 * Migration: 1.7.x -> current version (v2.0.0)
 * No-op delta - all file updates handled by refreshInstallation().
 * Product rename: BMAD-Enhanced -> BMAD Odoo.
 * CLI commands renamed from bmad-* to bmad-*.
 * Internal _bmad/ directory structure preserved.
 */

module.exports = {
  name: '1.7.x-to-2.0.0',
  fromVersion: '1.7.x',
  breaking: true,

  async preview() {
    return {
      actions: [
        'Product renamed from BMAD-Enhanced to BMAD Odoo',
        'npm package: bmad-enhanced -> bmad-odoo',
        'CLI commands renamed: bmad-install-vortex-agents -> bmad-install-vortex, bmad-install-agents -> bmad-install, bmad-update -> bmad-update, bmad-version -> bmad-version, bmad-migrate -> bmad-migrate, bmad-doctor -> bmad-doctor',
        'Internal _bmad/ directory structure preserved (no data loss)',
        'No version-specific changes needed (refresh handles all updates)'
      ]
    };
  },

  async apply(_projectRoot) {
    return ['No version-specific delta needed — refreshInstallation handles file updates'];
  }
};
