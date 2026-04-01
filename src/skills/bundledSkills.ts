import { Skill } from './types';

export const BUNDLED_SKILLS: Skill[] = [
  {
    name: 'explain-code',
    description: 'Explain how a piece of code works',
    content: 'Explain the following code in detail, including what it does, how it works, and any important patterns or considerations.',
    allowedTools: ['Read'],
    source: 'bundled',
  },
  {
    name: 'refactor',
    description: 'Refactor code for better quality',
    content: 'Refactor the following code to improve readability, maintainability, and performance. Keep the same functionality.',
    allowedTools: ['Read', 'Edit', 'Write'],
    source: 'bundled',
  },
];
