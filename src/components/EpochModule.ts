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
  private showMilliseconds: boolean = false;
  private msIntervalId: number | null = null;

  constructor(element: HTMLElement, data: EpochTileData) {
    this.element = element;
    this.data = data;
    this.clockManager = ClockManager.getInstance();
    
    // Create clock subscriber
    this.clockSubscriber = {
      onTick: () => {
        // Only update epoch display from clock if not in milliseconds mode
        // (milliseconds mode uses its own interval)
        if (!this.showMilliseconds) {
          this.updateEpochDisplay();
        }
        this.updateCalculation();
      }
    };
    
    this.initialize();
    this.updateEpochDisplay(); // Initial update
    this.clockManager.subscribe(this.clockSubscriber);
    this.startMsIntervalIfNeeded();
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="epoch-module">
        <div class="epoch-header">
          <div class="epoch-label">Epoch:</div>
          <div class="epoch-actions">
            <button class="epoch-toggle-btn" data-toggle-epoch title="Toggle between seconds and milliseconds">Milliseconds</button>
            <button class="epoch-copy-btn" data-copy-epoch title="Copy epoch number">Copy</button>
          </div>
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
    
    // Add toggle button handler
    this.element.querySelector('[data-toggle-epoch]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleEpochFormat();
    });
    
    this.updateEpochDisplay();
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
    
    // Check if it's a valid number (optional minus sign followed by digits)
    if (!/^-?\d+$/.test(cleaned)) {
      return null;
    }
    
    return cleaned;
  }

  private validateInput(input: HTMLInputElement): void {
    const value = input.value;
    const validated = this.validateEpochValue(value);
    
    if (value && validated === null) {
      // Invalid input - remove non-numeric characters except minus sign at the start
      // Allow minus only at the beginning
      const hasMinus = value.startsWith('-');
      const cleaned = value.replace(/[^\d]/g, '');
      input.value = hasMinus ? '-' + cleaned : cleaned;
    } else if (validated !== null && validated !== value) {
      input.value = validated;
    }
  }

  private updateEpochDisplay(): void {
    if (this.showMilliseconds) {
      const epoch = Date.now();
      this.epochDisplay.textContent = epoch.toString();
    } else {
      const epoch = Math.floor(Date.now() / 1000);
      this.epochDisplay.textContent = epoch.toString();
    }
  }

  private startMsIntervalIfNeeded(): void {
    if (this.showMilliseconds && this.msIntervalId === null) {
      // Start millisecond interval for epoch display updates
      this.msIntervalId = window.setInterval(() => {
        this.updateEpochDisplay();
      }, 1);
    }
  }

  private stopMsInterval(): void {
    if (this.msIntervalId !== null) {
      clearInterval(this.msIntervalId);
      this.msIntervalId = null;
    }
  }
  
  private toggleEpochFormat(): void {
    // Convert input values when toggling
    const value1 = this.input1.value.trim();
    const value2 = this.input2.value.trim();
    
    if (value1) {
      const num1 = parseInt(value1, 10);
      if (!isNaN(num1)) {
        if (this.showMilliseconds) {
          // Currently showing milliseconds, switching to seconds - convert ms to s
          this.input1.value = Math.floor(num1 / 1000).toString();
        } else {
          // Currently showing seconds, switching to milliseconds - convert s to ms
          this.input1.value = (num1 * 1000).toString();
        }
      }
    }
    
    if (value2) {
      const num2 = parseInt(value2, 10);
      if (!isNaN(num2)) {
        if (this.showMilliseconds) {
          // Currently showing milliseconds, switching to seconds - convert ms to s
          this.input2.value = Math.floor(num2 / 1000).toString();
        } else {
          // Currently showing seconds, switching to milliseconds - convert s to ms
          this.input2.value = (num2 * 1000).toString();
        }
      }
    }
    
    // Toggle the display mode
    this.showMilliseconds = !this.showMilliseconds;
    const toggleBtn = this.element.querySelector('[data-toggle-epoch]') as HTMLElement;
    if (toggleBtn) {
      toggleBtn.textContent = this.showMilliseconds ? 'Seconds' : 'Milliseconds';
    }
    
    // Start or stop millisecond interval based on mode
    if (this.showMilliseconds) {
      this.startMsIntervalIfNeeded();
    } else {
      this.stopMsInterval();
    }
    
    // Save the converted values
    this.saveInputs();
    
    // Update displays
    this.updateEpochDisplay();
    this.updateCalculation();
  }
  
  private copyEpoch(): void {
    if (this.showMilliseconds) {
      const epoch = Date.now();
      navigator.clipboard.writeText(epoch.toString()).catch(err => {
        console.error('Failed to copy epoch:', err);
      });
    } else {
      const epoch = Math.floor(Date.now() / 1000);
      navigator.clipboard.writeText(epoch.toString()).catch(err => {
        console.error('Failed to copy epoch:', err);
      });
    }
  }

  private updateCalculation(): void {
    const value1 = this.input1.value.trim();
    const value2 = this.input2.value.trim();
    
    // Get current epoch - use the same format as the display
    const now = this.showMilliseconds ? Date.now() : Math.floor(Date.now() / 1000);
    
    // Parse values - interpret based on current display mode
    const parseEpoch = (value: string): number => {
      if (!value) return now;
      const num = parseInt(value, 10);
      if (isNaN(num)) return now;
      
      // If showing milliseconds, assume inputs are milliseconds
      // If showing seconds, assume inputs are seconds
      if (this.showMilliseconds) {
        // Input is in milliseconds, use as-is
        return num;
      } else {
        // Input is in seconds, use as-is
        return num;
      }
    };
    
    const epochA = parseEpoch(value1);
    const epochB = parseEpoch(value2);
    
    // If both are blank, don't show comparison
    if (!value1 && !value2) {
      this.scaleDisplay.innerHTML = '';
      this.resultDisplay.innerHTML = '';
      this.labelA.textContent = '';
      this.labelB.textContent = '';
      return;
    }
    
    // Calculate difference - convert to milliseconds for formatting
    let diffMs: number;
    if (this.showMilliseconds) {
      // Both are in milliseconds
      diffMs = Math.abs(epochB - epochA);
    } else {
      // Both are in seconds, convert to milliseconds
      const diffSeconds = Math.abs(epochB - epochA);
      diffMs = diffSeconds * 1000;
    }
    
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
  
  private updateLabels(epochA: number, epochB: number, nowInput: number, value1: string, value2: string): void {
    // Convert to seconds for color calculation and date formatting
    const now = this.showMilliseconds ? Math.floor(nowInput / 1000) : nowInput;
    const epochA_seconds = this.showMilliseconds ? Math.floor(epochA / 1000) : epochA;
    const epochB_seconds = this.showMilliseconds ? Math.floor(epochB / 1000) : epochB;
    
    // Get colors for A and B
    // X = now (the value between 0 and now)
    // Segments: pre-history (blue), 0→now (green→red), now→now+X (red→purple), now+X→now+X*2 (purple→black)
    const getColorForEpoch = (epoch: number): string => {
      if (epoch < 0) {
        // Pre-history: blue for negative values
        return `rgb(0, 0, 255)`; // Blue for pre-history
      } else if (epoch <= now) {
        // Past or present: green to red (0 to now)
        const clampedEpoch = Math.max(0, Math.min(epoch, now));
        const proximityToNow = now > 0 ? clampedEpoch / now : 0;
        const r = Math.floor(255 * proximityToNow); // Red increases from 0 (green) to 255 (red)
        const g = Math.floor(255 * (1 - proximityToNow)); // Green decreases from 255 (green) to 0 (red)
        const b = 0; // Blue stays at 0
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const X = now; // X is the value between 0 and now
        const futureStart = now; // now + 0
        const futureEnd = now + X; // now + X
        const distantFutureEnd = now + X * 2; // now + X * 2
        
        if (epoch <= futureEnd) {
          // Future: red to purple (now to now + X)
          const t = (epoch - futureStart) / X;
          const r = Math.floor(255 - (127 * t)); // Red decreases from 255 to 128
          const g = 0;
          const b = Math.floor(128 * t); // Blue increases from 0 to 128
          return `rgb(${r}, ${g}, ${b})`;
        } else if (epoch <= distantFutureEnd) {
          // Distant future: purple to black (now + X to now + X * 2)
          const t = (epoch - futureEnd) / X;
          const r = Math.floor(128 * (1 - t)); // Red decreases from 128 to 0
          const g = 0;
          const b = Math.floor(128 * (1 - t)); // Blue decreases from 128 to 0
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          // Beyond distant future: black
          return `rgb(0, 0, 0)`;
        }
      }
    };
    
    const colorA = getColorForEpoch(epochA_seconds);
    const colorB = getColorForEpoch(epochB_seconds);
    
    // Format labels - formatEpochToDateTime expects seconds
    const labelAText = value1 ? formatEpochToDateTime(epochA_seconds) : 'Now';
    const labelBText = value2 ? formatEpochToDateTime(epochB_seconds) : 'Now';
    
    this.labelA.textContent = labelAText;
    this.labelA.style.color = colorA;
    
    this.labelB.textContent = labelBText;
    this.labelB.style.color = colorB;
  }
  
  private updateScale(epochA: number, epochB: number, nowInput: number, value1: string, value2: string): void {
    // Convert all to seconds for scale calculation (scale always uses seconds)
    const now = this.showMilliseconds ? Math.floor(nowInput / 1000) : nowInput;
    const epochA_seconds = this.showMilliseconds ? Math.floor(epochA / 1000) : epochA;
    const epochB_seconds = this.showMilliseconds ? Math.floor(epochB / 1000) : epochB;
    
    // Find lower (L) and higher (H) values (in seconds)
    const L = Math.min(epochA_seconds, epochB_seconds);
    const H = Math.max(epochA_seconds, epochB_seconds);
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
    const posA = ((epochA_seconds - scaleLeft) / scaleRange) * 100;
    const posB = ((epochB_seconds - scaleLeft) / scaleRange) * 100;
    const posNow = ((now - scaleLeft) / scaleRange) * 100;
    
    // X = now (the value between 0 and now)
    // Segments: 0→now (green→red), now→now+X (red→purple), now+X→now+X*2 (purple→black)
    const X = now;
    const nowHalf = now / 2;
    const futureEnd = now + X; // now + X
    const distantFutureEnd = now + X * 2; // now + X * 2
    
    // Get color for any epoch value
    const getColorForEpoch = (epoch: number): string => {
      if (epoch < 0) {
        // Pre-history: blue for negative values
        return `rgb(0, 0, 255)`; // Blue for pre-history
      } else if (epoch === 0) {
        return `rgb(0, 255, 0)`; // Green at 0
      } else if (epoch <= nowHalf) {
        // Transition from green to yellow (0 to NOW/2)
        const t = epoch / nowHalf;
        const r = Math.floor(255 * t); // Red increases from 0 to 255
        const g = 255; // Green stays at max
        const b = 0; // Blue stays at 0
        return `rgb(${r}, ${g}, ${b})`;
      } else if (epoch <= now) {
        // Transition from yellow to red (NOW/2 to NOW)
        const t = (epoch - nowHalf) / (now - nowHalf);
        const r = 255; // Red stays at max
        const g = Math.floor(255 - (255 * t)); // Green decreases from 255 to 0
        const b = 0; // Blue stays at 0
        return `rgb(${r}, ${g}, ${b})`;
      } else if (epoch <= futureEnd) {
        // Future: red to purple (now to now + X)
        const t = (epoch - now) / X;
        const r = Math.floor(255 - (127 * t)); // Red decreases from 255 to 128
        const g = 0;
        const b = Math.floor(128 * t); // Blue increases from 0 to 128
        return `rgb(${r}, ${g}, ${b})`;
      } else if (epoch <= distantFutureEnd) {
        // Distant future: purple to black (now + X to now + X * 2)
        const t = (epoch - futureEnd) / X;
        const r = Math.floor(128 * (1 - t)); // Red decreases from 128 to 0
        const g = 0;
        const b = Math.floor(128 * (1 - t)); // Blue decreases from 128 to 0
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Beyond distant future: black
        return `rgb(0, 0, 0)`;
      }
    };
    
    // Build scale HTML
    let scaleHtml = `<div class="scale-container">`;
    scaleHtml += `<div class="scale-bar">`;
    
    // Create gradient stops - map key epochs to positions in the visible range
    const gradientStops: string[] = [];
    
    // Add color stops at key points: negative values (pre-history), 0, NOW/2, NOW, NOW+X (future end), NOW+X*2 (distant future end)
    const keyEpochs = [0, nowHalf, now, futureEnd, distantFutureEnd];
    const keyPositions: { epoch: number; position: number; color: string }[] = [];
    
    for (const epoch of keyEpochs) {
      if (epoch >= scaleLeft && epoch <= scaleRight) {
        const position = ((epoch - scaleLeft) / scaleRange) * 100;
        const color = getColorForEpoch(epoch);
        keyPositions.push({ epoch, position, color });
      }
    }
    
    // Add start color if scale starts before 0 (pre-history section)
    if (scaleLeft < 0) {
      const startColor = getColorForEpoch(scaleLeft);
      gradientStops.push(`${startColor} 0%`);
    }
    
    // Add key positions (0 will be included if it's in range)
    for (const key of keyPositions) {
      gradientStops.push(`${key.color} ${key.position}%`);
    }
    
    // If scale starts before 0 but 0 is not in keyPositions (edge case), add it explicitly
    if (scaleLeft < 0 && !keyPositions.some(k => k.epoch === 0) && 0 >= scaleLeft && 0 <= scaleRight) {
      const zeroPosition = ((0 - scaleLeft) / scaleRange) * 100;
      const zeroColor = getColorForEpoch(0);
      gradientStops.push(`${zeroColor} ${zeroPosition}%`);
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
    
    // Get colors for markers (using seconds for color calculation)
    const colorA = getColorForEpoch(epochA_seconds);
    const colorB = getColorForEpoch(epochB_seconds);
    
    // Add markers
    scaleHtml += `<div class="scale-markers">`;
    
    // Marker for A
    scaleHtml += `<div class="scale-marker scale-marker-a" style="left: ${posA}%;">`;
    scaleHtml += `<div class="marker-label marker-circle" style="color: white;">A</div>`;
    scaleHtml += `<div class="marker-line" style="background-color: ${colorA}; border-color: ${colorA};"></div>`;
    scaleHtml += `</div>`;
    
    // Marker for B
    scaleHtml += `<div class="scale-marker scale-marker-b" style="left: ${posB}%;">`;
    scaleHtml += `<div class="marker-label marker-circle" style="color: white;">B</div>`;
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
    this.updateEpochDisplay();
    this.updateCalculation();
  }

  public destroy(): void {
    this.clockManager.unsubscribe(this.clockSubscriber);
    this.stopMsInterval();
  }
}

