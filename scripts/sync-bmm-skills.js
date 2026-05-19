#!/usr/bin/env node
/**
 * BMAD Odoo — Sync BMM Skills to .claude/skills/
 * 
 * Scans _bmad/bmm/ for all SKILL.md files and creates
 * corresponding skill wrapper directories in .claude/skills/
 * so Antigravity/Claude Code can discover and activate them.
 *
 * Usage: node scripts/sync-bmm-skills.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BMM_DIR = path.join(PROJECT_ROOT, '_bmad', 'bmm');
const SKILLS_DIR = path.join(PROJECT_ROOT, '.claude', 'skills');

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

function syncSkills() {
  console.log('BMAD Odoo — Sync BMM Skills\n');

  // Ensure .claude/skills/ exists
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }

  const skillFiles = findSkillFiles(BMM_DIR);
  console.log(`Found ${skillFiles.length} SKILL.md files in _bmad/bmm/\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const skillPath of skillFiles) {
    const skillDirName = path.basename(path.dirname(skillPath));
    const targetDir = path.join(SKILLS_DIR, skillDirName);
    const targetFile = path.join(targetDir, 'SKILL.md');

    // Read source content
    const sourceContent = fs.readFileSync(skillPath, 'utf-8');

    // Check if already exists and is identical
    if (fs.existsSync(targetFile)) {
      const existingContent = fs.readFileSync(targetFile, 'utf-8');
      if (existingContent === sourceContent) {
        skipped++;
        continue;
      }
      // Content differs — update
      fs.writeFileSync(targetFile, sourceContent);
      console.log(`  ✓ Updated: ${skillDirName}`);
      updated++;
    } else {
      // Create new
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(targetFile, sourceContent);
      console.log(`  + Created: ${skillDirName}`);
      created++;
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Unchanged: ${skipped}`);
  console.log(`Total skills in .claude/skills/: ${fs.readdirSync(SKILLS_DIR).length}`);
}

syncSkills();
