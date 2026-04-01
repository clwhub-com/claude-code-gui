export { EXPLORE_AGENT } from './explore';
export { PLAN_AGENT } from './plan';
export { GENERAL_AGENT } from './general';

import { AgentDefinition } from '../types';
import { EXPLORE_AGENT } from './explore';
import { PLAN_AGENT } from './plan';
import { GENERAL_AGENT } from './general';

export const BUILT_IN_AGENTS: AgentDefinition[] = [
  EXPLORE_AGENT,
  PLAN_AGENT,
  GENERAL_AGENT,
];
