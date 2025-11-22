import { TimeTileData, TimeMark } from '../types';
import { formatTime, getTimeForTimezone, createTimeMark, getTimezoneLabel, formatElapsedTime, formatTimestampForTimezone, getHourFormat, setHourFormat } from '../utils/time';
import { MarkSyncManager } from '../utils/MarkSyncManager';
import { ClockManager } from '../utils/ClockManager';

export class TimeModule {
  private element: HTMLElement;
  private data: TimeTileData;
  private timeDisplay!: HTMLElement;
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

  constructor(element: HTMLElement, data: TimeTileData) {
    this.element = element;
    this.data = data;
    this.syncManager = MarkSyncManager.getInstance();
    this.clockManager = ClockManager.getInstance();
    
    // Create stable reference for sync manager
    this.syncModuleRef = {
      addMark: (mark: TimeMark) => this.addMark(mark),
      removeMark: (index: number) => this.removeMark(index),
      clearMarks: () => this.clearMarks(),
      getTimezone: () => this.data.timezone,
      getMarksList: () => this.marksList
    };
    
    // Create clock subscriber
    this.clockSubscriber = {
      onTick: () => {
        this.updateTime();
        this.updateElapsedTimes();
      }
    };
    
    this.initialize();
    this.updateTime(); // Initial update
    this.clockManager.subscribe(this.clockSubscriber);
    this.syncManager.register(this.syncModuleRef);
    
    // Listen for hour format changes from other modules
    window.addEventListener('hourFormatChanged', () => {
      this.updateTime();
      this.updateMarks();
      const hourFormat = getHourFormat();
      const formatBtn = this.element.querySelector('[data-format-toggle]') as HTMLElement;
      if (formatBtn) {
        formatBtn.textContent = hourFormat === '12' ? '24h' : '12h';
      }
    });
  }
  
  public addMark(mark: TimeMark): void {
    this.data.marks.unshift(mark);
    this.updateMarks();
    this.saveToStorage();
  }
  
  public removeMark(index: number): void {
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
    const timezoneLabel = getTimezoneLabel(this.data.timezone);
    
    const hourFormat = getHourFormat();
    const formatLabel = hourFormat === '12' ? '24h' : '12h';
    
    this.element.innerHTML = `
      <div class="time-module">
        <div class="time-header">
          <span class="time-label">${timezoneLabel}:</span>
          <span class="time-display" data-time-display></span>
          <div class="time-actions">
            <button class="time-format-btn" data-format-toggle title="Toggle 12/24 hour format">${formatLabel}</button>
            <button class="time-copy-btn" data-copy-time title="Copy time">Copy</button>
          </div>
        </div>
        <div class="marks-section">
          <div class="marks-header">
            <div class="marks-title">marks:</div>
            <button class="marks-clear-btn" data-clear-marks title="Clear all marks">Clear</button>
          </div>
          <div class="marks-list" data-marks-list></div>
        </div>
      </div>
    `;

    this.timeDisplay = this.element.querySelector('[data-time-display]')!;
    this.marksList = this.element.querySelector('[data-marks-list]')!;
    
    this.updateTime();
    this.updateMarks();
    
    // Add scroll synchronization
    this.marksList.addEventListener('scroll', () => {
      this.syncManager.syncScroll(this.syncModuleRef, this.marksList.scrollTop);
    });
    
    // Add format toggle button handler
    this.element.querySelector('[data-format-toggle]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleHourFormat();
    });
    
    // Add copy button handler
    this.element.querySelector('[data-copy-time]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copyTime();
    });
    
    // Add clear button handler
    this.element.querySelector('[data-clear-marks]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.syncManager.syncClearMarks();
    });
    
    // Add tap/click handler - use both for better compatibility
    this.element.addEventListener('click', (e) => {
      // Don't handle taps in edit mode - let drag handle it
      const tileManager = (window as any).tileManager;
      if (tileManager && tileManager.isInEditMode && tileManager.isInEditMode()) {
        // Don't stop propagation - let drag events work
        return;
      }
      // Only handle click if it's a direct click (not from touch)
      if ((e as any).pointerType !== 'touch') {
        this.handleTap();
      }
    });
    
    // Touch handlers to distinguish tap from drag
    this.element.addEventListener('touchstart', (e) => {
      // Don't handle taps in edit mode - let drag handle it
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
        // If moved more than 10px, consider it a drag
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
      // Only handle as tap if there was no significant movement
      if (!this.hasMoved) {
        e.preventDefault();
        this.handleTap();
      }
      this.hasMoved = false;
    }, { passive: false });
  }

  private updateTime(): void {
    const date = getTimeForTimezone(this.data.timezone);
    const useUTC = this.data.timezone === 'utc';
    this.timeDisplay.textContent = formatTime(date, false, useUTC);
  }
  
  private toggleHourFormat(): void {
    const currentFormat = getHourFormat();
    const newFormat = currentFormat === '12' ? '24' : '12';
    setHourFormat(newFormat);
    
    // Update button label
    const formatBtn = this.element.querySelector('[data-format-toggle]') as HTMLElement;
    if (formatBtn) {
      formatBtn.textContent = newFormat === '12' ? '24h' : '12h';
    }
    
    // Update all time displays
    this.updateTime();
    this.updateMarks();
    
    // Notify all other time modules to update (via a custom event)
    window.dispatchEvent(new CustomEvent('hourFormatChanged'));
  }

  private updateMarks(): void {
    if (this.data.marks.length === 0) {
      this.marksList.innerHTML = '<div class="mark-placeholder">_______________________</div>';
      return;
    }

    const now = Date.now(); // Always use UTC timestamp for elapsed time calculation
    
    // Show all marks (infinite), but limit visible area with scrolling
    const marksHtml = this.data.marks
      .map((mark, index) => {
        // Calculate elapsed time using UTC timestamps
        const elapsedMs = now - (mark.timestamp || now);
        const elapsed = formatElapsedTime(elapsedMs);
        
        // Convert UTC timestamp to display timezone for the time string
        const displayTime = formatTimestampForTimezone(mark.timestamp || now, this.data.timezone);
        
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
    // Update elapsed times without full re-render
    // Always use UTC timestamp for consistency
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

  private copyTime(): void {
    // Get current time with milliseconds
    const now = Date.now();
    let timeText: string;
    
    if (this.data.timezone === 'local' || this.data.timezone === 'utc') {
      const date = getTimeForTimezone(this.data.timezone);
      const useUTC = this.data.timezone === 'utc';
      const use12Hour = getHourFormat() === '12';
      timeText = formatTime(date, true, useUTC, use12Hour);
    } else {
      // For IANA timezones, use formatTimestampForTimezone which includes milliseconds
      timeText = formatTimestampForTimezone(now, this.data.timezone);
    }
    
    navigator.clipboard.writeText(timeText).catch(err => {
      console.error('Failed to copy time:', err);
    });
  }

  public updateData(data: TimeTileData): void {
    this.data = data;
    this.updateTime();
    this.updateMarks();
  }

  public destroy(): void {
    this.syncManager.unregister(this.syncModuleRef);
    this.clockManager.unsubscribe(this.clockSubscriber);
  }
}

