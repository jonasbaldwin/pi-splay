import { TestLoggerTileData, TestLogEntry } from '../types';

type SequenceType = 'alphabet' | 'greek' | 'numbers' | 'none';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'];

export class TestLoggerModule {
  private element: HTMLElement;
  private data: TestLoggerTileData;

  constructor(element: HTMLElement, data: TestLoggerTileData) {
    this.element = element;
    this.data = data;
    
    // Initialize defaults
    if (!this.data.description) this.data.description = '';
    if (!this.data.primaryType) this.data.primaryType = 'alphabet';
    if (this.data.secondaryType === undefined) this.data.secondaryType = 'none';
    if (this.data.tertiaryType === undefined) this.data.tertiaryType = 'none';
    if (this.data.quaternaryType === undefined) this.data.quaternaryType = 'none';
    if (this.data.primaryIndex === undefined) this.data.primaryIndex = 0;
    if (this.data.secondaryIndex === undefined) this.data.secondaryIndex = 0;
    if (this.data.tertiaryIndex === undefined) this.data.tertiaryIndex = 0;
    if (this.data.quaternaryIndex === undefined) this.data.quaternaryIndex = 0;
    if (this.data.primaryDelimiter === undefined) this.data.primaryDelimiter = '.';
    if (this.data.secondaryDelimiter === undefined) this.data.secondaryDelimiter = '.';
    if (this.data.tertiaryDelimiter === undefined) this.data.tertiaryDelimiter = '.';
    if (this.data.quaternaryDelimiter === undefined) this.data.quaternaryDelimiter = '.';
    if (!this.data.logs) this.data.logs = [];
    if (!this.data.previewNote) this.data.previewNote = '';
    if (this.data.keepNote === undefined) this.data.keepNote = false;
    
    this.initialize();
  }

  private getSequenceValue(type: SequenceType, index: number): string | null {
    switch (type) {
      case 'alphabet':
        return ALPHABET[index % ALPHABET.length] + (index >= ALPHABET.length ? Math.floor(index / ALPHABET.length).toString() : '');
      case 'greek':
        return GREEK[index % GREEK.length] + (index >= GREEK.length ? Math.floor(index / GREEK.length).toString() : '');
      case 'numbers':
        return index.toString();
      case 'none':
        return null;
    }
  }

  private buildSequenceString(): string {
    let result = this.data.description || '';
    
    const primary = this.getSequenceValue(this.data.primaryType, this.data.primaryIndex);
    if (primary) {
      // Only add delimiter if there's a description
      if (result) {
        result += this.data.primaryDelimiter;
      }
      result += primary;
    }
    
    const secondary = this.getSequenceValue(this.data.secondaryType, this.data.secondaryIndex);
    if (secondary) {
      result += this.data.secondaryDelimiter + secondary;
    }
    
    const tertiary = this.getSequenceValue(this.data.tertiaryType, this.data.tertiaryIndex);
    if (tertiary) {
      result += this.data.tertiaryDelimiter + tertiary;
    }
    
    const quaternary = this.getSequenceValue(this.data.quaternaryType, this.data.quaternaryIndex);
    if (quaternary) {
      result += this.data.quaternaryDelimiter + quaternary;
    }
    
    return result;
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  private increment(level: 'primary' | 'secondary' | 'tertiary' | 'quaternary'): void {
    // Increment the specified level and reset sub-levels (no clipboard copy)
    switch (level) {
      case 'primary':
        this.data.primaryIndex++;
        this.data.secondaryIndex = 0;
        this.data.tertiaryIndex = 0;
        this.data.quaternaryIndex = 0;
        break;
      case 'secondary':
        this.data.secondaryIndex++;
        this.data.tertiaryIndex = 0;
        this.data.quaternaryIndex = 0;
        break;
      case 'tertiary':
        this.data.tertiaryIndex++;
        this.data.quaternaryIndex = 0;
        break;
      case 'quaternary':
        this.data.quaternaryIndex++;
        break;
    }
    
    this.saveToStorage();
    this.render();
  }

  private incrementSmallest(): void {
    // Increment the smallest active sequence
    if (this.data.quaternaryType !== 'none') {
      this.data.quaternaryIndex++;
    } else if (this.data.tertiaryType !== 'none') {
      this.data.tertiaryIndex++;
    } else if (this.data.secondaryType !== 'none') {
      this.data.secondaryIndex++;
    } else {
      this.data.primaryIndex++;
    }
  }

  private logAction(): void {
    // Copy current sequence to clipboard (without note)
    const sequenceString = this.buildSequenceString();
    this.copyToClipboard(sequenceString);
    
    // Add log entry with current value and note
    const entry: TestLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sequence: sequenceString,
      notes: this.data.previewNote || '',
      timestamp: Date.now()
    };
    this.data.logs.unshift(entry);
    
    // Clear note unless keepNote is enabled
    if (!this.data.keepNote) {
      this.data.previewNote = '';
    }
    
    // Increment the smallest active sequence
    this.incrementSmallest();
    
    this.saveToStorage();
    this.render();
  }

  private clearAll(): void {
    this.data.description = '';
    this.data.primaryIndex = 0;
    this.data.secondaryIndex = 0;
    this.data.tertiaryIndex = 0;
    this.data.quaternaryIndex = 0;
    this.data.logs = [];
    if (!this.data.keepNote) {
      this.data.previewNote = '';
    }
    this.saveToStorage();
    this.render();
  }

  private saveToStorage(): void {
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  private initialize(): void {
    this.render();
  }

  private render(): void {
    const sequenceOptionsWithNone = (selected: string) => `
      <option value="none" ${selected === 'none' ? 'selected' : ''}>None</option>
      <option value="alphabet" ${selected === 'alphabet' ? 'selected' : ''}>Alphabet (A-Z)</option>
      <option value="greek" ${selected === 'greek' ? 'selected' : ''}>Greek (α-ω)</option>
      <option value="numbers" ${selected === 'numbers' ? 'selected' : ''}>Numbers (0-n)</option>
    `;
    
    const sequenceOptionsNoNone = (selected: string) => `
      <option value="alphabet" ${selected === 'alphabet' ? 'selected' : ''}>Alphabet (A-Z)</option>
      <option value="greek" ${selected === 'greek' ? 'selected' : ''}>Greek (α-ω)</option>
      <option value="numbers" ${selected === 'numbers' ? 'selected' : ''}>Numbers (0-n)</option>
    `;

    const secondaryEnabled = this.data.secondaryType !== 'none';
    const tertiaryEnabled = this.data.tertiaryType !== 'none';
    const quaternaryEnabled = this.data.quaternaryType !== 'none';
    
    // Show tertiary only if secondary is enabled
    const showTertiary = secondaryEnabled;
    // Show quaternary only if tertiary is enabled
    const showQuaternary = tertiaryEnabled;

    this.element.innerHTML = `
      <div class="test-logger-module">
        <div class="test-logger-header">
          <h3 class="test-logger-title">Test Logger</h3>
          <button class="test-logger-help-btn" data-help title="Help">?</button>
          <button class="test-logger-clear-btn" data-clear title="Clear all">Clear</button>
        </div>
        
        <div class="test-logger-form">
          <div class="test-logger-description">
            <input type="text" 
                   class="test-logger-input" 
                   data-description 
                   placeholder="Test identifier (optional)"
                   value="${this.escapeHtml(this.data.description)}">
          </div>
          
          <div class="test-logger-sequences">
            <div class="test-logger-sequence-header">
              <span class="header-del">Del</span>
              <span class="header-seq">Sequence</span>
              <span class="header-val"></span>
              <span class="header-inc">Inc</span>
            </div>
            <div class="test-logger-sequence primary">
              <input type="text" class="delimiter-input" data-delimiter="primary" maxlength="1" value="${this.escapeHtml(this.data.primaryDelimiter)}" title="Delimiter">
              <select data-seq-type="primary">
                ${sequenceOptionsNoNone(this.data.primaryType)}
              </select>
              <span class="sequence-value">${this.getSequenceValue(this.data.primaryType, this.data.primaryIndex)}</span>
              <button class="increment-btn" data-increment="primary" title="Increment primary">+</button>
            </div>
            
            <div class="test-logger-sequence secondary">
              <input type="text" class="delimiter-input" data-delimiter="secondary" maxlength="1" value="${this.escapeHtml(this.data.secondaryDelimiter)}" title="Delimiter" ${!secondaryEnabled ? 'disabled' : ''}>
              <select data-seq-type="secondary">
                ${sequenceOptionsWithNone(this.data.secondaryType)}
              </select>
              <span class="sequence-value">${secondaryEnabled ? this.getSequenceValue(this.data.secondaryType, this.data.secondaryIndex) : '-'}</span>
              <button class="increment-btn" data-increment="secondary" ${!secondaryEnabled ? 'disabled' : ''} title="Increment secondary">+</button>
            </div>
            
            <div class="test-logger-sequence tertiary" style="${showTertiary ? '' : 'display: none;'}">
              <input type="text" class="delimiter-input" data-delimiter="tertiary" maxlength="1" value="${this.escapeHtml(this.data.tertiaryDelimiter)}" title="Delimiter" ${!tertiaryEnabled ? 'disabled' : ''}>
              <select data-seq-type="tertiary">
                ${sequenceOptionsWithNone(this.data.tertiaryType)}
              </select>
              <span class="sequence-value">${tertiaryEnabled ? this.getSequenceValue(this.data.tertiaryType, this.data.tertiaryIndex) : '-'}</span>
              <button class="increment-btn" data-increment="tertiary" ${!tertiaryEnabled ? 'disabled' : ''} title="Increment tertiary">+</button>
            </div>
            
            <div class="test-logger-sequence quaternary" style="${showQuaternary ? '' : 'display: none;'}">
              <input type="text" class="delimiter-input" data-delimiter="quaternary" maxlength="1" value="${this.escapeHtml(this.data.quaternaryDelimiter)}" title="Delimiter" ${!quaternaryEnabled ? 'disabled' : ''}>
              <select data-seq-type="quaternary">
                ${sequenceOptionsWithNone(this.data.quaternaryType)}
              </select>
              <span class="sequence-value">${quaternaryEnabled ? this.getSequenceValue(this.data.quaternaryType, this.data.quaternaryIndex) : '-'}</span>
              <button class="increment-btn" data-increment="quaternary" ${!quaternaryEnabled ? 'disabled' : ''} title="Increment quaternary">+</button>
            </div>
          </div>
          
          <div class="test-logger-preview">
            <div class="preview-row">
              <span class="preview-label">Preview:</span>
              <code class="preview-value">${this.escapeHtml(this.buildSequenceString()) || '(empty)'}</code>
              <button class="log-btn" data-log-action title="Copy and log">Log</button>
            </div>
            <div class="preview-note-row">
              <input type="text" 
                     class="preview-note-input" 
                     data-preview-note 
                     placeholder="Note (optional)"
                     value="${this.escapeHtml(this.data.previewNote || '')}">
              <label class="keep-note-label">
                <input type="checkbox" data-keep-note ${this.data.keepNote ? 'checked' : ''}>
                Keep note
              </label>
            </div>
          </div>
        </div>
        
        <div class="test-logger-logs">
          <div class="logs-header">Log:</div>
          <div class="logs-list" data-logs-list>
            ${this.data.logs.length === 0 
              ? '<div class="log-placeholder">No logs yet. Click + to increment and log.</div>'
              : this.data.logs.map(log => `
                <div class="log-entry" data-log-id="${log.id}">
                  <button class="log-star-btn ${log.starred ? 'starred' : ''}" data-star-log="${log.id}" title="Star">★</button>
                  <code class="log-sequence">${this.escapeHtml(log.sequence)}</code>
                  <input type="text" 
                         class="log-notes" 
                         data-log-notes="${log.id}"
                         placeholder="Result notes..."
                         value="${this.escapeHtml(log.notes || '')}">
                  <button class="log-remove-btn" data-remove-log="${log.id}" title="Remove">×</button>
                </div>
              `).join('')
            }
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Help button
    this.element.querySelector('[data-help]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showHelp();
    });

    // Clear button
    this.element.querySelector('[data-clear]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearAll();
    });

    // Description input
    const descInput = this.element.querySelector('[data-description]') as HTMLInputElement;
    descInput?.addEventListener('input', (e) => {
      this.data.description = (e.target as HTMLInputElement).value;
      this.updatePreview();
      this.saveToStorage();
    });

    // Preview note input
    const previewNoteInput = this.element.querySelector('[data-preview-note]') as HTMLInputElement;
    previewNoteInput?.addEventListener('input', (e) => {
      this.data.previewNote = (e.target as HTMLInputElement).value;
      this.saveToStorage();
    });

    // Keep note checkbox
    const keepNoteCheckbox = this.element.querySelector('[data-keep-note]') as HTMLInputElement;
    keepNoteCheckbox?.addEventListener('change', (e) => {
      e.stopPropagation();
      this.data.keepNote = (e.target as HTMLInputElement).checked;
      this.saveToStorage();
    });

    // Log button
    this.element.querySelector('[data-log-action]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.logAction();
    });

    // Sequence type selects
    this.element.querySelectorAll('[data-seq-type]').forEach(select => {
      select.addEventListener('change', (e) => {
        e.stopPropagation();
        const level = (e.target as HTMLSelectElement).getAttribute('data-seq-type') as 'primary' | 'secondary' | 'tertiary' | 'quaternary';
        const value = (e.target as HTMLSelectElement).value as SequenceType;
        (this.data as any)[`${level}Type`] = value;
        (this.data as any)[`${level}Index`] = 0; // Reset index when type changes
        
        // If disabling a level, also disable child levels
        if (value === 'none') {
          if (level === 'secondary') {
            this.data.tertiaryType = 'none';
            this.data.tertiaryIndex = 0;
            this.data.quaternaryType = 'none';
            this.data.quaternaryIndex = 0;
          } else if (level === 'tertiary') {
            this.data.quaternaryType = 'none';
            this.data.quaternaryIndex = 0;
          }
        }
        
        this.saveToStorage();
        this.render();
      });
    });

    // Delimiter inputs
    this.element.querySelectorAll('[data-delimiter]').forEach(input => {
      input.addEventListener('focus', (e) => {
        (e.target as HTMLInputElement).select();
      });
      input.addEventListener('input', (e) => {
        e.stopPropagation();
        const level = (e.target as HTMLInputElement).getAttribute('data-delimiter') as 'primary' | 'secondary' | 'tertiary' | 'quaternary';
        const value = (e.target as HTMLInputElement).value.slice(0, 1); // Ensure max 1 char
        (this.data as any)[`${level}Delimiter`] = value;
        this.updatePreview();
        this.saveToStorage();
      });
    });

    // Increment buttons
    this.element.querySelectorAll('[data-increment]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const level = (e.target as HTMLButtonElement).getAttribute('data-increment') as 'primary' | 'secondary' | 'tertiary' | 'quaternary';
        this.increment(level);
      });
    });

    // Log notes inputs
    this.element.querySelectorAll('[data-log-notes]').forEach(input => {
      input.addEventListener('input', (e) => {
        const logId = (e.target as HTMLInputElement).getAttribute('data-log-notes');
        const log = this.data.logs.find(l => l.id === logId);
        if (log) {
          log.notes = (e.target as HTMLInputElement).value;
          this.saveToStorage();
        }
      });
    });

    // Remove log buttons
    this.element.querySelectorAll('[data-remove-log]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const logId = (e.target as HTMLButtonElement).getAttribute('data-remove-log');
        this.data.logs = this.data.logs.filter(l => l.id !== logId);
        this.saveToStorage();
        this.render();
      });
    });

    // Star log buttons
    this.element.querySelectorAll('[data-star-log]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const logId = (e.target as HTMLButtonElement).getAttribute('data-star-log');
        const log = this.data.logs.find(l => l.id === logId);
        if (log) {
          log.starred = !log.starred;
          this.saveToStorage();
          this.render();
        }
      });
    });
  }

  private updatePreview(): void {
    const previewEl = this.element.querySelector('.preview-value');
    if (previewEl) {
      const preview = this.buildSequenceString();
      previewEl.textContent = preview || '(empty)';
    }
  }

  private showHelp(): void {
    const helpModal = document.createElement('div');
    helpModal.className = 'test-logger-help-modal';
    helpModal.innerHTML = `
      <div class="help-content">
        <button class="help-close-btn">×</button>
        <h3>Test Logger</h3>
        <p>This is a tool to help you when you are testing or debugging a feature by producing unique, sequential identifiers.</p>
        <p>It logs tests for you and helps you identify them in a unique way. When you tap the log button a unique value is copied to the clipboard that you can use in your tests.</p>
        <p><strong>Examples of how to use this:</strong></p>
        <ul>
          <li>When testing a form, add the produced test log identifier as the value of one of the fields, if it's saved to the database you know that this test was successful</li>
          <li>When debugging a feature, add the log identifier to multiple parts of your log, you can track progress of the application by seeing which logs printed and which didn't</li>
          <li>When a feature works as expected, mark the log with a star, if the feature stops working, you can look in your logs to see what worked and revert your code to a point you know was working</li>
        </ul>
        <p><strong>How it works:</strong></p>
        <ul>
          <li>Add optional text to the beginning of the test identifier for your test</li>
          <li>Choose sequence types (alphabet, Greek letters, or numbers)</li>
          <li>Click <strong>+</strong> to increment a sequence—this serves as a marker when you changed the code or something about your test</li>
          <li>Incrementing a sequence resets all sub-sequences</li>
          <li>Use the log notes to record what you're testing or the test results</li>
          <li>Tapping "Log" adds a new log entry and copies the log identifier sequence to your clipboard</li>
        </ul>
        <p>Example: <code>widget test.A.4.0</code> → <code>widget test.A.4.1</code></p>
      </div>
    `;
    
    document.body.appendChild(helpModal);
    
    const closeBtn = helpModal.querySelector('.help-close-btn');
    closeBtn?.addEventListener('click', () => helpModal.remove());
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.remove();
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public updateData(data: TestLoggerTileData): void {
    this.data = data;
    this.render();
  }

  public destroy(): void {
    // Cleanup if needed
  }
}

