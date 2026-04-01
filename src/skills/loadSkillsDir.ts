import { invoke } from '@tauri-apps/api/core';
import { Skill } from './types';
import { parseSkill } from './parser';

interface DirEntry {
  name: string;
  is_dir: boolean;
}

export async function loadSkillsFromDir(
  dirPath: string,
  source: Skill['source']
): Promise<Skill[]> {
  try {
    const entries = await invoke('read_dir', { path: dirPath }) as DirEntry[];
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (entry.is_dir) {
        const skillPath = `${dirPath}/${entry.name}/SKILL.md`;
        try {
          const content = await invoke('read_file', { path: skillPath }) as string;
          const skill = parseSkill(content, skillPath, source);
          if (skill) {
            skills.push(skill);
          }
        } catch {
          // SKILL.md doesn't exist, skip
        }
      }
    }

    return skills;
  } catch (error) {
    console.error(`Failed to load skills from ${dirPath}:`, error);
    return [];
  }
}

export async function loadAllSkills(
  projectDir: string,
  globalDir: string
): Promise<Skill[]> {
  const [projectSkills, globalSkills] = await Promise.all([
    loadSkillsFromDir(`${projectDir}/.claude/skills`, 'project'),
    loadSkillsFromDir(`${globalDir}/skills`, 'global'),
  ]);

  // Project skills override global skills with same name
  const skillMap = new Map<string, Skill>();
  for (const skill of globalSkills) {
    skillMap.set(skill.name, skill);
  }
  for (const skill of projectSkills) {
    skillMap.set(skill.name, skill);
  }

  return Array.from(skillMap.values());
}
