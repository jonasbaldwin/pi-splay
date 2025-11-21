import { EpochTileData, TimeMark } from '../types';
import { MarkSyncManager } from '../utils/MarkSyncManager';
import { ClockManager } from '../utils/ClockManager';
import { formatElapsedTime, formatTimestampForTimezone } from '../utils/time';

export class EpochModule {
  private element: HTMLElement;
  private data: EpochTileData;
  private epochDisplay!: HTMLElement;
  private marksList!: HTMLElement;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private hasMoved: boolean = false;
  private syncManager: MarkSyncManager;
  private clockManager: ClockManager;
  private clockSubscriber: { onTick: () => void };
  private syncModuleRef: {
    addMark: (mark: TimeMark) => void;
    removeMark: (index: number) => void;
    clearMarks: () => void;
    getTimezone: () => string;
    getMarksList: () => HTMLElement | null;
  };

  constructor(element: HTMLElement, data: EpochTileData) {
    this.element = element;
    this.data = data;
    this.syncManager = MarkSyncManager.getInstance();
    this.clockManager = ClockManager.getInstance();
    
    // Create stable reference for sync manager
    this.syncModuleRef = {
      addMark: (mark: TimeMark) => this.addMark(mark),
      removeMark: (index: number) => this.removeMark(index),
      clearMarks: () => this.clearMarks(),
      getTimezone: () => 'local', // Epoch uses local time
      getMarksList: () => this.marksList
    };
    
    // Create clock subscriber
    this.clockSubscriber = {
      onTick: () => {
        this.updateEpoch();
        this.updateElapsedTimes();
      }
    };
    
    this.initialize();
    this.updateEpoch(); // Initial update
    this.clockManager.subscribe(this.clockSubscriber);
    this.syncManager.register(this.syncModuleRef);
  }
  
  public addMark(mark: TimeMark): void {
    if (!this.data.marks) {
      this.data.marks = [];
    }
    this.data.marks.unshift(mark);
    this.updateMarks();
    this.saveToStorage();
  }
  
  public removeMark(index: number): void {
    if (!this.data.marks) return;
    if (index >= 0 && index < this.data.marks.length) {
      this.data.marks.splice(index, 1);
      this.updateMarks();
      this.saveToStorage();
    }
  }
  
  public clearMarks(): void {
    this.data.marks = [];
    this.updateMarks();
    this.saveToStorage();
  }
  
  private saveToStorage(): void {
    // Notify TileManager to save
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="epoch-module">
        <div class="epoch-label">Epoch:</div>
        <div class="epoch-display" data-epoch-display></div>
        <div class="marks-section">
          <div class="marks-header">
            <div class="marks-title">marks:</div>
            <button class="marks-clear-btn" data-clear-marks title="Clear all marks">Clear</button>
          </div>
          <div class="marks-list" data-marks-list></div>
        </div>
      </div>
    `;

    this.epochDisplay = this.element.querySelector('[data-epoch-display]')!;
    this.marksList = this.element.querySelector('[data-marks-list]')!;
    this.updateEpoch();
    this.updateMarks();
    
    // Add scroll synchronization
    this.marksList.addEventListener('scroll', () => {
      this.syncManager.syncScroll(this.syncModuleRef, this.marksList.scrollTop);
    });
    
    // Add clear button handler
    this.element.querySelector('[data-clear-marks]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.syncManager.syncClearMarks();
    });
    
    // Add tap/click handler
    this.element.addEventListener('click', (e) => {
      // Don't handle taps in edit mode - let drag handle it
      const tileManager = (window as any).tileManager;
      if (tileManager && tileManager.isInEditMode && tileManager.isInEditMode()) {
        // Don't interfere with drag events
        return;
      }
      if ((e as any).pointerType !== 'touch') {
        this.handleTap();
      }
    });
    
    // Touch handlers
    this.element.addEventListener('touchstart', (e) => {
      // Don't handle taps in edit mode
      const tileManager = (window as any).tileManager;
      if (tileManager && tileManager.isInEditMode && tileManager.isInEditMode()) {
        return;
      }
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.hasMoved = false;
    }, { passive: true });
    
    this.element.addEventListener('touchmove', (e) => {
      if (!this.hasMoved) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - this.touchStartX);
        const deltaY = Math.abs(touch.clientY - this.touchStartY);
        if (deltaX > 10 || deltaY > 10) {
          this.hasMoved = true;
        }
      }
    }, { passive: true });
    
    this.element.addEventListener('touchend', (e) => {
      // Don't handle taps in edit mode
      const tileManager = (window as any).tileManager;
      if (tileManager && tileManager.isInEditMode && tileManager.isInEditMode()) {
        return;
      }
      if (!this.hasMoved) {
        e.preventDefault();
        this.handleTap();
      }
      this.hasMoved = false;
    }, { passive: false });
  }

  private updateEpoch(): void {
    const epoch = Math.floor(Date.now() / 1000);
    this.epochDisplay.textContent = epoch.toString();
  }

  private updateMarks(): void {
    if (!this.data.marks || this.data.marks.length === 0) {
      this.marksList.innerHTML = '<div class="mark-placeholder">_______________________</div>';
      return;
    }

    const now = Date.now(); // Always use UTC timestamp for elapsed time calculation
    
    const marksHtml = this.data.marks
      .map((mark, index) => {
        // Calculate elapsed time using UTC timestamps
        const elapsedMs = now - (mark.timestamp || now);
        const elapsed = formatElapsedTime(elapsedMs);
        
        // Convert UTC timestamp to local time for display
        const displayTime = formatTimestampForTimezone(mark.timestamp || now, 'local');
        
        // Display index: oldest (bottom) = 1, newest (top) = highest number
        const displayIndex = this.data.marks.length - index;
        
        return `
        <div class="mark-item group">
          <button class="mark-remove-btn" data-mark-index="${index}" title="Remove this mark">×</button>
          <span class="mark-index">${displayIndex}</span>
          <span class="mark-time">${displayTime}</span>
          <span class="mark-separator"> • </span>
          <span class="mark-epoch">${mark.epoch}</span>
          <span class="mark-separator"> • </span>
          <span class="mark-elapsed" data-mark-timestamp="${mark.timestamp || now}">${elapsed}</span>
        </div>
      `;
      })
      .join('');
    
    this.marksList.innerHTML = marksHtml;
    
    // Add remove button handlers
    this.marksList.querySelectorAll('[data-mark-index]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt((e.target as HTMLElement).getAttribute('data-mark-index') || '0', 10);
        this.syncManager.syncRemoveMark(index);
      });
    });
  }
  
  private updateElapsedTimes(): void {
    // Update elapsed times without full re-render (once per second)
    const now = Date.now();
    this.marksList.querySelectorAll('[data-mark-timestamp]').forEach(el => {
      const timestamp = parseInt((el as HTMLElement).getAttribute('data-mark-timestamp') || '0', 10);
      const elapsedMs = now - timestamp;
      el.textContent = formatElapsedTime(elapsedMs);
    });
  }

  private handleTap(): void {
    // Sync tap across all time/epoch modules
    this.syncManager.syncTap(this.syncModuleRef);
  }

  public updateData(data: EpochTileData): void {
    this.data = data;
    if (!this.data.marks) {
      this.data.marks = [];
    }
    this.updateEpoch();
    this.updateMarks();
  }

  public destroy(): void {
    this.syncManager.unregister(this.syncModuleRef);
    this.clockManager.unsubscribe(this.clockSubscriber);
  }
}

