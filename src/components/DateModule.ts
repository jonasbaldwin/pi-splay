import { DateTileData } from '../types';
import { ClockManager } from '../utils/ClockManager';

export class DateModule {
  private element: HTMLElement;
  private data: DateTileData;
  private dateDisplay!: HTMLElement;
  private clockManager: ClockManager;
  private clockSubscriber: { onTick: () => void };
  private lastDisplayedDate: string = '';

  constructor(element: HTMLElement, data: DateTileData) {
    this.element = element;
    this.data = data;
    this.clockManager = ClockManager.getInstance();
    
    // Create clock subscriber - only update if date has changed
    this.clockSubscriber = {
      onTick: () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[today.getMonth()];
        const year = today.getFullYear();
        const currentDateStr = `${day} ${month} ${year}`;
        
        // Only update if the date has actually changed
        if (currentDateStr !== this.lastDisplayedDate) {
          this.updateDate();
        }
      }
    };
    
    this.initialize();
    this.updateDate(); // Initial update
    this.clockManager.subscribe(this.clockSubscriber);
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="date-module">
        <button class="date-copy-btn" data-copy-date title="Copy date">Copy</button>
        <div class="date-display" data-date-display></div>
      </div>
    `;

    this.dateDisplay = this.element.querySelector('[data-date-display]')!;
    
    // Add copy button handler
    this.element.querySelector('[data-copy-date]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyDate();
    });
    
    this.updateDate();
  }

  private updateDate(): void {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[today.getMonth()];
    const year = today.getFullYear();
    
    const dateStr = `${day} ${month} ${year}`;
    this.dateDisplay.textContent = dateStr;
    this.lastDisplayedDate = dateStr;
  }

  private copyDate(): void {
    const dateText = this.dateDisplay.textContent || '';
    navigator.clipboard.writeText(dateText).catch(err => {
      console.error('Failed to copy date:', err);
    });
  }

  public updateData(data: DateTileData): void {
    this.data = data;
    this.updateDate();
  }

  public destroy(): void {
    this.clockManager.unsubscribe(this.clockSubscriber);
  }
}

