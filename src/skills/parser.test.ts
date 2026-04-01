import { describe, it, expect, vi } from 'vitest';
import { parseSkill } from './parser';

describe('parseSkill', () => {
  it('should parse skill with frontmatter', () => {
    const content = `---
name: my-skill
description: A test skill
allowed-tools: Bash, Read
---

# My Skill

This is the skill content.`;

    const skill = parseSkill(content, '/path/to/skill/SKILL.md', 'project');
    expect(skill).not.toBeNull();
    expect(skill!.name).toBe('my-skill');
    expect(skill!.description).toBe('A test skill');
    expect(skill!.allowedTools).toEqual(['Bash', 'Read']);
    expect(skill!.source).toBe('project');
    expect(skill!.filePath).toBe('/path/to/skill/SKILL.md');
  });

  it('should extract name from path if missing from frontmatter', () => {
    const content = `# My Skill

Some description here.`;

    const skill = parseSkill(content, '/path/to/my-skill/SKILL.md', 'global');
    expect(skill).not.toBeNull();
    expect(skill!.name).toBe('my-skill');
  });

  it('should extract description from first line if missing from frontmatter', () => {
    const content = `# This is a useful skill

Some detailed content.`;

    const skill = parseSkill(content, '/path/to/test-skill/SKILL.md', 'project');
    expect(skill).not.toBeNull();
    expect(skill!.description).toBe('This is a useful skill');
  });

  it('should return null if no name can be determined', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const content = 'Some content without frontmatter or proper path';

    const skill = parseSkill(content, 'SKILL.md', 'project');
    expect(skill).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should parse allowed-tools as array', () => {
    const content = `---
name: test
allowed-tools:
  - Bash
  - Read
  - Edit
---
Content`;

    const skill = parseSkill(content, '/path/to/test/SKILL.md', 'project');
    expect(skill).not.toBeNull();
    expect(skill!.allowedTools).toEqual(['Bash', 'Read', 'Edit']);
  });

  it('should parse allowed-tools as comma-separated string', () => {
    const content = `---
name: test
allowed-tools: Bash, Read, Edit
---
Content`;

    const skill = parseSkill(content, '/path/to/test/SKILL.md', 'project');
    expect(skill!.allowedTools).toEqual(['Bash', 'Read', 'Edit']);
  });

  it('should return empty array for missing allowed-tools', () => {
    const content = `---
name: test
---
Content`;

    const skill = parseSkill(content, '/path/to/test/SKILL.md', 'project');
    expect(skill!.allowedTools).toEqual([]);
  });

  it('should parse paths as array', () => {
    const content = `---
name: test
paths:
  - src/**
  - lib/**
---
Content`;

    const skill = parseSkill(content, '/path/to/test/SKILL.md', 'project');
    expect(skill!.paths).toEqual(['src/**', 'lib/**']);
  });

  it('should parse paths as comma-separated string', () => {
    const content = `---
name: test
paths: src/**, lib/**
---
Content`;

    const skill = parseSkill(content, '/path/to/test/SKILL.md', 'project');
    expect(skill!.paths).toEqual(['src/**', 'lib/**']);
  });

  it('should return undefined for missing paths', () => {
    const content = `---
name: test
---
Content`;

    const skill = parseSkill(content, '/path/to/test/SKILL.md', 'project');
    expect(skill!.paths).toBeUndefined();
  });

  it('should parse when-to-use and argument-hint', () => {
    const content = `---
name: test
when-to-use: When analyzing code
argument-hint: <file-path>
---
Content`;

    const skill = parseSkill(content, '/path/to/test/SKILL.md', 'project');
    expect(skill!.whenToUse).toBe('When analyzing code');
    expect(skill!.argumentHint).toBe('<file-path>');
  });

  it('should parse hooks', () => {
    const content = `---
name: test
hooks:
  PreToolUse:
    - matcher: Bash
      command: echo test
---
Content`;

    const skill = parseSkill(content, '/path/to/test/SKILL.md', 'project');
    expect(skill!.hooks).toEqual({
      PreToolUse: [{ matcher: 'Bash', command: 'echo test' }],
    });
  });

  it('should handle content without frontmatter', () => {
    const content = `# Plain Skill

Just regular markdown content.`;

    const skill = parseSkill(content, '/path/to/plain-skill/SKILL.md', 'bundled');
    expect(skill).not.toBeNull();
    expect(skill!.name).toBe('plain-skill');
    expect(skill!.description).toBe('Plain Skill');
    expect(skill!.allowedTools).toEqual([]);
    expect(skill!.source).toBe('bundled');
  });
});
