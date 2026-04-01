import { Plugin } from './types';
import { BUNDLED_SKILLS } from '../skills/bundledSkills';
import { BUILT_IN_AGENTS } from '../agents/built-in';

export const BUILTIN_PLUGINS: Plugin[] = [
  {
    name: 'core',
    version: '1.0.0',
    description: 'Core built-in functionality',
    skills: BUNDLED_SKILLS,
    agents: BUILT_IN_AGENTS,
    enabled: true,
    source: 'builtin',
    path: '',
  },
];