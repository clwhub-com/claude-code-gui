import * as YAML from 'yaml';

const FRONTMATTER_REGEX = /^---\s*\n(?:([\s\S]*?)\n)?---\s*\n([\s\S]*)$/;

export interface ParseResult {
  frontmatter: Record<string, unknown>;
  content: string;
}

export function parseFrontmatter(markdown: string): ParseResult {
  const match = markdown.match(FRONTMATTER_REGEX);
  
  if (!match) {
    return { frontmatter: {}, content: markdown };
  }
  
  const [, yamlString = '', content] = match;
  
  try {
    const parsed = YAML.parse(yamlString);
    const frontmatter = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
    return { frontmatter, content: content.trim() };
  } catch (error) {
    console.error('Failed to parse frontmatter YAML:', error);
    return { frontmatter: {}, content: content.trim() };
  }
}

export function stringifyFrontmatter(
  frontmatter: Record<string, unknown>,
  content: string
): string {
  const entries = Object.entries(frontmatter);
  if (entries.length === 0) {
    return content;
  }
  
  const yamlString = YAML.stringify(frontmatter);
  return `---\n${yamlString}---\n${content}`;
}
