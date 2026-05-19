#!/usr/bin/env node

/**
 * bmad-install — Umbrella installer (delegates to Vortex installer).
 *
 * Future: When additional frameworks are added, this script will install
 * all frameworks. For now it delegates to bmad-install-vortex.
 */
require('./install-vortex-agents.js');
