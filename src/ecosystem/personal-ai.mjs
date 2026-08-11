import { normalizeAiPermissions, canAiPermission } from './permissions.mjs';
import { buildActionRecord, canExecuteAction, requiredActionLevel } from './action-engine.mjs';

export class PersonalAiService {
  constructor({ store, aiRepo, ecosystemRepo = null }) {
    this.store = store;
    this.aiRepo = aiRepo;
    this.ecosystemRepo = ecosystemRepo;
  }

  async getSettings(userId) {
    if (this.ecosystemRepo?.enabled) return this.ecosystemRepo.getAiSettings(userId);
    const row = this.store.data.aiSettings?.find(x => x.userId === userId);
    return row || { userId, permissions: normalizeAiPermissions(), agentName: 'Sylora', updatedAt: null };
  }

  async updatePermissions(userId, patch) {
    const current = await this.getSettings(userId);
    const permissions = normalizeAiPermissions({ ...current.permissions, ...patch });
    const record = { ...current, userId, permissions, updatedAt: this.store.now() };
    if (this.ecosystemRepo?.enabled) return this.ecosystemRepo.saveAiSettings(record);
    const idx = this.store.data.aiSettings?.findIndex(x => x.userId === userId) ?? -1;
    if (!this.store.data.aiSettings) this.store.data.aiSettings = [];
    if (idx >= 0) this.store.data.aiSettings[idx] = record;
    else this.store.data.aiSettings.push(record);
    this.store.save();
    return record;
  }

  async listActivity(userId, limit = 40) {
    if (this.ecosystemRepo?.enabled) return this.ecosystemRepo.listActionLog(userId, limit);
    return (this.store.data.aiActionLog || []).filter(x => x.userId === userId).slice(-limit);
  }

  async logAction(userId, payload) {
    const record = buildActionRecord({
      id: this.store.id(),
      userId,
      ...payload,
      createdAt: this.store.now()
    });
    if (this.ecosystemRepo?.enabled) return this.ecosystemRepo.appendActionLog(record);
    if (!this.store.data.aiActionLog) this.store.data.aiActionLog = [];
    this.store.data.aiActionLog.push(record);
    if (this.store.data.aiActionLog.length > 500) this.store.data.aiActionLog = this.store.data.aiActionLog.slice(-500);
    this.store.save();
    return record;
  }

  async exportMemory(userId) {
    const memories = this.aiRepo.enabled
      ? await this.aiRepo.listMemories(userId, 200)
      : this.store.data.aiMemories.filter(x => x.userId === userId);
    await this.logAction(userId, {
      actionType: 'memory.export',
      level: requiredActionLevel('memory.export'),
      input: { count: memories.length },
      permission: 'memory_read',
      confirmed: true,
      result: { exported: memories.length }
    });
    return { exportedAt: this.store.now(), memories };
  }

  async deleteAllMemory(userId) {
    const memories = this.aiRepo.enabled
      ? await this.aiRepo.listMemories(userId, 500)
      : this.store.data.aiMemories.filter(x => x.userId === userId);
    for (const memory of memories) {
      if (this.aiRepo.enabled) await this.aiRepo.deleteMemory(userId, memory.id);
      else {
        const idx = this.store.data.aiMemories.findIndex(x => x.id === memory.id && x.userId === userId);
        if (idx >= 0) this.store.data.aiMemories.splice(idx, 1);
      }
    }
    if (!this.aiRepo.enabled) this.store.save();
    await this.logAction(userId, {
      actionType: 'memory.delete_all',
      level: requiredActionLevel('memory.delete'),
      input: {},
      permission: 'memory_write',
      confirmed: true,
      result: { deleted: memories.length }
    });
    return { deleted: memories.length };
  }

  permissionAllows(userId, key) {
    return this.getSettings(userId).then(s => canAiPermission(s.permissions, key));
  }

  guardAction(userId, actionType, permissionKey, { confirmed = false } = {}) {
    return this.getSettings(userId).then(settings => {
      const level = requiredActionLevel(actionType);
      const permissionGranted = canAiPermission(settings.permissions, permissionKey);
      const allowed = canExecuteAction({ level, permissionGranted, userConfirmed: confirmed });
      return { allowed, level, permissionGranted, settings };
    });
  }
}
