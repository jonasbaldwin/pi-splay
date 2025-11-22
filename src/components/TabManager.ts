import { Tab, Tile } from '../types';

export class TabManager {
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;
  private tabBarElement: HTMLElement | null = null;
  private onTabChangeCallback: ((tabId: string) => void) | null = null;
  private onTilesChangeCallback: ((tabId: string, tiles: Tile[]) => void) | null = null;

  constructor(tabBarElement: HTMLElement) {
    this.tabBarElement = tabBarElement;
    this.initializeTabs();
    this.renderTabs();
  }

  public setOnTabChange(callback: (tabId: string) => void): void {
    this.onTabChangeCallback = callback;
  }

  public setOnTilesChange(callback: (tabId: string, tiles: Tile[]) => void): void {
    this.onTilesChangeCallback = callback;
  }

  private initializeTabs(): void {
    // Try to load from localStorage
    const savedTabs = this.loadFromStorage();
    if (savedTabs && savedTabs.length > 0) {
      this.tabs = savedTabs;
      // Try to load the saved active tab ID
      const savedActiveTabId = this.loadActiveTabId();
      // Validate that the saved tab ID still exists
      if (savedActiveTabId && this.tabs.find(t => t.id === savedActiveTabId)) {
        this.activeTabId = savedActiveTabId;
      } else {
        // Fall back to first tab if saved tab doesn't exist
        this.activeTabId = this.tabs[0].id;
        this.saveActiveTabId();
      }
    } else {
      // Check for old tiles format and migrate
      const oldTiles = this.migrateOldTiles();
      const defaultTab: Tab = {
        id: this.generateId(),
        name: 'default',
        tiles: oldTiles || []
      };
      this.tabs = [defaultTab];
      this.activeTabId = defaultTab.id;
      this.saveToStorage();
      this.saveActiveTabId();
    }
  }

  private migrateOldTiles(): Tile[] | null {
    try {
      const oldTiles = localStorage.getItem('pi-splay-tiles');
      if (oldTiles) {
        const tiles = JSON.parse(oldTiles) as Tile[];
        // Remove old storage after migration
        localStorage.removeItem('pi-splay-tiles');
        return tiles;
      }
    } catch (e) {
      console.error('🔵 DEBUG LOCALSTORAGE Failed to migrate old tiles:', e);
    }
    return null;
  }

  private generateId(): string {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getActiveTabId(): string | null {
    return this.activeTabId;
  }

  public getActiveTab(): Tab | null {
    if (!this.activeTabId) return null;
    return this.tabs.find(tab => tab.id === this.activeTabId) || null;
  }

  public getTilesForActiveTab(): Tile[] {
    const activeTab = this.getActiveTab();
    return activeTab ? activeTab.tiles : [];
  }

  public setTilesForActiveTab(tiles: Tile[]): void {
    if (!this.activeTabId) return;
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab) {
      tab.tiles = tiles;
      this.saveToStorage();
      if (this.onTilesChangeCallback) {
        this.onTilesChangeCallback(this.activeTabId, tiles);
      }
    }
  }

  public switchTab(tabId: string): void {
    if (this.tabs.find(t => t.id === tabId)) {
      this.activeTabId = tabId;
      this.saveActiveTabId();
      this.renderTabs();
      if (this.onTabChangeCallback) {
        this.onTabChangeCallback(tabId);
      }
    }
  }

  public createTab(name: string = 'New Tab'): string {
    const newTab: Tab = {
      id: this.generateId(),
      name: name,
      tiles: []
    };
    this.tabs.push(newTab);
    this.activeTabId = newTab.id;
    this.saveToStorage();
    this.saveActiveTabId();
    this.renderTabs();
    if (this.onTabChangeCallback) {
      this.onTabChangeCallback(newTab.id);
    }
    return newTab.id;
  }

  public renameTab(tabId: string, newName: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.name = newName;
      this.saveToStorage();
      this.renderTabs();
    }
  }

  public deleteTab(tabId: string): void {
    if (this.tabs.length <= 1) {
      // Don't allow deleting the last tab
      return;
    }
    this.tabs = this.tabs.filter(t => t.id !== tabId);
    if (this.activeTabId === tabId) {
      // Switch to first available tab
      this.activeTabId = this.tabs[0].id;
      this.saveActiveTabId();
      if (this.onTabChangeCallback) {
        this.onTabChangeCallback(this.activeTabId);
      }
    }
    this.saveToStorage();
    this.renderTabs();
  }

  public getAllTabs(): Tab[] {
    return [...this.tabs];
  }

  private renderTabs(): void {
    if (!this.tabBarElement) return;

    const tabsHtml = this.tabs.map(tab => {
      const isActive = tab.id === this.activeTabId;
      return `
        <div class="tab-item ${isActive ? 'active' : ''}" data-tab-id="${tab.id}">
          <span class="tab-name" data-tab-id="${tab.id}">${this.escapeHtml(tab.name)}</span>
          ${isActive ? `<button class="tab-rename-btn" data-tab-id="${tab.id}" aria-label="Rename tab">✎</button>` : ''}
          ${this.tabs.length > 1 ? `<button class="tab-delete-btn" data-tab-id="${tab.id}" aria-label="Delete tab">×</button>` : ''}
        </div>
      `;
    }).join('');

    this.tabBarElement.innerHTML = `
      <div class="tabs-container">
        ${tabsHtml}
        <button class="tab-add-btn" aria-label="Add new tab">+</button>
      </div>
    `;

    // Attach event listeners
    this.tabBarElement.querySelectorAll('.tab-item').forEach(item => {
      const tabId = item.getAttribute('data-tab-id');
      if (tabId) {
        item.addEventListener('click', (e) => {
          // Don't switch if clicking on rename or delete button
          if ((e.target as HTMLElement).classList.contains('tab-rename-btn') ||
              (e.target as HTMLElement).classList.contains('tab-delete-btn')) {
            return;
          }
          this.switchTab(tabId);
        });
      }
    });

    // Rename button handlers
    this.tabBarElement.querySelectorAll('.tab-rename-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tabId = btn.getAttribute('data-tab-id');
        if (tabId) {
          this.handleRenameTab(tabId);
        }
      });
    });

    // Delete button handlers
    this.tabBarElement.querySelectorAll('.tab-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tabId = btn.getAttribute('data-tab-id');
        if (tabId) {
          this.deleteTab(tabId);
        }
      });
    });

    // Add tab button
    const addBtn = this.tabBarElement.querySelector('.tab-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.handleCreateTab();
      });
    }
  }

  private handleRenameTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const tabItem = this.tabBarElement?.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
    const tabNameSpan = tabItem?.querySelector('.tab-name') as HTMLElement;
    if (!tabItem || !tabNameSpan) return;

    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = tab.name;
    input.className = 'tab-name-input';

    // Replace span with input
    const parent = tabNameSpan.parentElement;
    if (parent) {
      parent.replaceChild(input, tabNameSpan);
      input.focus();
      input.select();

      const saveRename = () => {
        const newName = input.value.trim();
        if (newName !== '' && newName !== tab.name) {
          this.renameTab(tabId, newName);
        } else {
          // Restore original name if empty or unchanged
          this.renderTabs();
        }
      };

      const cancelRename = () => {
        this.renderTabs();
      };

      input.addEventListener('blur', saveRename);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          input.blur(); // This will trigger saveRename
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelRename();
        }
      });
    }
  }

  private handleCreateTab(): void {
    const name = prompt('Enter tab name:', 'New Tab');
    if (name !== null && name.trim() !== '') {
      this.createTab(name.trim());
    } else if (name !== null) {
      // User pressed OK with empty name, use default
      this.createTab('New Tab');
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('pi-splay-tabs', JSON.stringify(this.tabs));
    } catch (e) {
      console.error('🔵 DEBUG LOCALSTORAGE Failed to save tabs to localStorage:', e);
      // Re-throw in development to make errors more visible
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        throw e;
      }
    }
  }

  private loadFromStorage(): Tab[] | null {
    try {
      const stored = localStorage.getItem('pi-splay-tabs');
      if (stored) {
        return JSON.parse(stored) as Tab[];
      }
    } catch (e) {
      console.error('🔵 DEBUG LOCALSTORAGE Failed to load tabs from localStorage:', e);
    }
    return null;
  }

  private saveActiveTabId(): void {
    try {
      if (this.activeTabId) {
        localStorage.setItem('pi-splay-active-tab-id', this.activeTabId);
      }
    } catch (e) {
      console.error('🔵 DEBUG LOCALSTORAGE Failed to save active tab ID to localStorage:', e);
    }
  }

  private loadActiveTabId(): string | null {
    try {
      return localStorage.getItem('pi-splay-active-tab-id');
    } catch (e) {
      console.error('🔵 DEBUG LOCALSTORAGE Failed to load active tab ID from localStorage:', e);
      return null;
    }
  }
}

