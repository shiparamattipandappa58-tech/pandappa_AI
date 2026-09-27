import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Conversation } from '../types/assistant';

const DEFAULT_KEY = 'sb_publishable_jooIoi9rGgv6Mj4sJMV5lw_zeneYqXe';
const STORAGE_KEY_URL = 'pandappa_supabase_url';
const STORAGE_KEY_ANON = 'pandappa_supabase_key';

class SupabaseService {
  private client: SupabaseClient | null = null;
  private currentUrl: string = '';
  private currentKey: string = '';

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage() {
    if (typeof window === 'undefined') return;
    const storedUrl =
      localStorage.getItem(STORAGE_KEY_URL) ||
      (import.meta as any).env?.VITE_SUPABASE_URL ||
      '';
    const storedKey =
      localStorage.getItem(STORAGE_KEY_ANON) ||
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      DEFAULT_KEY;

    this.currentUrl = storedUrl;
    this.currentKey = storedKey;

    if (this.currentUrl && this.currentKey) {
      try {
        this.client = createClient(this.currentUrl, this.currentKey);
      } catch (e) {
        console.warn('Failed to initialize Supabase client:', e);
      }
    }
  }

  public getConfiguration() {
    return {
      url: this.currentUrl,
      key: this.currentKey || DEFAULT_KEY,
      isConfigured: !!(this.currentUrl && this.currentKey),
    };
  }

  public configure(url: string, key: string = DEFAULT_KEY): boolean {
    const cleanUrl = url.trim().replace(/\/$/, '');
    const cleanKey = key.trim();

    if (!cleanUrl) {
      this.client = null;
      this.currentUrl = '';
      this.currentKey = cleanKey || DEFAULT_KEY;
      localStorage.removeItem(STORAGE_KEY_URL);
      localStorage.setItem(STORAGE_KEY_ANON, this.currentKey);
      return false;
    }

    try {
      this.client = createClient(cleanUrl, cleanKey);
      this.currentUrl = cleanUrl;
      this.currentKey = cleanKey;
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_ANON, cleanKey);
      return true;
    } catch (e) {
      console.error('Error creating Supabase client:', e);
      return false;
    }
  }

  public async testConnection(url?: string, key?: string): Promise<{ success: boolean; message: string }> {
    const testUrl = (url || this.currentUrl).trim().replace(/\/$/, '');
    const testKey = (key || this.currentKey || DEFAULT_KEY).trim();

    if (!testUrl) {
      return {
        success: false,
        message: 'Please provide your Supabase Project URL (e.g. https://your-project.supabase.co).',
      };
    }

    try {
      // Direct REST ping to Supabase schema endpoint
      const response = await fetch(`${testUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: testKey,
          Authorization: `Bearer ${testKey}`,
        },
      });

      if (response.ok || response.status === 200 || response.status === 404) {
        // Successful contact with Supabase REST API
        this.configure(testUrl, testKey);
        return {
          success: true,
          message: 'Connection to Supabase successful! Your database is ready.',
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: 'Connection reached Supabase, but authorization failed. Please verify your publishable key.',
        };
      } else {
        return {
          success: false,
          message: `Supabase server responded with status: ${response.status}`,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        message: `Failed to reach Supabase project: ${e.message || 'Network error or invalid URL'}.`,
      };
    }
  }

  public async syncConversations(conversations: Conversation[]): Promise<{ success: boolean; message: string }> {
    if (!this.client || !this.currentUrl) {
      return {
        success: false,
        message: 'Supabase is not configured. Please enter your Supabase Project URL in Settings.',
      };
    }

    try {
      // Upsert into 'pandappa_conversations' or generic 'conversations' table
      const rows = conversations.map((c) => ({
        id: c.id,
        title: c.title,
        created_at: new Date(c.createdAt).toISOString(),
        updated_at: new Date(c.updatedAt).toISOString(),
        data: c,
      }));

      const { error } = await this.client
        .from('pandappa_conversations')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        // If specific table doesn't exist, try local store backup
        return {
          success: false,
          message: `Supabase query returned: ${error.message}. (Ensure the "pandappa_conversations" table exists in your Supabase SQL editor)`,
        };
      }

      return {
        success: true,
        message: `Successfully synchronized ${conversations.length} conversation(s) to Supabase cloud!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error syncing data with Supabase.',
      };
    }
  }
}

export const supabaseService = new SupabaseService();
