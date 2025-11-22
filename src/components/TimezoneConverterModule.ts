import { TimezoneConverterTileData } from '../types';
import { ClockManager } from '../utils/ClockManager';
import { formatTime, getHourFormat } from '../utils/time';

export class TimezoneConverterModule {
  private element: HTMLElement;
  private data: TimezoneConverterTileData;
  private clockManager: ClockManager;
  private clockSubscriber: { onTick: () => void };
  private dateInput!: HTMLInputElement;
  private timeInput!: HTMLInputElement;
  private sourceTimezoneSelect!: HTMLSelectElement;
  private addTimezoneSelect!: HTMLSelectElement;
  private resultsContainer!: HTMLElement;

  constructor(element: HTMLElement, data: TimezoneConverterTileData) {
    this.element = element;
    this.data = data;
    this.clockManager = ClockManager.getInstance();
    
    // Create clock subscriber - update if using "now"
    this.clockSubscriber = {
      onTick: () => {
        if (this.isUsingNow()) {
          this.updateConversions();
        }
      }
    };
    
    this.initialize();
    this.updateConversions(); // Initial update
    this.clockManager.subscribe(this.clockSubscriber);
  }

  private initialize(): void {
    const timezones = this.getAvailableTimezones();
    
    this.element.innerHTML = `
      <div class="timezone-converter-module">
        <div class="converter-header">
          <h3 class="converter-title">Timezone Converter</h3>
        </div>
        <div class="converter-inputs">
          <div class="input-group">
            <label class="input-label">Date (optional):</label>
            <div class="input-with-clear">
              <input type="date" class="input-field" data-date-input>
              <button class="input-clear-btn" data-clear-date title="Clear date (use today)">×</button>
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Time (optional):</label>
            <div class="input-with-clear">
              <input type="time" class="input-field" data-time-input step="1">
              <button class="input-clear-btn" data-clear-time title="Clear time (use now)">×</button>
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Source Timezone:</label>
            <select class="input-field" data-source-timezone>
              ${timezones.map(tz => `<option value="${tz.value}" ${tz.value === this.data.sourceTimezone ? 'selected' : ''}>${tz.label}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">Target Timezones:</label>
            <div class="add-timezone-group">
              <select class="input-field" data-add-timezone>
                <option value="">Add timezone...</option>
                ${timezones.map(tz => `<option value="${tz.value}">${tz.label}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="converter-results" data-results-container></div>
      </div>
    `;

    this.dateInput = this.element.querySelector('[data-date-input]') as HTMLInputElement;
    this.timeInput = this.element.querySelector('[data-time-input]') as HTMLInputElement;
    this.sourceTimezoneSelect = this.element.querySelector('[data-source-timezone]') as HTMLSelectElement;
    this.addTimezoneSelect = this.element.querySelector('[data-add-timezone]') as HTMLSelectElement;
    this.resultsContainer = this.element.querySelector('[data-results-container]')!;

    // Add event listeners
    this.dateInput.addEventListener('change', () => {
      this.updateConversions();
      this.saveToStorage();
    });

    this.timeInput.addEventListener('change', () => {
      this.updateConversions();
      this.saveToStorage();
    });

    // Clear date button
    this.element.querySelector('[data-clear-date]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dateInput.value = '';
      this.updateConversions();
      this.saveToStorage();
    });

    // Clear time button
    this.element.querySelector('[data-clear-time]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.timeInput.value = '';
      this.updateConversions();
      this.saveToStorage();
    });

    this.sourceTimezoneSelect.addEventListener('change', () => {
      this.data.sourceTimezone = this.sourceTimezoneSelect.value;
      this.updateConversions();
      this.saveToStorage();
    });

    this.addTimezoneSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value && !this.data.targetTimezones.includes(value)) {
        this.data.targetTimezones.push(value);
        this.updateConversions();
        this.saveToStorage();
      }
      this.addTimezoneSelect.value = '';
    });

    this.updateConversions();
  }

  private isUsingNow(): boolean {
    return !this.dateInput.value && !this.timeInput.value;
  }

  private updateConversions(): void {
    const sourceDate = this.getSourceDate();
    if (!sourceDate) {
      this.resultsContainer.innerHTML = '<div class="converter-error">Invalid date/time</div>';
      return;
    }

    const results = this.data.targetTimezones.map(targetTz => {
      const convertedTime = this.convertTime(sourceDate, this.data.sourceTimezone, targetTz);
      const dstInfo = this.getDSTInfo(targetTz, sourceDate);
      return { timezone: targetTz, time: convertedTime, dstInfo };
    });

    if (results.length === 0) {
      this.resultsContainer.innerHTML = '<div class="converter-empty">Add target timezones to see conversions</div>';
      return;
    }

    const timezones = this.getAvailableTimezones();
    const use12Hour = getHourFormat() === '12';
    
    this.resultsContainer.innerHTML = results.map(result => {
      const tzInfo = timezones.find(t => t.value === result.timezone);
      const label = tzInfo ? tzInfo.label : result.timezone;
      const dstIndicator = result.dstInfo.isDST ? '<span class="dst-indicator" title="Daylight Saving Time active">DST</span>' : '';
      
      return `
        <div class="conversion-result group">
          <button class="timezone-remove-btn" data-remove-tz="${result.timezone}" title="Remove timezone">×</button>
          <div class="result-timezone">
            <span class="result-label">${label}</span>
            ${dstIndicator}
          </div>
          <div class="result-time">${result.time}</div>
        </div>
      `;
    }).join('');

    // Add remove button handlers
    this.resultsContainer.querySelectorAll('[data-remove-tz]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tz = (e.target as HTMLElement).getAttribute('data-remove-tz');
        if (tz) {
          this.data.targetTimezones = this.data.targetTimezones.filter(t => t !== tz);
          this.updateConversions();
          this.saveToStorage();
        }
      });
    });
  }

  private getSourceDate(): Date | null {
    const dateValue = this.dateInput.value;
    const timeValue = this.timeInput.value;

    // If no date and no time, use current time
    if (!dateValue && !timeValue) {
      return new Date();
    }

    // If only time is provided, use today's date
    const dateStr = dateValue || new Date().toISOString().split('T')[0];
    // If only date is provided, use current time (in the source timezone)
    let timeStr = timeValue;
    if (!timeStr) {
      // Get current time in the source timezone
      const now = new Date();
      if (this.data.sourceTimezone === 'local') {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeStr = `${hours}:${minutes}:${seconds}`;
      } else if (this.data.sourceTimezone === 'utc') {
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        timeStr = `${hours}:${minutes}:${seconds}`;
      } else {
        // For IANA timezones, get current time in that timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: this.data.sourceTimezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(now);
        const hours = parts.find(p => p.type === 'hour')?.value || '00';
        const minutes = parts.find(p => p.type === 'minute')?.value || '00';
        const seconds = parts.find(p => p.type === 'second')?.value || '00';
        timeStr = `${hours}:${minutes}:${seconds}`;
      }
    }

    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const timeParts = timeStr.split(':');
      const hours = parseInt(timeParts[0] || '0', 10);
      const minutes = parseInt(timeParts[1] || '0', 10);
      const seconds = parseInt(timeParts[2] || '0', 10);

      if (this.data.sourceTimezone === 'local') {
        // Parse as local time
        return new Date(year, month - 1, day, hours, minutes, seconds);
      } else if (this.data.sourceTimezone === 'utc') {
        // Parse as UTC
        return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      } else {
        // For IANA timezones, interpret the input as being in that timezone
        // We'll create a date string and use a workaround with Intl API
        
        // Create an ISO-like string (but this will be interpreted as local)
        const localDate = new Date(year, month - 1, day, hours, minutes, seconds);
        
        // Now we need to find what UTC time corresponds to this local time in the source timezone
        // We'll use iteration to find the right UTC time
        
        // Start with the local date as UTC (this is our initial guess)
        let candidate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
        
        // Format this candidate in the source timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: this.data.sourceTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        // Try a few iterations to find the right UTC time
        for (let i = 0; i < 10; i++) {
          const parts = formatter.formatToParts(candidate);
          const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
          const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
          const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
          const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
          const tzMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
          const tzSecond = parseInt(parts.find(p => p.type === 'second')?.value || '0');
          
          // Check if we match
          if (tzYear === year && tzMonth === month && tzDay === day && 
              tzHour === hours && tzMinute === minutes && tzSecond === seconds) {
            return candidate;
          }
          
          // Calculate the difference and adjust
          const diff = (year - tzYear) * 365 * 24 * 60 * 60 * 1000 +
                      (month - tzMonth) * 30 * 24 * 60 * 60 * 1000 +
                      (day - tzDay) * 24 * 60 * 60 * 1000 +
                      (hours - tzHour) * 60 * 60 * 1000 +
                      (minutes - tzMinute) * 60 * 1000 +
                      (seconds - tzSecond) * 1000;
          
          candidate = new Date(candidate.getTime() - diff);
        }
        
        // If iteration didn't work, return the candidate anyway
        return candidate;
      }
    } catch (e) {
      console.error('Error parsing date/time:', e);
      return null;
    }
  }

  private convertTime(date: Date, sourceTz: string, targetTz: string): string {
    const use12Hour = getHourFormat() === '12';
    
    if (targetTz === 'local') {
      return formatTime(date, false, false, use12Hour);
    } else if (targetTz === 'utc') {
      return formatTime(date, false, true, use12Hour);
    } else {
      // IANA timezone
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: targetTz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: use12Hour
        });
        const parts = formatter.formatToParts(date);
        const hour = parts.find(p => p.type === 'hour')?.value || '00';
        const minute = parts.find(p => p.type === 'minute')?.value || '00';
        const second = parts.find(p => p.type === 'second')?.value || '00';
        const period = use12Hour ? (parts.find(p => p.type === 'dayPeriod')?.value || '') : '';
        const periodStr = period ? ` ${period.toUpperCase()}` : '';
        return `${hour}:${minute}:${second}${periodStr}`;
      } catch (e) {
        return 'Error';
      }
    }
  }

  private getDSTInfo(timezone: string, date: Date): { isDST: boolean; offset: number } {
    if (timezone === 'utc') {
      return { isDST: false, offset: 0 };
    }

    try {
      // Get timezone abbreviation which often indicates DST (e.g., EST vs EDT, PST vs PDT)
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      
      const parts = formatter.formatToParts(date);
      const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
      
      // Check if timezone abbreviation suggests DST
      // Common patterns: EDT, PDT, CDT, MDT, etc. (contains 'D' and is not just 'DST')
      // Also check for summer time indicators in other regions
      const hasDaylightIndicator = /[A-Z]DT/.test(tzName) || 
                                   tzName.includes('BST') || // British Summer Time
                                   tzName.includes('CEST') || // Central European Summer Time
                                   tzName.includes('AEDT'); // Australian Eastern Daylight Time
      
      // Also check offset by comparing with January (typically no DST in Northern Hemisphere)
      // and July (typically DST in Northern Hemisphere)
      const janDate = new Date(date.getFullYear(), 0, 15, 12, 0, 0);
      const currentOffset = this.getTimezoneOffset(timezone, date);
      const janOffset = this.getTimezoneOffset(timezone, janDate);
      
      // If current offset is different from January offset, likely DST
      // (This works for most timezones, though Southern Hemisphere is reversed)
      const offsetBasedDST = currentOffset !== janOffset;
      
      // For Southern Hemisphere, check July instead
      const julDate = new Date(date.getFullYear(), 6, 15, 12, 0, 0);
      const julOffset = this.getTimezoneOffset(timezone, julDate);
      const isSouthernHemisphere = currentOffset === julOffset && currentOffset !== janOffset;
      
      // Use abbreviation check first, then offset comparison
      // For Southern Hemisphere, reverse the logic
      let finalDST = hasDaylightIndicator;
      if (!hasDaylightIndicator) {
        if (isSouthernHemisphere) {
          // In Southern Hemisphere, DST is typically active in January (summer)
          finalDST = currentOffset === julOffset && currentOffset !== janOffset;
        } else {
          // In Northern Hemisphere, DST is typically active in July (summer)
          finalDST = offsetBasedDST;
        }
      }
      
      return { isDST: finalDST, offset: currentOffset };
    } catch (e) {
      return { isDST: false, offset: 0 };
    }
  }

  private getTimezoneOffset(timezone: string, date: Date): number {
    try {
      // Use a more reliable method to get timezone offset
      // Create two formatters - one for UTC and one for the timezone
      const utcFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const tzFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Format the same UTC timestamp in both timezones
      const utcParts = utcFormatter.formatToParts(date);
      const tzParts = tzFormatter.formatToParts(date);
      
      // Parse the times
      const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '0');
      const utcMinute = parseInt(utcParts.find(p => p.type === 'minute')?.value || '0');
      const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
      const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');
      
      // Calculate offset in minutes
      const utcMinutes = utcHour * 60 + utcMinute;
      const tzMinutes = tzHour * 60 + tzMinute;
      let offset = tzMinutes - utcMinutes;
      
      // Handle day boundaries (if timezone is ahead/behind by a day)
      const utcDay = parseInt(utcParts.find(p => p.type === 'day')?.value || '0');
      const tzDay = parseInt(tzParts.find(p => p.type === 'day')?.value || '0');
      if (tzDay !== utcDay) {
        if (tzDay > utcDay) {
          offset += 24 * 60; // Timezone is ahead
        } else {
          offset -= 24 * 60; // Timezone is behind
        }
      }
      
      return offset;
    } catch (e) {
      return 0;
    }
  }

  private getAvailableTimezones(): Array<{ value: string; label: string }> {
    return [
      { value: 'local', label: 'Local Time' },
      { value: 'utc', label: 'UTC' },
      { value: 'America/New_York', label: 'New York (EST/EDT)' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
      { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
      { value: 'America/Denver', label: 'Denver (MST/MDT)' },
      { value: 'America/Phoenix', label: 'Phoenix (MST)' },
      { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
      { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
      { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
      { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
      { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
      { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
      { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)' },
      { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
      { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
      { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
      { value: 'Asia/Dubai', label: 'Dubai (GST)' },
      { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
      { value: 'Asia/Seoul', label: 'Seoul (KST)' },
      { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
      { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
      { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
      { value: 'America/Sao_Paulo', label: 'São Paulo (BRT/BRST)' },
      { value: 'America/Mexico_City', label: 'Mexico City (CST/CDT)' },
      { value: 'Africa/Cairo', label: 'Cairo (EET/EEST)' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' }
    ];
  }

  private saveToStorage(): void {
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  public updateData(data: TimezoneConverterTileData): void {
    this.data = data;
    this.sourceTimezoneSelect.value = data.sourceTimezone;
    this.updateTargetTimezonesList();
    this.updateConversions();
  }

  public destroy(): void {
    this.clockManager.unsubscribe(this.clockSubscriber);
  }
}

