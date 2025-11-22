import { NumberConverterTileData } from '../types';

export class NumberConverterModule {
  private element: HTMLElement;
  private data: NumberConverterTileData;
  private decimalInput!: HTMLInputElement;
  private binaryInput!: HTMLInputElement;
  private hexInput!: HTMLInputElement;
  private octalInput!: HTMLInputElement;
  private updating: boolean = false;

  constructor(element: HTMLElement, data: NumberConverterTileData) {
    this.element = element;
    // Ensure data is always a valid object
    this.data = data || {};
    this.initialize();
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="number-converter-module">
        <div class="number-converter-header">
          <div class="number-converter-title">Number Converter</div>
        </div>
        <div class="number-converter-inputs">
          <div class="number-input-group">
            <label class="number-input-label">Decimal:</label>
            <div class="number-input-container">
              <div class="number-input-with-prefix">
                <span class="number-prefix"></span>
                <input 
                  type="text" 
                  class="number-input" 
                  data-decimal-input
                  placeholder="0"
                  inputmode="numeric"
                />
              </div>
              <button class="number-copy-btn" data-copy-decimal title="Copy decimal value">Copy</button>
            </div>
          </div>
          <div class="number-input-group">
            <label class="number-input-label">Binary:</label>
            <div class="number-input-container">
              <div class="number-input-with-prefix">
                <span class="number-prefix">0b</span>
                <input 
                  type="text" 
                  class="number-input" 
                  data-binary-input
                  placeholder="0"
                  inputmode="numeric"
                />
              </div>
              <button class="number-copy-btn" data-copy-binary title="Copy binary value">Copy</button>
            </div>
          </div>
          <div class="number-input-group">
            <label class="number-input-label">Hexadecimal:</label>
            <div class="number-input-container">
              <div class="number-input-with-prefix">
                <span class="number-prefix">0x</span>
                <input 
                  type="text" 
                  class="number-input" 
                  data-hex-input
                  placeholder="0"
                  inputmode="numeric"
                />
              </div>
              <button class="number-copy-btn" data-copy-hex title="Copy hexadecimal value">Copy</button>
            </div>
          </div>
          <div class="number-input-group">
            <label class="number-input-label">Octal:</label>
            <div class="number-input-container">
              <div class="number-input-with-prefix">
                <span class="number-prefix">0o</span>
                <input 
                  type="text" 
                  class="number-input" 
                  data-octal-input
                  placeholder="0"
                  inputmode="numeric"
                />
              </div>
              <button class="number-copy-btn" data-copy-octal title="Copy octal value">Copy</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.decimalInput = this.element.querySelector('[data-decimal-input]')! as HTMLInputElement;
    this.binaryInput = this.element.querySelector('[data-binary-input]')! as HTMLInputElement;
    this.hexInput = this.element.querySelector('[data-hex-input]')! as HTMLInputElement;
    this.octalInput = this.element.querySelector('[data-octal-input]')! as HTMLInputElement;

    // Initialize with stored value or default to 42
    const initialValue = this.data.value !== undefined ? this.data.value : 42;
    this.updateFromDecimal(initialValue);

    // Add copy button handlers
    this.element.querySelector('[data-copy-decimal]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.copyDecimal();
    });
    this.element.querySelector('[data-copy-binary]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.copyBinary();
    });
    this.element.querySelector('[data-copy-hex]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.copyHex();
    });
    this.element.querySelector('[data-copy-octal]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.copyOctal();
    });

    // Add input handlers
    this.decimalInput.addEventListener('input', () => this.handleDecimalInput());
    this.binaryInput.addEventListener('input', () => {
      // Only allow 0 and 1
      this.binaryInput.value = this.binaryInput.value.replace(/[^01]/g, '');
      this.handleBinaryInput();
    });
    this.hexInput.addEventListener('input', () => {
      // Only allow 0-9, a-f, A-F
      this.hexInput.value = this.hexInput.value.replace(/[^0-9a-fA-F]/g, '');
      this.handleHexInput();
    });
    this.octalInput.addEventListener('input', () => {
      // Only allow 0-7
      this.octalInput.value = this.octalInput.value.replace(/[^0-7]/g, '');
      this.handleOctalInput();
    });

    // Handle paste events
    this.decimalInput.addEventListener('paste', (e) => this.handlePaste(e, 'decimal'));
    this.binaryInput.addEventListener('paste', (e) => this.handlePaste(e, 'binary'));
    this.hexInput.addEventListener('paste', (e) => this.handlePaste(e, 'hex'));
    this.octalInput.addEventListener('paste', (e) => this.handlePaste(e, 'octal'));
  }

  private handlePaste(e: ClipboardEvent, type: 'decimal' | 'binary' | 'hex' | 'octal'): void {
    e.preventDefault();
    const pastedText = (e.clipboardData || (window as any).clipboardData).getData('text');
    
    // Try to parse the pasted value
    let value: number | null = null;
    
    if (type === 'decimal') {
      value = this.parseDecimal(pastedText);
    } else if (type === 'binary') {
      value = this.parseBinary(pastedText);
    } else if (type === 'hex') {
      value = this.parseHex(pastedText);
    } else if (type === 'octal') {
      value = this.parseOctal(pastedText);
    }
    
    if (value !== null) {
      this.updateFromDecimal(value);
    }
  }

  private parseDecimal(value: string): number | null {
    const cleaned = value.trim().replace(/[^\d-]/g, '');
    if (cleaned === '' || cleaned === '-') return null;
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  }

  private parseBinary(value: string): number | null {
    // Remove 0b prefix if present, and any whitespace
    const cleaned = value.trim().replace(/^0[bB]/, '').replace(/[^01]/g, '');
    if (cleaned === '') return null;
    const num = parseInt(cleaned, 2);
    return isNaN(num) ? null : num;
  }

  private parseHex(value: string): number | null {
    // Remove 0x prefix if present, and any whitespace
    const cleaned = value.trim().replace(/^0[xX]/, '').replace(/[^0-9a-fA-F]/g, '');
    if (cleaned === '') return null;
    const num = parseInt(cleaned, 16);
    return isNaN(num) ? null : num;
  }

  private parseOctal(value: string): number | null {
    // Remove 0o prefix if present, and any whitespace
    const cleaned = value.trim().replace(/^0[oO]/, '').replace(/[^0-7]/g, '');
    if (cleaned === '') return null;
    const num = parseInt(cleaned, 8);
    return isNaN(num) ? null : num;
  }

  private handleDecimalInput(): void {
    if (this.updating) return;
    const value = this.parseDecimal(this.decimalInput.value);
    if (value !== null) {
      this.updateFromDecimal(value);
    } else if (this.decimalInput.value.trim() === '' || this.decimalInput.value === '-') {
      this.clearAll();
    }
  }

  private handleBinaryInput(): void {
    if (this.updating) return;
    const value = this.parseBinary(this.binaryInput.value);
    if (value !== null) {
      this.updateFromDecimal(value);
    } else if (this.binaryInput.value.trim() === '') {
      this.clearAll();
    }
  }

  private handleHexInput(): void {
    if (this.updating) return;
    const value = this.parseHex(this.hexInput.value);
    if (value !== null) {
      this.updateFromDecimal(value);
    } else if (this.hexInput.value.trim() === '') {
      this.clearAll();
    }
  }

  private handleOctalInput(): void {
    if (this.updating) return;
    const value = this.parseOctal(this.octalInput.value);
    if (value !== null) {
      this.updateFromDecimal(value);
    } else if (this.octalInput.value.trim() === '') {
      this.clearAll();
    }
  }

  private updateFromDecimal(decimal: number): void {
    this.updating = true;
    
    // Store the value
    this.data.value = decimal;
    this.saveToStorage();
    
    // Update decimal (no prefix)
    this.decimalInput.value = decimal.toString();
    
    // Update binary (with 0b prefix, but prefix is not editable)
    const binary = Math.abs(decimal).toString(2);
    this.binaryInput.value = binary;
    
    // Update hex (with 0x prefix, but prefix is not editable)
    const hex = Math.abs(decimal).toString(16).toUpperCase();
    this.hexInput.value = hex;
    
    // Update octal (with 0o prefix, but prefix is not editable)
    const octal = Math.abs(decimal).toString(8);
    this.octalInput.value = octal;
    
    this.updating = false;
  }

  private clearAll(): void {
    this.updating = true;
    this.decimalInput.value = '';
    this.binaryInput.value = '';
    this.hexInput.value = '';
    this.octalInput.value = '';
    this.data.value = undefined;
    this.saveToStorage();
    this.updating = false;
  }

  private copyDecimal(): void {
    try {
      const value = this.decimalInput.value;
      if (value) {
        navigator.clipboard.writeText(value).catch(err => {
          console.error('Failed to copy decimal:', err);
        });
      }
    } catch (err) {
      console.error('Error in copyDecimal:', err);
    }
  }

  private copyBinary(): void {
    try {
      const value = this.binaryInput.value;
      if (value) {
        navigator.clipboard.writeText(`0b${value}`).catch(err => {
          console.error('Failed to copy binary:', err);
        });
      }
    } catch (err) {
      console.error('Error in copyBinary:', err);
    }
  }

  private copyHex(): void {
    try {
      const value = this.hexInput.value;
      if (value) {
        navigator.clipboard.writeText(`0x${value}`).catch(err => {
          console.error('Failed to copy hex:', err);
        });
      }
    } catch (err) {
      console.error('Error in copyHex:', err);
    }
  }

  private copyOctal(): void {
    try {
      const value = this.octalInput.value;
      if (value) {
        navigator.clipboard.writeText(`0o${value}`).catch(err => {
          console.error('Failed to copy octal:', err);
        });
      }
    } catch (err) {
      console.error('Error in copyOctal:', err);
    }
  }

  private saveToStorage(): void {
    // Notify TileManager to save
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  public updateData(data: NumberConverterTileData): void {
    this.data = data;
    // Restore the stored value or default to 42
    const value = this.data.value !== undefined ? this.data.value : 42;
    this.updateFromDecimal(value);
  }

  public destroy(): void {
    // No cleanup needed
  }
}

