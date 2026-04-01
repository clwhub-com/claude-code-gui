import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from './registry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('should register and lookup agents', () => {
    registry.register('worker-1', 'agent-123');
    expect(registry.lookup('worker-1')).toBe('agent-123');
    expect(registry.lookupByAgentId('agent-123')).toBe('worker-1');
  });

  it('should unregister agents', () => {
    registry.register('worker-1', 'agent-123');
    registry.unregister('worker-1');
    expect(registry.lookup('worker-1')).toBeUndefined();
    expect(registry.lookupByAgentId('agent-123')).toBeUndefined();
  });

  it('should handle duplicate registrations', () => {
    registry.register('worker-1', 'agent-123');
    registry.register('worker-1', 'agent-456');
    expect(registry.lookup('worker-1')).toBe('agent-456');
    expect(registry.lookupByAgentId('agent-123')).toBeUndefined();
  });

  it('should lookup by agent id', () => {
    registry.register('alpha', 'id-1');
    registry.register('beta', 'id-2');
    expect(registry.lookupByAgentId('id-1')).toBe('alpha');
    expect(registry.lookupByAgentId('id-2')).toBe('beta');
    expect(registry.lookupByAgentId('id-3')).toBeUndefined();
  });
});
