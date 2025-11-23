import { UUIDTileData, UUIDEntry } from '../types';
import { v1 as uuidv1, v3 as uuidv3, v4 as uuidv4, v5 as uuidv5 } from 'uuid';

export class UUIDModule {
  private element: HTMLElement;
  private data: UUIDTileData;
  private uuidList!: HTMLElement;
  private versionSelect!: HTMLSelectElement;
  private versionInfoModal!: HTMLElement;

  constructor(element: HTMLElement, data: UUIDTileData) {
    this.element = element;
    this.data = data;
    
    // Initialize with default version if not set
    if (!this.data.version) {
      this.data.version = '4';
    }
    
    // Initialize UUIDs array if not set
    if (!this.data.uuids) {
      this.data.uuids = [];
    }
    
    // Clean up old UUIDs on initialization
    this.cleanupOldUUIDs();
    
    // Ensure we have 10 unused UUIDs
    this.ensureUnusedUUIDs();
    
    this.initialize();
  }

  private getVersionDescription(version: '1' | '3' | '4' | '5'): string {
    switch (version) {
      case '1':
        return 'Version 1 (Time-based): Generated using the current timestamp and MAC address. Provides temporal ordering and uniqueness based on time and network interface.';
      case '3':
        return 'Version 3 (Name-based, MD5): Generated from a namespace UUID and a name using MD5 hashing. Deterministic - same namespace and name always produce the same UUID.';
      case '4':
        return 'Version 4 (Random): Generated using random or pseudo-random numbers. Most common version, provides no ordering or predictability.';
      case '5':
        return 'Version 5 (Name-based, SHA-1): Generated from a namespace UUID and a name using SHA-1 hashing. Deterministic - same namespace and name always produce the same UUID. More secure than v3.';
      default:
        return '';
    }
  }

  private generateUUID(version: '1' | '3' | '4' | '5'): string {
    switch (version) {
      case '1':
        return uuidv1();
      case '3':
        // v3 requires a namespace and name - using a default namespace UUID and name
        const v3Namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
        const v3Name = `uuid-v3-${Date.now()}-${Math.random()}`;
        return uuidv3(v3Name, v3Namespace);
      case '4':
        return uuidv4();
      case '5':
        // v5 requires a namespace and name - using a default namespace UUID and name
        const v5Namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
        const v5Name = `uuid-v5-${Date.now()}-${Math.random()}`;
        return uuidv5(v5Name, v5Namespace);
      default:
        return uuidv4();
    }
  }

  private generateUnusedUUIDs(count: number, version: '1' | '3' | '4' | '5'): UUIDEntry[] {
    const uuids: UUIDEntry[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push({
        id: this.generateUUID(version),
        version,
        used: false,
        pinned: false,
        createdAt: Date.now()
      });
    }
    return uuids;
  }

  private ensureUnusedUUIDs(): void {
    // Get unused UUIDs of the current version (including pinned)
    const unusedUUIDs = this.data.uuids.filter(u => !u.used && u.version === this.data.version);
    const needed = 10 - unusedUUIDs.length;
    
    if (needed > 0) {
      // Generate new unused UUIDs
      const newUUIDs = this.generateUnusedUUIDs(needed, this.data.version);
      this.data.uuids.push(...newUUIDs);
    } else if (needed < 0) {
      // Remove excess unused UUIDs of current version (only unpinned ones)
      const unpinnedUnused = this.data.uuids.filter(u => !u.used && u.version === this.data.version && !u.pinned);
      unpinnedUnused.sort((a, b) => a.createdAt - b.createdAt); // Oldest first
      const excessCount = -needed;
      const toRemove = unpinnedUnused.slice(0, excessCount);
      this.data.uuids = this.data.uuids.filter(u => !toRemove.includes(u));
    }
  }

  private cleanupOldUUIDs(): void {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    this.data.uuids = this.data.uuids.filter(uuid => {
      // Keep pinned UUIDs
      if (uuid.pinned) {
        return true;
      }
      
      // Remove unused UUIDs
      if (!uuid.used) {
        return false;
      }
      
      // Remove used UUIDs that are older than 24 hours
      if (uuid.lastUsedAt && (now - uuid.lastUsedAt) > twentyFourHours) {
        return false;
      }
      
      return true;
    });
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="uuid-module">
        <div class="uuid-header">
          <h3 class="uuid-title">UUID Generator</h3>
          <div class="uuid-version-controls">
            <select class="uuid-version-select" data-version-select>
              <option value="1" ${this.data.version === '1' ? 'selected' : ''}>v1</option>
              <option value="3" ${this.data.version === '3' ? 'selected' : ''}>v3</option>
              <option value="4" ${this.data.version === '4' ? 'selected' : ''}>v4</option>
              <option value="5" ${this.data.version === '5' ? 'selected' : ''}>v5</option>
            </select>
            <button class="uuid-info-btn" data-version-info title="UUID version information">?</button>
          </div>
        </div>
        <div class="uuid-list" data-uuid-list></div>
        <div class="uuid-actions">
          <button class="uuid-remove-pins-btn" data-remove-pins>Remove all pins</button>
        </div>
        <div class="uuid-version-info-modal" data-version-info-modal style="display: none;">
          <div class="uuid-version-info-content">
            <div class="uuid-version-info-header">
              <h4>UUID Version Information</h4>
              <button class="uuid-version-info-close" data-version-info-close>×</button>
            </div>
            <div class="uuid-version-info-body" data-version-info-body></div>
          </div>
        </div>
      </div>
    `;

    this.uuidList = this.element.querySelector('[data-uuid-list]')!;
    this.versionSelect = this.element.querySelector('[data-version-select]') as HTMLSelectElement;
    this.versionInfoModal = this.element.querySelector('[data-version-info-modal]')!;

    // Handle version change
    this.versionSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      const newVersion = (e.target as HTMLSelectElement).value as '1' | '3' | '4' | '5';
      this.changeVersion(newVersion);
    });

    // Handle version info button
    this.element.querySelector('[data-version-info]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showVersionInfo();
    });

    // Handle version info close
    this.element.querySelector('[data-version-info-close]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideVersionInfo();
    });

    // Close modal when clicking outside
    this.versionInfoModal.addEventListener('click', (e) => {
      if (e.target === this.versionInfoModal) {
        this.hideVersionInfo();
      }
    });

    // Handle remove all pins button
    this.element.querySelector('[data-remove-pins]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeAllPins();
    });

    this.updateUUIDList();
  }

  private showVersionInfo(): void {
    const infoBody = this.element.querySelector('[data-version-info-body]') as HTMLElement;
    if (infoBody) {
      const versions: Array<'1' | '3' | '4' | '5'> = ['1', '3', '4', '5'];
      const descriptions = versions.map(version => {
        const desc = this.getVersionDescription(version);
        return `<div class="uuid-version-info-item"><strong>Version ${version}:</strong> ${desc}</div>`;
      }).join('<br><br>');
      infoBody.innerHTML = descriptions;
    }
    this.versionInfoModal.style.display = 'flex';
  }

  private hideVersionInfo(): void {
    this.versionInfoModal.style.display = 'none';
  }

  private removeAllPins(): void {
    this.data.uuids.forEach(uuid => {
      uuid.pinned = false;
    });
    this.updateUUIDList();
    this.saveToStorage();
  }

  private changeVersion(newVersion: '1' | '3' | '4' | '5'): void {
    // Update version
    this.data.version = newVersion;
    
    // Remove unpinned UUIDs
    this.data.uuids = this.data.uuids.filter(uuid => uuid.pinned);
    
    // Generate 10 new unused UUIDs
    const newUUIDs = this.generateUnusedUUIDs(10, newVersion);
    this.data.uuids.push(...newUUIDs);
    
    this.updateUUIDList();
    this.saveToStorage();
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  }

  private copyUUID(uuidEntry: UUIDEntry): void {
    navigator.clipboard.writeText(uuidEntry.id).then(() => {
      // Mark as used
      uuidEntry.used = true;
      uuidEntry.lastUsedAt = Date.now();
      
      // Ensure we still have 10 unused UUIDs
      this.ensureUnusedUUIDs();
      
      this.updateUUIDList();
      this.saveToStorage();
    }).catch(err => {
      console.error('Failed to copy UUID:', err);
    });
  }

  private togglePin(uuidEntry: UUIDEntry): void {
    uuidEntry.pinned = !uuidEntry.pinned;
    this.updateUUIDList();
    this.saveToStorage();
  }

  private removeUUID(uuidId: string): void {
    // Remove the UUID from the list
    this.data.uuids = this.data.uuids.filter(u => u.id !== uuidId);
    
    // Ensure we still have 10 unused UUIDs
    this.ensureUnusedUUIDs();
    
    this.updateUUIDList();
    this.saveToStorage();
  }

  private updateUUIDList(): void {
    // Separate UUIDs into categories
    const pinnedUUIDs = this.data.uuids.filter(u => u.pinned);
    const usedUUIDs = this.data.uuids.filter(u => u.used && !u.pinned);
    const unusedUUIDs = this.data.uuids.filter(u => !u.used && !u.pinned);
    
    // Sort used UUIDs by lastUsedAt desc (most recently used first)
    usedUUIDs.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
    
    // Sort unused UUIDs by createdAt desc (most recent first)
    unusedUUIDs.sort((a, b) => b.createdAt - a.createdAt);
    
    // Sort pinned UUIDs: used first (by lastUsedAt desc), then unused (by createdAt desc)
    pinnedUUIDs.sort((a, b) => {
      if (a.used && !b.used) return -1;
      if (!a.used && b.used) return 1;
      if (a.used && b.used) {
        return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
      }
      return b.createdAt - a.createdAt;
    });
    
    // Get first 3 unused UUIDs
    const displayUnusedUUIDs = unusedUUIDs.slice(0, 3);
    
    // Combine: pinned, used, then unused (3)
    const displayUUIDs: UUIDEntry[] = [];
    if (pinnedUUIDs.length > 0) displayUUIDs.push(...pinnedUUIDs);
    if (usedUUIDs.length > 0) displayUUIDs.push(...usedUUIDs);
    if (displayUnusedUUIDs.length > 0) displayUUIDs.push(...displayUnusedUUIDs);

    const uuidHtml = displayUUIDs.map(uuidEntry => {
      const isUsed = uuidEntry.used;
      const lastUsedText = uuidEntry.lastUsedAt ? this.formatTimestamp(uuidEntry.lastUsedAt) : '';
      const notes = uuidEntry.notes || '';
      const notesEscaped = notes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      
      return `
        <div class="uuid-item ${isUsed ? 'uuid-used' : ''} ${uuidEntry.pinned ? 'uuid-pinned' : ''}" data-uuid-id="${uuidEntry.id}">
          <div class="uuid-item-main">
            <button class="uuid-pin-btn" data-uuid-id="${uuidEntry.id}" data-action="pin" title="${uuidEntry.pinned ? 'Unpin' : 'Pin'}">
              ${uuidEntry.pinned ? '📌' : '📍'}
            </button>
            <div class="uuid-value" data-uuid-id="${uuidEntry.id}" data-action="copy">${uuidEntry.id}</div>
            <button class="uuid-copy-btn ${isUsed ? 'uuid-copy-used' : ''}" data-uuid-id="${uuidEntry.id}" data-action="copy" title="${isUsed ? `Copied ${lastUsedText}` : 'Copy'}">
              ${isUsed ? '✓' : 'Copy'}
            </button>
            ${isUsed ? `<button class="uuid-remove-btn" data-uuid-id="${uuidEntry.id}" data-action="remove" title="Remove UUID">×</button>` : ''}
            ${isUsed && lastUsedText ? `<div class="uuid-last-used">${lastUsedText}</div>` : ''}
          </div>
          <div class="uuid-item-notes">
            <div class="uuid-notes-display" data-uuid-id="${uuidEntry.id}" data-notes-display>${notesEscaped || '<span class="uuid-notes-placeholder">Click to add notes...</span>'}</div>
            <div class="uuid-notes-edit" contenteditable="true" data-uuid-id="${uuidEntry.id}" data-notes-edit style="display: none;">${notes}</div>
          </div>
        </div>
      `;
    }).join('');

    this.uuidList.innerHTML = uuidHtml;

    // Add event listeners
    this.uuidList.querySelectorAll('[data-action="copy"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const uuidId = (el as HTMLElement).getAttribute('data-uuid-id');
        if (uuidId) {
          const uuidEntry = this.data.uuids.find(u => u.id === uuidId);
          if (uuidEntry) {
            this.copyUUID(uuidEntry);
          }
        }
      });
    });

    this.uuidList.querySelectorAll('[data-action="pin"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const uuidId = (el as HTMLElement).getAttribute('data-uuid-id');
        if (uuidId) {
          const uuidEntry = this.data.uuids.find(u => u.id === uuidId);
          if (uuidEntry) {
            this.togglePin(uuidEntry);
          }
        }
      });
    });

    this.uuidList.querySelectorAll('[data-action="remove"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const uuidId = (el as HTMLElement).getAttribute('data-uuid-id');
        if (uuidId) {
          this.removeUUID(uuidId);
        }
      });
    });

    // Handle notes editing for each UUID
    this.uuidList.querySelectorAll('[data-notes-display]').forEach(el => {
      const displayEl = el as HTMLElement;
      const uuidId = displayEl.getAttribute('data-uuid-id')!;
      const editEl = this.uuidList.querySelector(`[data-notes-edit][data-uuid-id="${uuidId}"]`) as HTMLElement;
      
      if (!editEl) return;
      
      displayEl.addEventListener('click', (e) => {
        e.stopPropagation();
        displayEl.style.display = 'none';
        editEl.style.display = 'block';
        editEl.focus();
        // Place cursor at the end
        const range = document.createRange();
        range.selectNodeContents(editEl);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      });
    });

    this.uuidList.querySelectorAll('[data-notes-edit]').forEach(el => {
      const editEl = el as HTMLElement;
      const uuidId = editEl.getAttribute('data-uuid-id')!;
      const displayEl = this.uuidList.querySelector(`[data-notes-display][data-uuid-id="${uuidId}"]`) as HTMLElement;
      
      if (!displayEl) return;
      
      editEl.addEventListener('blur', () => {
        this.saveUUIDNotes(uuidId, editEl, displayEl);
        editEl.style.display = 'none';
        displayEl.style.display = 'block';
      });

      editEl.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') || '';
        document.execCommand('insertText', false, text);
      });

      editEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);
            range.setStartAfter(br);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        if (e.key === 'Escape') {
          editEl.blur();
        }
      });
    });
  }

  private saveUUIDNotes(uuidId: string, editElement: HTMLElement, displayElement: HTMLElement): void {
    const uuidEntry = this.data.uuids.find(u => u.id === uuidId);
    if (!uuidEntry) return;

    // Extract text with line breaks preserved
    let html = editElement.innerHTML;
    html = html.replace(/<br\s*\/?>/gi, '\n');
    html = html.replace(/<\/div>\s*<div>/gi, '\n');
    html = html.replace(/<\/p>\s*<p>/gi, '\n');
    html = html.replace(/([^\n])<div>/gi, '$1\n');
    html = html.replace(/([^\n])<p>/gi, '$1\n');
    html = html.replace(/<\/div>([^\n<])/gi, '\n$1');
    html = html.replace(/<\/p>([^\n<])/gi, '\n$1');
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    
    uuidEntry.notes = text.replace(/\n{3,}/g, '\n\n');
    
    // Update display
    const notes = uuidEntry.notes || '';
    const notesEscaped = notes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    displayElement.innerHTML = notesEscaped || '<span class="uuid-notes-placeholder">Click to add notes...</span>';
    
    this.saveToStorage();
  }

  private saveToStorage(): void {
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  public updateData(data: UUIDTileData): void {
    this.data = data;
    
    // Initialize defaults if needed
    if (!this.data.version) {
      this.data.version = '4';
    }
    if (!this.data.uuids) {
      this.data.uuids = [];
    }
    
    // Clean up old UUIDs
    this.cleanupOldUUIDs();
    
    // Ensure we have 10 unused UUIDs
    this.ensureUnusedUUIDs();
    
    // Update version select
    if (this.versionSelect) {
      this.versionSelect.value = this.data.version;
    }
    
    this.updateUUIDList();
  }

  public destroy(): void {
    // Cleanup if needed
  }
}

