import { EpochTileData } from '../types';
import { ClockManager } from '../utils/ClockManager';
import { formatDetailedElapsedTime, formatEpochToDateTime } from '../utils/time';

export class EpochModule {
  private element: HTMLElement;
  private data: EpochTileData;
  private epochDisplay!: HTMLElement;
  private input1!: HTMLInputElement;
  private input2!: HTMLInputElement;
  private labelA!: HTMLElement;
  private labelB!: HTMLElement;
  private comparisonDisplay!: HTMLElement;
  private scaleDisplay!: HTMLElement;
  private resultDisplay!: HTMLElement;
  private clockManager: ClockManager;
  private clockSubscriber: { onTick: () => void };

  constructor(element: HTMLElement, data: EpochTileData) {
    this.element = element;
    this.data = data;
    this.clockManager = ClockManager.getInstance();
    
    // Create clock subscriber
    this.clockSubscriber = {
      onTick: () => {
        this.updateEpoch();
        this.updateCalculation();
      }
    };
    
    this.initialize();
    this.updateEpoch(); // Initial update
    this.clockManager.subscribe(this.clockSubscriber);
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="epoch-module">
        <div class="epoch-header">
          <div class="epoch-label">Epoch:</div>
          <button class="epoch-copy-btn" data-copy-epoch title="Copy epoch number">Copy</button>
        </div>
        <div class="epoch-display" data-epoch-display></div>
        <div class="epoch-calculator">
          <div class="calculator-header">
            <div class="calculator-title">Calculator:</div>
            <button class="calculator-clear-btn" data-clear-inputs title="Clear inputs">Clear</button>
          </div>
          <div class="calculator-inputs">
            <div class="input-group">
              <div class="input-label-container">
                <span class="input-label">A:</span>
                <span class="input-label-value" data-label-a></span>
              </div>
              <input 
                type="text" 
                class="epoch-input" 
                data-epoch-input-1 
                placeholder="(or leave blank for NOW)"
                inputmode="numeric"
              />
            </div>
            <div class="input-group">
              <div class="input-label-container">
                <span class="input-label">B:</span>
                <span class="input-label-value" data-label-b></span>
              </div>
              <input 
                type="text" 
                class="epoch-input" 
                data-epoch-input-2 
                placeholder="(or leave blank for NOW)"
                inputmode="numeric"
              />
            </div>
          </div>
          <div class="calculator-comparison" data-comparison></div>
          <div class="calculator-scale" data-scale></div>
          <div class="calculator-result" data-calculator-result></div>
        </div>
      </div>
    `;

    this.epochDisplay = this.element.querySelector('[data-epoch-display]')!;
    this.input1 = this.element.querySelector('[data-epoch-input-1]')! as HTMLInputElement;
    this.input2 = this.element.querySelector('[data-epoch-input-2]')! as HTMLInputElement;
    this.labelA = this.element.querySelector('[data-label-a]')!;
    this.labelB = this.element.querySelector('[data-label-b]')!;
    this.comparisonDisplay = this.element.querySelector('[data-comparison]')!;
    this.scaleDisplay = this.element.querySelector('[data-scale]')!;
    this.resultDisplay = this.element.querySelector('[data-calculator-result]')!;
    
    // Load saved values
    if (this.data.inputA) {
      this.input1.value = this.data.inputA;
    }
    if (this.data.inputB) {
      this.input2.value = this.data.inputB;
    }
    
    // Add copy button handler
    this.element.querySelector('[data-copy-epoch]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyEpoch();
    });
    
    this.updateEpoch();
    this.updateCalculation();
    
    // Add input handlers with validation
    this.input1.addEventListener('input', () => {
      this.validateInput(this.input1);
      this.saveInputs();
      this.updateCalculation();
    });
    
    this.input1.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || (window as any).clipboardData).getData('text');
      const validated = this.validateEpochValue(pastedText);
      if (validated !== null) {
        this.input1.value = validated;
        this.saveInputs();
        this.updateCalculation();
      }
    });
    
    this.input2.addEventListener('input', () => {
      this.validateInput(this.input2);
      this.saveInputs();
      this.updateCalculation();
    });
    
    this.input2.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || (window as any).clipboardData).getData('text');
      const validated = this.validateEpochValue(pastedText);
      if (validated !== null) {
        this.input2.value = validated;
        this.saveInputs();
        this.updateCalculation();
      }
    });
    
    // Add clear button handler
    this.element.querySelector('[data-clear-inputs]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearInputs();
    });
  }

  private validateEpochValue(value: string): string | null {
    // Remove any whitespace
    const cleaned = value.trim();
    
    // Check if it's a valid number (only digits)
    if (!/^\d+$/.test(cleaned)) {
      return null;
    }
    
    return cleaned;
  }

  private validateInput(input: HTMLInputElement): void {
    const value = input.value;
    const validated = this.validateEpochValue(value);
    
    if (value && validated === null) {
      // Invalid input - remove non-numeric characters
      input.value = value.replace(/\D/g, '');
    } else if (validated !== null && validated !== value) {
      input.value = validated;
    }
  }

  private updateEpoch(): void {
    const epoch = Math.floor(Date.now() / 1000);
    this.epochDisplay.textContent = epoch.toString();
  }
  
  private copyEpoch(): void {
    const epoch = Math.floor(Date.now() / 1000);
    navigator.clipboard.writeText(epoch.toString()).catch(err => {
      console.error('Failed to copy epoch:', err);
    });
  }

  private updateCalculation(): void {
    const value1 = this.input1.value.trim();
    const value2 = this.input2.value.trim();
    
    // Get current epoch if input is blank
    const now = Math.floor(Date.now() / 1000);
    const epochA = value1 ? parseInt(value1, 10) : now;
    const epochB = value2 ? parseInt(value2, 10) : now;
    
    // If both are blank, don't show comparison
    if (!value1 && !value2) {
      this.scaleDisplay.innerHTML = '';
      this.resultDisplay.innerHTML = '';
      this.labelA.textContent = '';
      this.labelB.textContent = '';
      return;
    }
    
    // Calculate difference in seconds
    const diffSeconds = Math.abs(epochB - epochA);
    const diffMs = diffSeconds * 1000;
    
    // Format the difference with detailed breakdown
    const formatted = formatDetailedElapsedTime(diffMs);
    
    // Update labels with dates/times and colors
    this.updateLabels(epochA, epochB, now, value1, value2);
    
    // Build scale (needs colors, so call after updateLabels)
    this.updateScale(epochA, epochB, now, value1, value2);
    
    // Build result HTML
    let resultHtml = `<div class="calculator-result-item">`;
    resultHtml += `<div class="result-label">Difference:</div>`;
    resultHtml += `<div class="result-value">${formatted}</div>`;
    resultHtml += `</div>`;
    
    this.resultDisplay.innerHTML = resultHtml;
  }
  
  private updateLabels(epochA: number, epochB: number, now: number, value1: string, value2: string): void {
    // Get colors for A and B
    const getColorForEpoch = (epoch: number): string => {
      if (epoch <= now) {
        // Past or present: white to red
        const clampedEpoch = Math.max(0, Math.min(epoch, now));
        const proximityToNow = now > 0 ? clampedEpoch / now : 0;
        const r = Math.floor(255 * proximityToNow);
        const g = Math.floor(255 * (1 - proximityToNow));
        const b = Math.floor(255 * (1 - proximityToNow));
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Future: purple
        return `rgb(128, 0, 128)`;
      }
    };
    
    const colorA = getColorForEpoch(epochA);
    const colorB = getColorForEpoch(epochB);
    
    // Format labels
    const labelAText = value1 ? formatEpochToDateTime(epochA) : 'Now';
    const labelBText = value2 ? formatEpochToDateTime(epochB) : 'Now';
    
    this.labelA.textContent = labelAText;
    this.labelA.style.color = colorA;
    
    this.labelB.textContent = labelBText;
    this.labelB.style.color = colorB;
  }
  
  private updateScale(epochA: number, epochB: number, now: number, value1: string, value2: string): void {
    // Find lower (L) and higher (H) values
    const L = Math.min(epochA, epochB);
    const H = Math.max(epochA, epochB);
    const R = H; // Rightmost value
    
    // Calculate scale bounds with 7% padding
    const valueRange = H - L;
    const padding = valueRange * 0.07;
    const scaleLeft = L - padding;
    const scaleRight = R + padding;
    const scaleRange = scaleRight - scaleLeft;
    
    if (scaleRange <= 0) {
      this.scaleDisplay.innerHTML = '';
      return;
    }
    
    // Calculate positions as percentages (0-100%) within the scale range
    const posA = ((epochA - scaleLeft) / scaleRange) * 100;
    const posB = ((epochB - scaleLeft) / scaleRange) * 100;
    const posNow = ((now - scaleLeft) / scaleRange) * 100;
    
    // Color stops: 0 (blue), NOW/2 (purple), NOW (red)
    const nowHalf = now / 2;
    
    // Get color for any epoch value
    const getColorForEpoch = (epoch: number): string => {
      if (epoch <= 0) {
        return `rgb(0, 0, 255)`; // Blue at 0
      } else if (epoch <= nowHalf) {
        // Transition from blue to purple (0 to NOW/2)
        const t = epoch / nowHalf;
        const r = Math.floor(128 * t);
        const g = 0;
        const b = Math.floor(255 - (127 * t));
        return `rgb(${r}, ${g}, ${b})`;
      } else if (epoch <= now) {
        // Transition from purple to red (NOW/2 to NOW)
        const t = (epoch - nowHalf) / (now - nowHalf);
        const r = Math.floor(128 + (127 * t));
        const g = 0;
        const b = Math.floor(128 - (128 * t));
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Future: purple
        return `rgb(128, 0, 128)`;
      }
    };
    
    // Build scale HTML
    let scaleHtml = `<div class="scale-container">`;
    scaleHtml += `<div class="scale-bar">`;
    
    // Create gradient stops - map key epochs to positions in the visible range
    const gradientStops: string[] = [];
    
    // Add color stops at key points: 0, NOW/2, NOW
    const keyEpochs = [0, nowHalf, now];
    const keyPositions: { epoch: number; position: number; color: string }[] = [];
    
    for (const epoch of keyEpochs) {
      if (epoch >= scaleLeft && epoch <= scaleRight) {
        const position = ((epoch - scaleLeft) / scaleRange) * 100;
        const color = getColorForEpoch(epoch);
        keyPositions.push({ epoch, position, color });
      }
    }
    
    // Add start color if scale starts before 0
    if (scaleLeft < 0) {
      const startColor = getColorForEpoch(scaleLeft);
      gradientStops.push(`${startColor} 0%`);
    }
    
    // Add key positions
    for (const key of keyPositions) {
      gradientStops.push(`${key.color} ${key.position}%`);
    }
    
    // Add end color if scale extends beyond NOW
    if (scaleRight > now) {
      const endColor = getColorForEpoch(scaleRight);
      gradientStops.push(`${endColor} 100%`);
    }
    
    // If no key positions in range, create a smooth gradient across the range
    if (gradientStops.length < 2) {
      const numStops = 20;
      for (let i = 0; i <= numStops; i++) {
        const t = i / numStops;
        const epochAtT = scaleLeft + (scaleRange * t);
        const color = getColorForEpoch(epochAtT);
        gradientStops.push(`${color} ${t * 100}%`);
      }
    }
    
    scaleHtml += `<div class="scale-bar-fill" style="background: linear-gradient(to right, ${gradientStops.join(', ')});"></div>`;
    scaleHtml += `</div>`;
    
    // Get colors for markers
    const colorA = getColorForEpoch(epochA);
    const colorB = getColorForEpoch(epochB);
    
    // Add markers
    scaleHtml += `<div class="scale-markers">`;
    
    // Marker for A
    scaleHtml += `<div class="scale-marker scale-marker-a" style="left: ${posA}%;">`;
    scaleHtml += `<div class="marker-label" style="color: ${colorA};">A</div>`;
    scaleHtml += `<div class="marker-line" style="background-color: ${colorA}; border-color: ${colorA};"></div>`;
    scaleHtml += `</div>`;
    
    // Marker for B
    scaleHtml += `<div class="scale-marker scale-marker-b" style="left: ${posB}%;">`;
    scaleHtml += `<div class="marker-label" style="color: ${colorB};">B</div>`;
    scaleHtml += `<div class="marker-line" style="background-color: ${colorB}; border-color: ${colorB};"></div>`;
    scaleHtml += `</div>`;
    
    // Marker for NOW - position based on where it falls
    const colorNow = getColorForEpoch(now);
    let nowPosition: number;
    let nowLabel: string;
    let nowShapeClass: string;
    
    if (now < scaleLeft) {
      // NOW is in the past (to the left) - triangle pointing left on left edge
      nowPosition = 0;
      nowLabel = '•';
      nowShapeClass = 'marker-triangle-left';
    } else if (now > scaleRight) {
      // NOW is in the future (to the right) - triangle pointing right on right edge
      nowPosition = 100;
      nowLabel = '•';
      nowShapeClass = 'marker-triangle-right';
    } else {
      // NOW is on the graph (within range including buffer) - circle
      nowPosition = posNow;
      nowLabel = '•';
      nowShapeClass = 'marker-circle';
    }
    
    scaleHtml += `<div class="scale-marker scale-marker-now" style="left: ${nowPosition}%;">`;
    scaleHtml += `<div class="marker-label ${nowShapeClass}" style="color: ${colorNow};">${nowLabel}</div>`;
    scaleHtml += `<div class="marker-line" style="background-color: ${colorNow}; border-color: ${colorNow};"></div>`;
    scaleHtml += `</div>`;
    
    scaleHtml += `</div>`;
    scaleHtml += `</div>`;
    
    this.scaleDisplay.innerHTML = scaleHtml;
  }

  private saveInputs(): void {
    this.data.inputA = this.input1.value.trim() || undefined;
    this.data.inputB = this.input2.value.trim() || undefined;
    this.saveToStorage();
  }
  
  private clearInputs(): void {
    this.input1.value = '';
    this.input2.value = '';
    this.data.inputA = undefined;
    this.data.inputB = undefined;
    this.saveToStorage();
    this.updateCalculation();
  }
  
  private saveToStorage(): void {
    // Notify TileManager to save
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  public updateData(data: EpochTileData): void {
    this.data = data;
    // Restore input values
    if (this.data.inputA) {
      this.input1.value = this.data.inputA;
    } else {
      this.input1.value = '';
    }
    if (this.data.inputB) {
      this.input2.value = this.data.inputB;
    } else {
      this.input2.value = '';
    }
    this.updateEpoch();
    this.updateCalculation();
  }

  public destroy(): void {
    this.clockManager.unsubscribe(this.clockSubscriber);
  }
}

