import { Tab } from '@/types/Tab';
import { Folder } from '@/types/Folder';
import { logger } from '@/utils/logger';

const API_BASE = '/api';

/**
 * Generic API request handler with error handling
 */
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`API error ${res.status}: ${errorData.error || res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    logger.error(`API request failed: ${url}`, err);
    throw err;
  }
}

/**
 * Tab API methods
 */
export const tabApi = {
  /**
   * Get all tabs
   */
  async getTabs(): Promise<Tab[]> {
    return apiRequest<Tab[]>(`${API_BASE}/tabs`);
  },

  /**
   * Create or update a tab
   */
  async saveTab(tab: Tab): Promise<{ success: boolean; id: string }> {
    return apiRequest<{ success: boolean; id: string }>(`${API_BASE}/tabs`, {
      method: 'POST',
      body: JSON.stringify(tab),
    });
  },

  /**
   * Delete a tab
   */
  async deleteTab(tabId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`${API_BASE}/tabs?id=${tabId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Batch import tabs
   */
  async batchImport(tabs: Tab[], skipDuplicates = false): Promise<{
    successful: Array<{ id: string; url: string }>;
    failed: Array<{ url: string; error: string; index: number }>;
    total: number;
    importBatchId: string;
  }> {
    return apiRequest(`${API_BASE}/tabs/batch`, {
      method: 'POST',
      body: JSON.stringify({ tabs, skipDuplicates }),
    });
  },

  /**
   * Get import status for a batch
   */
  async getImportStatus(batchId: string): Promise<{
    batchId: string;
    status: string;
    totalTabs: number;
    completedTabs: number;
    failedTabs: number;
    progress: number;
    tabs: Array<{
      id: string;
      url: string;
      title: string;
      status: string;
      hasScreenshot: boolean;
      hasSummary: boolean;
      errors?: any;
    }>;
  }> {
    return apiRequest(`${API_BASE}/tabs/import-status?batchId=${batchId}`);
  },
};

/**
 * Folder API methods
 */
export const folderApi = {
  /**
   * Get all folders
   */
  async getFolders(): Promise<Folder[]> {
    return apiRequest<Folder[]>(`${API_BASE}/folders`);
  },

  /**
   * Create or update a folder
   */
  async saveFolder(folder: Folder): Promise<{ success: boolean; id: string }> {
    return apiRequest<{ success: boolean; id: string }>(`${API_BASE}/folders`, {
      method: 'POST',
      body: JSON.stringify(folder),
    });
  },

  /**
   * Delete a folder
   */
  async deleteFolder(folderId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`${API_BASE}/folders?id=${folderId}`, {
      method: 'DELETE',
    });
  },
};
