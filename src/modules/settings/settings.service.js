import { SettingsRepository } from "./settings.repository.js";

export class SettingsService {
  static async getSettings(userId) {
    let settings = await SettingsRepository.getByUserId(userId);
    if (!settings) {
      // Create defaults if not found
      settings = await SettingsRepository.updateByUserId(userId, {});
    }
    return settings;
  }

  static async updateSettings(userId, updateData) {
    const updated = await SettingsRepository.updateByUserId(userId, updateData);
    return updated;
  }
}
