import { NanoIdTileData, NanoIdEntry } from '../types';
import { customAlphabet } from 'nanoid';

// Default nanoid alphabet
const DEFAULT_ALPHABET = '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_LENGTH = 21;

export class NanoIdModule {
  private element: HTMLElement;
  private data: NanoIdTileData;
  private nanoIdList!: HTMLElement;
  private alphabetInput!: HTMLInputElement;
  private lengthInput!: HTMLInputElement;

  constructor(element: HTMLElement, data: NanoIdTileData) {
    this.element = element;
    this.data = data;
    
    // Initialize with default alphabet if not set
    if (!this.data.alphabet) {
      this.data.alphabet = DEFAULT_ALPHABET;
    }
    
    // Initialize with default length if not set
    if (!this.data.length || this.data.length < 1) {
      this.data.length = DEFAULT_LENGTH;
    }
    
    // Initialize NanoIds array if not set
    if (!this.data.nanoIds) {
      this.data.nanoIds = [];
    }
    
    // Clean up old NanoIds on initialization
    this.cleanupOldNanoIds();
    
    // Ensure we have 10 unused NanoIds
    this.ensureUnusedNanoIds();
    
    this.initialize();
  }

  private generateNanoId(): string {
    const alphabet = this.data.alphabet || DEFAULT_ALPHABET;
    const length = this.data.length || DEFAULT_LENGTH;
    
    // Validate alphabet
    if (alphabet.length === 0) {
      // Fallback to default if alphabet is empty
      const generate = customAlphabet(DEFAULT_ALPHABET, length);
      return generate();
    }
    
    // Validate length
    const validLength = Math.max(1, Math.min(256, length)); // nanoid supports up to 256
    
    const generate = customAlphabet(alphabet, validLength);
    return generate();
  }

  private generateUnusedNanoIds(count: number): NanoIdEntry[] {
    const nanoIds: NanoIdEntry[] = [];
    for (let i = 0; i < count; i++) {
      nanoIds.push({
        id: this.generateNanoId(),
        used: false,
        pinned: false,
        createdAt: Date.now()
      });
    }
    return nanoIds;
  }

  private ensureUnusedNanoIds(): void {
    // Get unused NanoIds (including pinned)
    const unusedNanoIds = this.data.nanoIds.filter(n => !n.used);
    const needed = 10 - unusedNanoIds.length;
    
    if (needed > 0) {
      // Generate new unused NanoIds
      const newNanoIds = this.generateUnusedNanoIds(needed);
      this.data.nanoIds.push(...newNanoIds);
    } else if (needed < 0) {
      // Remove excess unused NanoIds (only unpinned ones)
      const unpinnedUnused = this.data.nanoIds.filter(n => !n.used && !n.pinned);
      unpinnedUnused.sort((a, b) => a.createdAt - b.createdAt); // Oldest first
      const excessCount = -needed;
      const toRemove = unpinnedUnused.slice(0, excessCount);
      this.data.nanoIds = this.data.nanoIds.filter(n => !toRemove.includes(n));
    }
  }

  private cleanupOldNanoIds(): void {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    this.data.nanoIds = this.data.nanoIds.filter(nanoId => {
      // Keep pinned NanoIds
      if (nanoId.pinned) {
        return true;
      }
      
      // Remove unused NanoIds
      if (!nanoId.used) {
        return false;
      }
      
      // Remove used NanoIds that are older than 24 hours
      if (nanoId.lastUsedAt && (now - nanoId.lastUsedAt) > twentyFourHours) {
        return false;
      }
      
      return true;
    });
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="nanoid-module">
        <div class="nanoid-header">
          <h3 class="nanoid-title">NanoId Generator</h3>
        </div>
        <div class="nanoid-config">
          <div class="nanoid-config-group">
            <label class="nanoid-config-label">Alphabet:</label>
            <input type="text" class="nanoid-alphabet-input" data-alphabet-input value="${this.data.alphabet}" />
          </div>
          <div class="nanoid-config-group">
            <label class="nanoid-config-label">Length:</label>
            <input type="number" class="nanoid-length-input" data-length-input value="${this.data.length}" min="1" max="256" />
          </div>
        </div>
        <div class="nanoid-list" data-nanoid-list></div>
        <div class="nanoid-actions">
          <button class="nanoid-remove-pins-btn" data-remove-pins>Remove all pins</button>
        </div>
      </div>
    `;

    this.nanoIdList = this.element.querySelector('[data-nanoid-list]')!;
    this.alphabetInput = this.element.querySelector('[data-alphabet-input]') as HTMLInputElement;
    this.lengthInput = this.element.querySelector('[data-length-input]') as HTMLInputElement;

    // Handle alphabet change
    this.alphabetInput.addEventListener('change', (e) => {
      e.stopPropagation();
      const newAlphabet = (e.target as HTMLInputElement).value;
      this.changeAlphabet(newAlphabet);
    });

    this.alphabetInput.addEventListener('blur', (e) => {
      e.stopPropagation();
      const newAlphabet = (e.target as HTMLInputElement).value;
      if (newAlphabet !== this.data.alphabet) {
        this.changeAlphabet(newAlphabet);
      }
    });

    // Handle length change
    this.lengthInput.addEventListener('change', (e) => {
      e.stopPropagation();
      const newLength = parseInt((e.target as HTMLInputElement).value, 10);
      this.changeLength(newLength);
    });

    this.lengthInput.addEventListener('blur', (e) => {
      e.stopPropagation();
      const newLength = parseInt((e.target as HTMLInputElement).value, 10);
      if (newLength !== this.data.length) {
        this.changeLength(newLength);
      }
    });

    // Handle remove all pins button
    this.element.querySelector('[data-remove-pins]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeAllPins();
    });

    this.updateNanoIdList();
  }

  private removeAllPins(): void {
    this.data.nanoIds.forEach(nanoId => {
      nanoId.pinned = false;
    });
    this.updateNanoIdList();
    this.saveToStorage();
  }

  private changeAlphabet(newAlphabet: string): void {
    // Update alphabet
    this.data.alphabet = newAlphabet || DEFAULT_ALPHABET;
    
    // Remove unpinned NanoIds
    this.data.nanoIds = this.data.nanoIds.filter(nanoId => nanoId.pinned);
    
    // Generate 10 new unused NanoIds
    const newNanoIds = this.generateUnusedNanoIds(10);
    this.data.nanoIds.push(...newNanoIds);
    
    this.updateNanoIdList();
    this.saveToStorage();
  }

  private changeLength(newLength: number): void {
    // Validate and update length
    const validLength = Math.max(1, Math.min(256, newLength || DEFAULT_LENGTH));
    this.data.length = validLength;
    
    // Update input if it was invalid
    if (this.lengthInput) {
      this.lengthInput.value = validLength.toString();
    }
    
    // Remove unpinned NanoIds
    this.data.nanoIds = this.data.nanoIds.filter(nanoId => nanoId.pinned);
    
    // Generate 10 new unused NanoIds
    const newNanoIds = this.generateUnusedNanoIds(10);
    this.data.nanoIds.push(...newNanoIds);
    
    this.updateNanoIdList();
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

  private copyNanoId(nanoIdEntry: NanoIdEntry): void {
    navigator.clipboard.writeText(nanoIdEntry.id).then(() => {
      // Mark as used
      nanoIdEntry.used = true;
      nanoIdEntry.lastUsedAt = Date.now();
      
      // Ensure we still have 10 unused NanoIds
      this.ensureUnusedNanoIds();
      
      this.updateNanoIdList();
      this.saveToStorage();
    }).catch(err => {
      console.error('Failed to copy NanoId:', err);
    });
  }

  private togglePin(nanoIdEntry: NanoIdEntry): void {
    nanoIdEntry.pinned = !nanoIdEntry.pinned;
    this.updateNanoIdList();
    this.saveToStorage();
  }

  private removeNanoId(nanoIdId: string): void {
    // Remove the NanoId from the list
    this.data.nanoIds = this.data.nanoIds.filter(n => n.id !== nanoIdId);
    
    // Ensure we still have 10 unused NanoIds
    this.ensureUnusedNanoIds();
    
    this.updateNanoIdList();
    this.saveToStorage();
  }

  private updateNanoIdList(): void {
    // Separate NanoIds into categories
    const pinnedNanoIds = this.data.nanoIds.filter(n => n.pinned);
    const usedNanoIds = this.data.nanoIds.filter(n => n.used && !n.pinned);
    const unusedNanoIds = this.data.nanoIds.filter(n => !n.used && !n.pinned);
    
    // Sort used NanoIds by lastUsedAt desc (most recently used first)
    usedNanoIds.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
    
    // Sort unused NanoIds by createdAt desc (most recent first)
    unusedNanoIds.sort((a, b) => b.createdAt - a.createdAt);
    
    // Sort pinned NanoIds: used first (by lastUsedAt desc), then unused (by createdAt desc)
    pinnedNanoIds.sort((a, b) => {
      if (a.used && !b.used) return -1;
      if (!a.used && b.used) return 1;
      if (a.used && b.used) {
        return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
      }
      return b.createdAt - a.createdAt;
    });
    
    // Get first 3 unused NanoIds
    const displayUnusedNanoIds = unusedNanoIds.slice(0, 3);
    
    // Combine: pinned, used, then unused (3)
    const displayNanoIds: NanoIdEntry[] = [];
    if (pinnedNanoIds.length > 0) displayNanoIds.push(...pinnedNanoIds);
    if (usedNanoIds.length > 0) displayNanoIds.push(...usedNanoIds);
    if (displayUnusedNanoIds.length > 0) displayNanoIds.push(...displayUnusedNanoIds);

    const nanoIdHtml = displayNanoIds.map(nanoIdEntry => {
      const isUsed = nanoIdEntry.used;
      const lastUsedText = nanoIdEntry.lastUsedAt ? this.formatTimestamp(nanoIdEntry.lastUsedAt) : '';
      const notes = nanoIdEntry.notes || '';
      const notesEscaped = notes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      
      return `
        <div class="nanoid-item ${isUsed ? 'nanoid-used' : ''} ${nanoIdEntry.pinned ? 'nanoid-pinned' : ''}" data-nanoid-id="${nanoIdEntry.id}">
          <div class="nanoid-item-main">
            <button class="nanoid-pin-btn" data-nanoid-id="${nanoIdEntry.id}" data-action="pin" title="${nanoIdEntry.pinned ? 'Unpin' : 'Pin'}">
              ${nanoIdEntry.pinned ? '📌' : '📍'}
            </button>
            <div class="nanoid-value" data-nanoid-id="${nanoIdEntry.id}" data-action="copy">${nanoIdEntry.id}</div>
            <button class="nanoid-copy-btn ${isUsed ? 'nanoid-copy-used' : ''}" data-nanoid-id="${nanoIdEntry.id}" data-action="copy" title="${isUsed ? `Copied ${lastUsedText}` : 'Copy'}">
              ${isUsed ? '✓' : 'Copy'}
            </button>
            ${isUsed ? `<button class="nanoid-remove-btn" data-nanoid-id="${nanoIdEntry.id}" data-action="remove" title="Remove NanoId">×</button>` : ''}
            ${isUsed && lastUsedText ? `<div class="nanoid-last-used">${lastUsedText}</div>` : ''}
          </div>
          <div class="nanoid-item-notes">
            <div class="nanoid-notes-display" data-nanoid-id="${nanoIdEntry.id}" data-notes-display>${notesEscaped || '<span class="nanoid-notes-placeholder">Click to add notes...</span>'}</div>
            <div class="nanoid-notes-edit" contenteditable="true" data-nanoid-id="${nanoIdEntry.id}" data-notes-edit style="display: none;">${notes}</div>
          </div>
        </div>
      `;
    }).join('');

    this.nanoIdList.innerHTML = nanoIdHtml;

    // Add event listeners
    this.nanoIdList.querySelectorAll('[data-action="copy"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const nanoIdId = (el as HTMLElement).getAttribute('data-nanoid-id');
        if (nanoIdId) {
          const nanoIdEntry = this.data.nanoIds.find(n => n.id === nanoIdId);
          if (nanoIdEntry) {
            this.copyNanoId(nanoIdEntry);
          }
        }
      });
    });

    this.nanoIdList.querySelectorAll('[data-action="pin"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const nanoIdId = (el as HTMLElement).getAttribute('data-nanoid-id');
        if (nanoIdId) {
          const nanoIdEntry = this.data.nanoIds.find(n => n.id === nanoIdId);
          if (nanoIdEntry) {
            this.togglePin(nanoIdEntry);
          }
        }
      });
    });

    this.nanoIdList.querySelectorAll('[data-action="remove"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const nanoIdId = (el as HTMLElement).getAttribute('data-nanoid-id');
        if (nanoIdId) {
          this.removeNanoId(nanoIdId);
        }
      });
    });

    // Handle notes editing for each NanoId
    this.nanoIdList.querySelectorAll('[data-notes-display]').forEach(el => {
      const displayEl = el as HTMLElement;
      const nanoIdId = displayEl.getAttribute('data-nanoid-id')!;
      const editEl = this.nanoIdList.querySelector(`[data-notes-edit][data-nanoid-id="${nanoIdId}"]`) as HTMLElement;
      
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

    this.nanoIdList.querySelectorAll('[data-notes-edit]').forEach(el => {
      const editEl = el as HTMLElement;
      const nanoIdId = editEl.getAttribute('data-nanoid-id')!;
      const displayEl = this.nanoIdList.querySelector(`[data-notes-display][data-nanoid-id="${nanoIdId}"]`) as HTMLElement;
      
      if (!displayEl) return;
      
      editEl.addEventListener('blur', () => {
        this.saveNanoIdNotes(nanoIdId, editEl, displayEl);
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

  private saveNanoIdNotes(nanoIdId: string, editElement: HTMLElement, displayElement: HTMLElement): void {
    const nanoIdEntry = this.data.nanoIds.find(n => n.id === nanoIdId);
    if (!nanoIdEntry) return;

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
    
    nanoIdEntry.notes = text.replace(/\n{3,}/g, '\n\n');
    
    // Update display
    const notes = nanoIdEntry.notes || '';
    const notesEscaped = notes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    displayElement.innerHTML = notesEscaped || '<span class="nanoid-notes-placeholder">Click to add notes...</span>';
    
    this.saveToStorage();
  }

  private saveToStorage(): void {
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  public updateData(data: NanoIdTileData): void {
    this.data = data;
    
    // Initialize defaults if needed
    if (!this.data.alphabet) {
      this.data.alphabet = DEFAULT_ALPHABET;
    }
    if (!this.data.length || this.data.length < 1) {
      this.data.length = DEFAULT_LENGTH;
    }
    if (!this.data.nanoIds) {
      this.data.nanoIds = [];
    }
    
    // Clean up old NanoIds
    this.cleanupOldNanoIds();
    
    // Ensure we have 10 unused NanoIds
    this.ensureUnusedNanoIds();
    
    // Update inputs
    if (this.alphabetInput) {
      this.alphabetInput.value = this.data.alphabet;
    }
    if (this.lengthInput) {
      this.lengthInput.value = this.data.length.toString();
    }
    
    this.updateNanoIdList();
  }

  public destroy(): void {
    // Cleanup if needed
  }
}

