import { describe, it, expect, vi } from 'vitest';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatterParser';

describe('parseFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const markdown = `---
name: test
description: A test skill
allowed-tools:
  - tool1
  - tool2
---
This is the content.`;
    
    const result = parseFrontmatter(markdown);
    
    expect(result.frontmatter).toEqual({
      name: 'test',
      description: 'A test skill',
      'allowed-tools': ['tool1', 'tool2'],
    });
    expect(result.content).toBe('This is the content.');
  });

  it('should handle missing frontmatter gracefully', () => {
    const markdown = 'Just plain content without frontmatter.';
    const result = parseFrontmatter(markdown);
    
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(markdown);
  });

  it('should handle invalid YAML gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const markdown = `---
name: [invalid: yaml: structure
---
Content`;
    
    const result = parseFrontmatter(markdown);
    
    expect(result.frontmatter).toEqual({});
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle empty frontmatter', () => {
    const markdown = `---
---
Content only`;
    
    const result = parseFrontmatter(markdown);
    
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe('Content only');
  });

  it('should parse nested YAML structures', () => {
    const markdown = `---
hooks:
  PreToolUse:
    - matcher: Bash
      command: echo test
---
Content`;
    
    const result = parseFrontmatter(markdown);
    
    expect(result.frontmatter).toEqual({
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', command: 'echo test' },
        ],
      },
    });
  });

  it('should handle multiline content with frontmatter', () => {
    const markdown = `---
name: multi
---
Line 1
Line 2
Line 3`;
    
    const result = parseFrontmatter(markdown);
    
    expect(result.frontmatter).toEqual({ name: 'multi' });
    expect(result.content).toBe('Line 1\nLine 2\nLine 3');
  });
});

describe('stringifyFrontmatter', () => {
  it('should stringify frontmatter and content', () => {
    const frontmatter = { name: 'test', description: 'A test' };
    const content = 'This is the content.';
    
    const result = stringifyFrontmatter(frontmatter, content);
    
    expect(result).toContain('---');
    expect(result).toContain('name: test');
    expect(result).toContain('description: A test');
    expect(result).toContain('This is the content.');
  });

  it('should return content only when frontmatter is empty', () => {
    const result = stringifyFrontmatter({}, 'Just content');
    
    expect(result).toBe('Just content');
  });

  it('should handle arrays in frontmatter', () => {
    const frontmatter = { 'allowed-tools': ['tool1', 'tool2'] };
    const content = 'Content';
    
    const result = stringifyFrontmatter(frontmatter, content);
    
    expect(result).toContain('- tool1');
    expect(result).toContain('- tool2');
  });

  it('should round-trip parse and stringify', () => {
    const original = `---
name: test
description: A test skill
allowed-tools:
  - tool1
  - tool2
---
This is the content.`;
    
    const parsed = parseFrontmatter(original);
    const stringified = stringifyFrontmatter(parsed.frontmatter, parsed.content);
    const reparsed = parseFrontmatter(stringified);
    
    expect(reparsed.frontmatter).toEqual(parsed.frontmatter);
    expect(reparsed.content).toBe(parsed.content);
  });
});
