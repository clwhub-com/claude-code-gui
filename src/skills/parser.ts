import { parseFrontmatter } from '../utils/frontmatterParser';
import { Skill, SkillFrontmatter } from './types';

export function parseSkill(
  content: string,
  filePath: string,
  source: Skill['source']
): Skill | null {
  const { frontmatter, content: markdownContent } = parseFrontmatter(content);

  const fm = frontmatter as SkillFrontmatter;
  const name = fm.name || extractNameFromPath(filePath);
  const description = (fm.description as string) || extractDescription(markdownContent);

  if (!name) {
    console.warn(`Skill at ${filePath} has no name`);
    return null;
  }

  return {
    name,
    description,
    content: markdownContent,
    allowedTools: parseAllowedTools(fm['allowed-tools']),
    whenToUse: fm['when-to-use'],
    argumentHint: fm['argument-hint'],
    paths: parsePaths(fm.paths),
    hooks: fm.hooks,
    source,
    filePath,
  };
}

function extractNameFromPath(filePath: string): string {
  const parts = filePath.split('/');
  const dirName = parts[parts.length - 2];
  return dirName || '';
}

function extractDescription(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  return firstLine.replace(/^#*\s*/, '').slice(0, 100);
}

function parseAllowedTools(tools: string | string[] | undefined): string[] {
  if (!tools) return [];
  if (Array.isArray(tools)) return tools;
  return tools.split(',').map(t => t.trim());
}

function parsePaths(paths: string | string[] | undefined): string[] | undefined {
  if (!paths) return undefined;
  if (Array.isArray(paths)) return paths;
  return paths.split(',').map(p => p.trim());
}
