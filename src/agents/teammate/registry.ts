export class AgentRegistry {
  private nameToId = new Map<string, string>();
  private idToName = new Map<string, string>();

  register(name: string, agentId: string): void {
    const oldId = this.nameToId.get(name);
    if (oldId) {
      this.idToName.delete(oldId);
    }

    this.nameToId.set(name, agentId);
    this.idToName.set(agentId, name);
  }

  unregister(name: string): void {
    const agentId = this.nameToId.get(name);
    if (agentId) {
      this.nameToId.delete(name);
      this.idToName.delete(agentId);
    }
  }

  unregisterById(agentId: string): void {
    const name = this.idToName.get(agentId);
    if (name) {
      this.nameToId.delete(name);
      this.idToName.delete(agentId);
    }
  }

  lookup(name: string): string | undefined {
    return this.nameToId.get(name);
  }

  lookupByAgentId(agentId: string): string | undefined {
    return this.idToName.get(agentId);
  }

  has(name: string): boolean {
    return this.nameToId.has(name);
  }

  clear(): void {
    this.nameToId.clear();
    this.idToName.clear();
  }

  getAll(): Array<{ name: string; agentId: string }> {
    return Array.from(this.nameToId.entries()).map(([name, agentId]) => ({
      name,
      agentId,
    }));
  }
}
