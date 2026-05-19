#!/usr/bin/env node
/**
 * BMAD Odoo — Sync BMM Skills to .agent/skills/ and .claude/skills/
 * 
 * Scans _bmad/bmm/ for all SKILL.md files and creates
 * corresponding skill wrapper directories in both:
 *   - .agent/skills/  (Antigravity)
 *   - .claude/skills/ (Claude Code)
 *
 * Usage: node scripts/sync-bmm-skills.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BMM_DIR = path.join(PROJECT_ROOT, '_bmad', 'bmm');
const TARGET_DIRS = [
  path.join(PROJECT_ROOT, '.agent', 'skills'),
  path.join(PROJECT_ROOT, '.claude', 'skills'),
];

function findSkillFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(fullPath));
    } else if (entry.name === 'SKILL.md') {
      results.push(fullPath);
    }
  }
  return results;
}

function syncToTarget(skillFiles, skillsDir) {
  const dirLabel = path.relative(PROJECT_ROOT, skillsDir);

  // Ensure target dir exists
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const skillPath of skillFiles) {
    const skillDirName = path.basename(path.dirname(skillPath));
    const targetDir = path.join(skillsDir, skillDirName);
    const targetFile = path.join(targetDir, 'SKILL.md');

    const sourceContent = fs.readFileSync(skillPath, 'utf-8');

    if (fs.existsSync(targetFile)) {
      const existingContent = fs.readFileSync(targetFile, 'utf-8');
      if (existingContent === sourceContent) {
        skipped++;
        continue;
      }
      fs.writeFileSync(targetFile, sourceContent);
      console.log(`  ✓ Updated: ${skillDirName}`);
      updated++;
    } else {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(targetFile, sourceContent);
      console.log(`  + Created: ${skillDirName}`);
      created++;
    }
  }

  const totalSkills = fs.readdirSync(skillsDir).length;
  console.log(`  → ${dirLabel}: Created ${created}, Updated ${updated}, Unchanged ${skipped} (Total: ${totalSkills})\n`);
}

function syncSkills() {
  console.log('BMAD Odoo — Sync BMM Skills\n');

  const skillFiles = findSkillFiles(BMM_DIR);
  console.log(`Found ${skillFiles.length} SKILL.md files in _bmad/bmm/\n`);

  for (const targetDir of TARGET_DIRS) {
    const label = path.relative(PROJECT_ROOT, targetDir).replace(/\\/g, '/');
    console.log(`── Syncing to ${label} ──`);
    syncToTarget(skillFiles, targetDir);
  }

  console.log('Done!');
}

syncSkills();
