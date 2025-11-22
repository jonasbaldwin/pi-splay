import { CalendarTileData } from '../types';

export class CalendarModule {
  private element: HTMLElement;
  private data: CalendarTileData;
  private selectedDates: Date[] = [];
  private dateColors: number[] = []; // Color indices for each selected date
  private currentMonth: number;
  private currentYear: number;
  private comparisonDisplay!: HTMLElement;
  private monthYearDisplay!: HTMLElement;
  private lastClickedDate: string | null = null; // Track last clicked date to detect consecutive double-taps
  
  // Expanded color palette: red, green, yellow, purple, orange, cyan, pink, indigo, teal, amber
  private readonly colorPalette = [
    '#dc2626', // red
    '#16a34a', // green
    '#eab308', // yellow
    '#a855f7', // purple
    '#f97316', // orange
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#f59e0b', // amber
  ];

  constructor(element: HTMLElement, data: CalendarTileData) {
    this.element = element;
    this.data = data;
    
    // Initialize dates from data or use defaults - parse as local dates
    this.selectedDates = (data.selectedDates || []).map(d => this.parseLocalDate(d));
    // Initialize color indices from data or generate them
    this.dateColors = data.dateColors || [];
    // Ensure dateColors array matches selectedDates length
    while (this.dateColors.length < this.selectedDates.length) {
      this.dateColors.push(this.dateColors.length % this.colorPalette.length);
    }
    const today = new Date();
    this.currentMonth = data.currentMonth !== undefined ? data.currentMonth : today.getMonth();
    this.currentYear = data.currentYear !== undefined ? data.currentYear : today.getFullYear();
    
    this.initialize();
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="calendar-module">
        <div class="calendar-header">
          <div class="calendar-drag-handle"></div>
          <div class="calendar-controls">
            <button class="btn-nav" data-nav-prev>‹</button>
            <div class="month-year-display" data-month-year>
              <select class="month-select" data-month-select></select>
              <select class="year-select" data-year-select></select>
            </div>
            <button class="btn-nav" data-nav-next>›</button>
          </div>
          <div class="calendar-actions">
            <button class="btn-reset-view" data-reset-view>Today</button>
            <button class="btn-reset-dates" data-reset-dates>Clear</button>
          </div>
        </div>
        <div class="calendar-months" data-calendar-months></div>
        <div class="comparison-display" data-comparison></div>
      </div>
    `;

    this.comparisonDisplay = this.element.querySelector('[data-comparison]')!;
    this.monthYearDisplay = this.element.querySelector('[data-month-year]')!;
    
    this.setupEventListeners();
    this.renderCalendar();
    this.updateComparison();
  }

  private setupEventListeners(): void {
    // Navigation buttons
    this.element.querySelector('[data-nav-prev]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.currentMonth--;
      if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
      }
      this.renderCalendar();
      this.saveToStorage();
    });

    this.element.querySelector('[data-nav-next]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.currentMonth++;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear++;
      }
      this.renderCalendar();
      this.saveToStorage();
    });

    // Reset view button
    this.element.querySelector('[data-reset-view]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const today = new Date();
      this.currentMonth = today.getMonth();
      this.currentYear = today.getFullYear();
      this.renderCalendar();
      this.saveToStorage();
    });

    // Reset dates button
    this.element.querySelector('[data-reset-dates]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectedDates = [];
      this.dateColors = [];
      this.data.selectedDates = [];
      this.data.dateColors = [];
      this.updateComparison();
      this.renderCalendar();
      this.saveToStorage();
    });

    // Month/year selectors
    const monthSelect = this.element.querySelector('[data-month-select]') as HTMLSelectElement;
    const yearSelect = this.element.querySelector('[data-year-select]') as HTMLSelectElement;

    // Populate month selector
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    monthSelect.innerHTML = months.map((m, i) => 
      `<option value="${i}" ${i === this.currentMonth ? 'selected' : ''}>${m}</option>`
    ).join('');

    // Populate year selector (current year ± 10 years)
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = Array.from({ length: 21 }, (_, i) => {
      const year = currentYear - 10 + i;
      return `<option value="${year}" ${year === this.currentYear ? 'selected' : ''}>${year}</option>`;
    }).join('');

    monthSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      this.currentMonth = parseInt((e.target as HTMLSelectElement).value, 10);
      this.renderCalendar();
      this.saveToStorage();
    });

    yearSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      this.currentYear = parseInt((e.target as HTMLSelectElement).value, 10);
      this.renderCalendar();
      this.saveToStorage();
    });
  }

  private renderCalendar(): void {
    const monthsContainer = this.element.querySelector('[data-calendar-months]')!;
    
    // Render current month and next month
    const month1 = this.renderMonth(this.currentMonth, this.currentYear);
    const nextMonth = this.currentMonth === 11 ? 0 : this.currentMonth + 1;
    const nextYear = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear;
    const month2 = this.renderMonth(nextMonth, nextYear);
    
    monthsContainer.innerHTML = `
      <div class="calendar-month-container">${month1}</div>
      <div class="calendar-month-container">${month2}</div>
    `;

    // Update month/year selectors
    const monthSelect = this.element.querySelector('[data-month-select]') as HTMLSelectElement;
    const yearSelect = this.element.querySelector('[data-year-select]') as HTMLSelectElement;
    if (monthSelect) monthSelect.value = this.currentMonth.toString();
    if (yearSelect) yearSelect.value = this.currentYear.toString();

    // Add click handlers to days
    monthsContainer.querySelectorAll('.calendar-day').forEach(dayEl => {
      dayEl.addEventListener('click', (e) => {
        // Don't handle day clicks in edit mode
        const tileManager = (window as any).tileManager;
        if (tileManager && tileManager.isInEditMode && tileManager.isInEditMode()) {
          return;
        }
        const target = e.target as HTMLElement;
        const dateStr = target.getAttribute('data-date');
        if (dateStr) {
          // Parse as local date (YYYY-MM-DD format)
          this.handleDayClick(this.parseLocalDate(dateStr));
        }
      });
    });
  }

  private renderMonth(month: number, year: number): string {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const today = new Date();
    const todayStr = this.formatDateKey(today);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    let html = `<div class="calendar-month-header">${monthNames[month]} ${year}</div>`;
    html += '<div class="calendar-weekdays">';
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
      html += `<div class="calendar-weekday">${day}</div>`;
    });
    html += '</div>';
    html += '<div class="calendar-days">';
    
    // Empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      html += '<div class="calendar-day empty"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDateKey(date);
      const isToday = dateStr === todayStr;
      const selectedIndex = this.selectedDates.findIndex(d => this.formatDateKey(d) === dateStr);
      const isSelected = selectedIndex !== -1;
      
      let classes = 'calendar-day';
      let style = '';
      if (isToday) {
        classes += ' today';
        style = 'background-color: #2563eb;'; // blue
      } else if (isSelected) {
        classes += ' selected';
        // Use the stored color index for this date
        const colorIndex = this.dateColors[selectedIndex] || (selectedIndex % this.colorPalette.length);
        const color = this.colorPalette[colorIndex % this.colorPalette.length];
        style = `background-color: ${color};`;
      }
      
      // Store date as local date string (YYYY-MM-DD) instead of ISO string to avoid timezone issues
      html += `<div class="${classes}" data-date="${dateStr}" style="${style}">${day}</div>`;
    }
    
    html += '</div>';
    return html;
  }

  private handleDayClick(date: Date): void {
    const dateCopy = new Date(date);
    dateCopy.setHours(0, 0, 0, 0);
    const dateKey = this.formatDateKey(dateCopy);
    
    // If clicking the same date twice in a row, do nothing
    if (this.lastClickedDate === dateKey) {
      return;
    }
    
    // Check if this date is already selected
    const existingIndex = this.selectedDates.findIndex(d => this.formatDateKey(d) === dateKey);
    
    if (existingIndex !== -1) {
      // Date already exists - use its existing color (move it to end to update comparison order)
      const existingColorIndex = this.dateColors[existingIndex];
      this.selectedDates.splice(existingIndex, 1);
      this.dateColors.splice(existingIndex, 1);
      this.selectedDates.push(dateCopy);
      this.dateColors.push(existingColorIndex);
    } else {
      // New date - add with new color
      this.selectedDates.push(dateCopy);
      const colorIndex = this.dateColors.length % this.colorPalette.length;
      this.dateColors.push(colorIndex);
    }
    
    // Update last clicked date
    this.lastClickedDate = dateKey;
    
    // Update data object
    this.data.selectedDates = this.selectedDates.map(d => this.formatDateKey(d));
    this.data.dateColors = [...this.dateColors];
    
    this.updateComparison();
    this.renderCalendar();
    this.saveToStorage();
  }

  private updateComparison(): void {
    if (this.selectedDates.length === 0) {
      this.comparisonDisplay.innerHTML = '<div class="comparison-empty">No dates selected</div>';
      return;
    }

    // Build comparison items array
    const comparisonItems: Array<{ html: string; order: number }> = [];
    
    if (this.selectedDates.length === 1) {
      // First date: compare to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(this.selectedDates[0]);
      selected.setHours(0, 0, 0, 0);
      
      const diffMs = selected.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      const dateStr = this.formatDateDisplay(selected);
      const colorIndex = this.dateColors[0] || 0;
      const color = this.colorPalette[colorIndex % this.colorPalette.length];
      const datePillStyle = `background-color: ${color}; color: white; font-weight: bold;`;
      
      let text = '';
      if (diffDays === 0) {
        text = `<span class="date-pill" style="${datePillStyle}">${dateStr}</span>: Today`;
      } else if (diffDays > 0) {
        text = `<span class="date-pill" style="${datePillStyle}">${dateStr}</span>: ${diffDays} day${diffDays !== 1 ? 's' : ''} from now`;
      } else {
        text = `<span class="date-pill" style="${datePillStyle}">${dateStr}</span>: ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
      }
      
      comparisonItems.push({ html: `<div class="comparison-item">${text}</div>`, order: 0 });
    } else {
      // For multiple dates, compare each pair
      for (let i = 0; i < this.selectedDates.length; i++) {
        const date1 = new Date(this.selectedDates[i]);
        date1.setHours(0, 0, 0, 0);
        const date1Str = this.formatDateDisplay(date1);
        const colorIndex1 = this.dateColors[i] || (i % this.colorPalette.length);
        const color1 = this.colorPalette[colorIndex1 % this.colorPalette.length];
        const date1PillStyle = `background-color: ${color1}; color: white; font-weight: bold;`;
        
        if (i === 0) {
          // First date: compare to today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffMs = date1.getTime() - today.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          
          let text = '';
          if (diffDays === 0) {
            text = `<span class="date-pill" style="${date1PillStyle}">${date1Str}</span>: Today`;
          } else if (diffDays > 0) {
            text = `<span class="date-pill" style="${date1PillStyle}">${date1Str}</span>: ${diffDays} day${diffDays !== 1 ? 's' : ''} from now`;
          } else {
            text = `<span class="date-pill" style="${date1PillStyle}">${date1Str}</span>: ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
          }
          
          comparisonItems.push({ html: `<div class="comparison-item">${text}</div>`, order: i + 1 });
        } else {
          // Compare to previous date
          const date2 = new Date(this.selectedDates[i - 1]);
          date2.setHours(0, 0, 0, 0);
          const date2Str = this.formatDateDisplay(date2);
          const colorIndex2 = this.dateColors[i - 1] || ((i - 1) % this.colorPalette.length);
          const color2 = this.colorPalette[colorIndex2 % this.colorPalette.length];
          const date2PillStyle = `background-color: ${color2}; color: white; font-weight: bold;`;
          
          const diffMs = date1.getTime() - date2.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          
          let text = '';
          if (diffDays === 0) {
            text = `<span class="date-pill" style="${date2PillStyle}">${date2Str}</span> to <span class="date-pill" style="${date1PillStyle}">${date1Str}</span>: Same day`;
          } else if (diffDays > 0) {
            text = `<span class="date-pill" style="${date2PillStyle}">${date2Str}</span> to <span class="date-pill" style="${date1PillStyle}">${date1Str}</span>: ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
          } else {
            text = `<span class="date-pill" style="${date2PillStyle}">${date2Str}</span> to <span class="date-pill" style="${date1PillStyle}">${date1Str}</span>: ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} earlier`;
          }
          
          comparisonItems.push({ html: `<div class="comparison-item">${text}</div>`, order: i + 1 });
        }
      }
    }
    
    // Sort by order (reverse order - most recent first)
    comparisonItems.sort((a, b) => b.order - a.order);
    
    let html = '<div class="comparison-results">';
    comparisonItems.forEach(item => {
      html += item.html;
    });
    html += '</div>';
    this.comparisonDisplay.innerHTML = html;
  }

  private formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private parseLocalDate(dateStr: string): Date {
    // Parse YYYY-MM-DD format as a local date (not UTC)
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    // Fallback to regular Date parsing if format doesn't match
    return new Date(dateStr);
  }

  private formatDateDisplay(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }

  public updateData(data: CalendarTileData): void {
    this.data = data;
    // Parse dates as local dates to avoid timezone issues
    this.selectedDates = data.selectedDates.map(d => this.parseLocalDate(d));
    // Initialize color indices from data or generate them
    this.dateColors = data.dateColors || [];
    // Ensure dateColors array matches selectedDates length
    while (this.dateColors.length < this.selectedDates.length) {
      this.dateColors.push(this.dateColors.length % this.colorPalette.length);
    }
    if (data.currentMonth !== undefined) this.currentMonth = data.currentMonth;
    if (data.currentYear !== undefined) this.currentYear = data.currentYear;
    
    // Update data object with current state
    this.data.selectedDates = this.selectedDates.map(d => this.formatDateKey(d));
    this.data.dateColors = [...this.dateColors];
    this.data.currentMonth = this.currentMonth;
    this.data.currentYear = this.currentYear;
    
    this.renderCalendar();
    this.updateComparison();
  }
  
  private saveToStorage(): void {
    // Update data object with current state
    this.data.selectedDates = this.selectedDates.map(d => this.formatDateKey(d));
    this.data.dateColors = [...this.dateColors];
    this.data.currentMonth = this.currentMonth;
    this.data.currentYear = this.currentYear;
    
    // Save to storage via tile manager
    const tileManager = (window as any).tileManager;
    if (tileManager && tileManager.saveToStorage) {
      tileManager.saveToStorage();
    }
  }

  public destroy(): void {
    // No intervals to clean up for calendar
  }
}

