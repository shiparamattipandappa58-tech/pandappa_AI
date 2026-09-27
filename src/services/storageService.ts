import { Conversation, UserSettings } from '../types/assistant';

const STORAGE_KEYS = {
  CONVERSATIONS: 'pandappa_conversations_v1',
  ACTIVE_ID: 'pandappa_active_conversation_id',
  SETTINGS: 'pandappa_settings_v1',
};

export const DEFAULT_SETTINGS: UserSettings = {
  assistantName: 'PANDAPPA AI',
  userName: 'Friend',
  theme: 'dark',
  language: 'English',
  responseLength: 'balanced',
  speechRate: 1.0,
  autoSpeak: false,
  preferredVoice: '',
  useAiTts: false,
  wakeWordEnabled: false,
  wakeWordSensitivity: 'normal',
  systemPromptExtra: '',
};

export const storageService = {
  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Failed to load settings from storage', e);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  },

  getConversations(): Conversation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load conversations from storage', e);
    }
    return [];
  },

  saveConversations(conversations: Conversation[]): void {
    try {
      // Avoid storing excessively large base64 attachments in localStorage if quota is reached
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    } catch (e) {
      console.warn('Failed to save conversations to storage (possibly quota exceeded)', e);
    }
  },

  getActiveConversationId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
    } catch {
      return null;
    }
  },

  setActiveConversationId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
      }
    } catch (e) {
      console.warn('Failed to save active conversation id', e);
    }
  },

  exportData(): string {
    const data = {
      app: 'PANDAPPA AI',
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      settings: this.getSettings(),
      conversations: this.getConversations(),
    };
    return JSON.stringify(data, null, 2);
  },

  importData(jsonString: string): { success: boolean; message: string; count?: number } {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.conversations && Array.isArray(parsed.conversations)) {
        this.saveConversations(parsed.conversations);
        if (parsed.settings) {
          this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        }
        return {
          success: true,
          message: `Successfully imported ${parsed.conversations.length} conversations.`,
          count: parsed.conversations.length,
        };
      }
      return { success: false, message: 'Invalid data format: missing conversations list.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to parse JSON file.' };
    }
  },

  clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch (e) {
      console.warn('Failed to clear local data', e);
    }
  },
};
