import { invoke } from '@tauri-apps/api/core';
import { Plugin, PluginMetadata } from './types';
import { parseSkill } from '../skills/parser';
import { Skill } from '../skills/types';

interface DirEntry {
  name: string;
  is_dir: boolean;
}

export async function loadPluginsFromDir(pluginsDir: string): Promise<Plugin[]> {
  try {
    const entries = await invoke('read_dir', { path: pluginsDir }) as DirEntry[];
    const plugins: Plugin[] = [];

    for (const entry of entries) {
      if (entry.is_dir) {
        const plugin = await loadPlugin(`${pluginsDir}/${entry.name}`, entry.name);
        if (plugin) {
          plugins.push(plugin);
        }
      }
    }

    return plugins;
  } catch (error) {
    console.error(`Failed to load plugins from ${pluginsDir}:`, error);
    return [];
  }
}

async function loadPlugin(pluginDir: string, pluginName: string): Promise<Plugin | null> {
  const metadataPath = `${pluginDir}/plugin.json`;
  try {
    const metadataContent = await invoke('read_file', { path: metadataPath }) as string;
    const metadata: PluginMetadata = JSON.parse(metadataContent);
    
    const skills = await loadPluginSkills(`${pluginDir}/skills`, pluginName);
    
    return {
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      author: metadata.author,
      skills,
      agents: [],
      mcpServers: metadata.mcpServers,
      enabled: true,
      source: 'installed',
      path: pluginDir,
    };
  } catch {
    console.warn(`Failed to load plugin metadata from ${metadataPath}`);
    return null;
  }
}

async function loadPluginSkills(skillsDir: string, pluginName: string): Promise<Skill[]> {
  try {
    const entries = await invoke('read_dir', { path: skillsDir }) as DirEntry[];
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (entry.is_dir) {
        const skillPath = `${skillsDir}/${entry.name}/SKILL.md`;
        try {
          const content = await invoke('read_file', { path: skillPath }) as string;
          const skill = parseSkill(content, skillPath, 'plugin');
          if (skill) {
            skill.name = `${pluginName}:${skill.name}`;
            skills.push(skill);
          }
        } catch {
          // SKILL.md doesn't exist, skip
        }
      }
    }

    return skills;
  } catch {
    // Skills directory doesn't exist, return empty array
    return [];
  }
}