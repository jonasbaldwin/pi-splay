import { FormatHelperTileData } from '../types';

interface FormatOption {
  name: string;
  format: string;
  example: string;
}

interface LanguageFormat {
  language: string;
  formats: FormatOption[];
}

export class FormatHelperModule {
  private element: HTMLElement;
  private data: FormatHelperTileData;
  private dateInput!: HTMLInputElement;
  private timeInput!: HTMLInputElement;
  private languageSelect!: HTMLSelectElement;
  private formatList!: HTMLElement;
  private currentDate: Date = new Date();

  // Format definitions for different languages
  private languageFormats: Record<string, FormatOption[]> = {
    javascript: [
      { name: 'ISO String', format: 'toISOString()', example: '2024-01-15T10:30:00.000Z' },
      { name: 'Locale Date String', format: 'toLocaleDateString()', example: '1/15/2024' },
      { name: 'Locale Time String', format: 'toLocaleTimeString()', example: '10:30:00 AM' },
      { name: 'Locale String', format: 'toLocaleString()', example: '1/15/2024, 10:30:00 AM' },
      { name: 'Date String', format: 'toString()', example: 'Mon Jan 15 2024 10:30:00 GMT-0800' },
      { name: 'Date Only (YYYY-MM-DD)', format: 'toISOString().split(\'T\')[0]', example: '2024-01-15' },
      { name: 'Time Only (HH:MM:SS)', format: 'toTimeString().split(\' \')[0]', example: '10:30:00' },
      { name: 'Unix Timestamp (ms)', format: 'getTime()', example: '1705342200000' },
      { name: 'Unix Timestamp (s)', format: 'Math.floor(getTime() / 1000)', example: '1705342200' },
      { name: 'Year', format: 'getFullYear()', example: '2024' },
      { name: 'Month (0-11)', format: 'getMonth()', example: '0' },
      { name: 'Month (1-12)', format: 'getMonth() + 1', example: '1' },
      { name: 'Day of Month', format: 'getDate()', example: '15' },
      { name: 'Day of Week (0-6)', format: 'getDay()', example: '1' },
      { name: 'Hours (0-23)', format: 'getHours()', example: '10' },
      { name: 'Minutes', format: 'getMinutes()', example: '30' },
      { name: 'Seconds', format: 'getSeconds()', example: '0' },
      { name: 'Milliseconds', format: 'getMilliseconds()', example: '0' }
    ],
    python: [
      { name: 'ISO Format', format: 'strftime("%Y-%m-%dT%H:%M:%S")', example: '2024-01-15T10:30:00' },
      { name: 'Date Only', format: 'strftime("%Y-%m-%d")', example: '2024-01-15' },
      { name: 'Time Only', format: 'strftime("%H:%M:%S")', example: '10:30:00' },
      { name: 'Full Date/Time', format: 'strftime("%Y-%m-%d %H:%M:%S")', example: '2024-01-15 10:30:00' },
      { name: 'US Format', format: 'strftime("%m/%d/%Y")', example: '01/15/2024' },
      { name: 'European Format', format: 'strftime("%d/%m/%Y")', example: '15/01/2024' },
      { name: 'Unix Timestamp', format: 'timestamp()', example: '1705342200.0' },
      { name: 'Year', format: 'strftime("%Y")', example: '2024' },
      { name: 'Month', format: 'strftime("%m")', example: '01' },
      { name: 'Day', format: 'strftime("%d")', example: '15' },
      { name: 'Hour (24h)', format: 'strftime("%H")', example: '10' },
      { name: 'Hour (12h)', format: 'strftime("%I")', example: '10' },
      { name: 'Minutes', format: 'strftime("%M")', example: '30' },
      { name: 'Seconds', format: 'strftime("%S")', example: '00' },
      { name: 'AM/PM', format: 'strftime("%p")', example: 'AM' },
      { name: 'Day Name', format: 'strftime("%A")', example: 'Monday' },
      { name: 'Month Name', format: 'strftime("%B")', example: 'January' }
    ],
    java: [
      { name: 'ISO Format', format: 'DateTimeFormatter.ISO_DATE_TIME', example: '2024-01-15T10:30:00' },
      { name: 'Date Only', format: 'DateTimeFormatter.ISO_DATE', example: '2024-01-15' },
      { name: 'Time Only', format: 'DateTimeFormatter.ISO_TIME', example: '10:30:00' },
      { name: 'Custom (yyyy-MM-dd)', format: 'DateTimeFormatter.ofPattern("yyyy-MM-dd")', example: '2024-01-15' },
      { name: 'Custom (HH:mm:ss)', format: 'DateTimeFormatter.ofPattern("HH:mm:ss")', example: '10:30:00' },
      { name: 'Custom (MM/dd/yyyy)', format: 'DateTimeFormatter.ofPattern("MM/dd/yyyy")', example: '01/15/2024' },
      { name: 'Unix Timestamp (ms)', format: 'toEpochMilli()', example: '1705342200000' },
      { name: 'Unix Timestamp (s)', format: 'getEpochSecond()', example: '1705342200' },
      { name: 'Year', format: 'getYear()', example: '2024' },
      { name: 'Month', format: 'getMonthValue()', example: '1' },
      { name: 'Day', format: 'getDayOfMonth()', example: '15' },
      { name: 'Hour', format: 'getHour()', example: '10' },
      { name: 'Minute', format: 'getMinute()', example: '30' },
      { name: 'Second', format: 'getSecond()', example: '0' },
      { name: 'Day of Week', format: 'getDayOfWeek()', example: 'MONDAY' }
    ],
    clojure: [
      { name: 'ISO Format', format: '(str date)', example: '"2024-01-15T10:30:00Z"' },
      { name: 'Date Only', format: '(format date "yyyy-MM-dd")', example: '"2024-01-15"' },
      { name: 'Time Only', format: '(format date "HH:mm:ss")', example: '"10:30:00"' },
      { name: 'Custom Format', format: '(format date "yyyy-MM-dd HH:mm:ss")', example: '"2024-01-15 10:30:00"' },
      { name: 'Unix Timestamp (ms)', format: '(.getTime date)', example: '1705342200000' },
      { name: 'Unix Timestamp (s)', format: '(/ (.getTime date) 1000)', example: '1705342200' },
      { name: 'Year', format: '(.getYear date)', example: '2024' },
      { name: 'Month', format: '(.getMonth date)', example: '0' },
      { name: 'Day', format: '(.getDate date)', example: '15' },
      { name: 'Hour', format: '(.getHours date)', example: '10' },
      { name: 'Minute', format: '(.getMinutes date)', example: '30' },
      { name: 'Second', format: '(.getSeconds date)', example: '0' }
    ],
    c: [
      { name: 'ISO Format', format: 'strftime(buffer, size, "%Y-%m-%dT%H:%M:%S", tm)', example: '2024-01-15T10:30:00' },
      { name: 'Date Only', format: 'strftime(buffer, size, "%Y-%m-%d", tm)', example: '2024-01-15' },
      { name: 'Time Only', format: 'strftime(buffer, size, "%H:%M:%S", tm)', example: '10:30:00' },
      { name: 'US Format', format: 'strftime(buffer, size, "%m/%d/%Y", tm)', example: '01/15/2024' },
      { name: 'European Format', format: 'strftime(buffer, size, "%d/%m/%Y", tm)', example: '15/01/2024' },
      { name: 'Unix Timestamp', format: 'mktime(tm)', example: '1705342200' },
      { name: 'Year', format: 'tm->tm_year + 1900', example: '2024' },
      { name: 'Month (0-11)', format: 'tm->tm_mon', example: '0' },
      { name: 'Month (1-12)', format: 'tm->tm_mon + 1', example: '1' },
      { name: 'Day', format: 'tm->tm_mday', example: '15' },
      { name: 'Hour', format: 'tm->tm_hour', example: '10' },
      { name: 'Minute', format: 'tm->tm_min', example: '30' },
      { name: 'Second', format: 'tm->tm_sec', example: '0' },
      { name: 'Day of Week (0-6)', format: 'tm->tm_wday', example: '1' }
    ],
    go: [
      { name: 'RFC3339 (ISO)', format: 'Format(time.RFC3339)', example: '2024-01-15T10:30:00Z07:00' },
      { name: 'Date Only', format: 'Format("2006-01-02")', example: '2024-01-15' },
      { name: 'Time Only', format: 'Format("15:04:05")', example: '10:30:00' },
      { name: 'Custom Format', format: 'Format("2006-01-02 15:04:05")', example: '2024-01-15 10:30:00' },
      { name: 'US Format', format: 'Format("01/02/2006")', example: '01/15/2024' },
      { name: 'Unix Timestamp', format: 'Unix()', example: '1705342200' },
      { name: 'Unix Timestamp (ms)', format: 'UnixMilli()', example: '1705342200000' },
      { name: 'Year', format: 'Year()', example: '2024' },
      { name: 'Month', format: 'Month()', example: 'January' },
      { name: 'Day', format: 'Day()', example: '15' },
      { name: 'Hour', format: 'Hour()', example: '10' },
      { name: 'Minute', format: 'Minute()', example: '30' },
      { name: 'Second', format: 'Second()', example: '0' }
    ],
    rust: [
      { name: 'ISO Format', format: 'format("%Y-%m-%dT%H:%M:%S")', example: '2024-01-15T10:30:00' },
      { name: 'RFC3339', format: 'to_rfc3339()', example: '2024-01-15T10:30:00+00:00' },
      { name: 'Date Only', format: 'format("%Y-%m-%d")', example: '2024-01-15' },
      { name: 'Time Only', format: 'format("%H:%M:%S")', example: '10:30:00' },
      { name: 'Unix Timestamp (s)', format: 'timestamp()', example: '1705342200' },
      { name: 'Unix Timestamp (ms)', format: 'timestamp_millis()', example: '1705342200' },
      { name: 'Year', format: 'year()', example: '2024' },
      { name: 'Month', format: 'month()', example: '1' },
      { name: 'Day', format: 'day()', example: '15' },
      { name: 'Hour', format: 'hour()', example: '10' },
      { name: 'Minute', format: 'minute()', example: '30' },
      { name: 'Second', format: 'second()', example: '0' }
    ],
    php: [
      { name: 'ISO Format', format: 'date("Y-m-d\\TH:i:s")', example: '2024-01-15T10:30:00' },
      { name: 'Date Only', format: 'date("Y-m-d")', example: '2024-01-15' },
      { name: 'Time Only', format: 'date("H:i:s")', example: '10:30:00' },
      { name: 'US Format', format: 'date("m/d/Y")', example: '01/15/2024' },
      { name: 'European Format', format: 'date("d/m/Y")', example: '15/01/2024' },
      { name: 'Unix Timestamp', format: 'time()', example: '1705342200' },
      { name: 'Year', format: 'date("Y")', example: '2024' },
      { name: 'Month', format: 'date("m")', example: '01' },
      { name: 'Day', format: 'date("d")', example: '15' },
      { name: 'Hour (24h)', format: 'date("H")', example: '10' },
      { name: 'Hour (12h)', format: 'date("h")', example: '10' },
      { name: 'Minute', format: 'date("i")', example: '30' },
      { name: 'Second', format: 'date("s")', example: '00' },
      { name: 'AM/PM', format: 'date("A")', example: 'AM' }
    ]
  };

  constructor(element: HTMLElement, data: FormatHelperTileData) {
    this.element = element;
    this.data = data;
    this.initialize();
  }

  private initialize(): void {
    // Get current date/time as defaults
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

    this.element.innerHTML = `
      <div class="format-helper-module">
        <div class="format-helper-header">
          <h3 class="format-helper-title">Date Formatter</h3>
        </div>
        <div class="format-helper-inputs">
          <div class="format-input-group">
            <label for="format-date-input">Date:</label>
            <input type="date" id="format-date-input" class="format-input" value="${dateStr}">
          </div>
          <div class="format-input-group">
            <label for="format-time-input">Time:</label>
            <input type="time" id="format-time-input" class="format-input" value="${timeStr}">
          </div>
        </div>
        <div class="format-helper-controls">
          <div class="format-control-group">
            <label for="format-language-select">Language:</label>
            <select id="format-language-select" class="format-select">
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="clojure">Clojure</option>
              <option value="c">C</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="php">PHP</option>
            </select>
          </div>
        </div>
        <div class="format-list" data-format-list></div>
      </div>
    `;

    this.dateInput = this.element.querySelector('#format-date-input') as HTMLInputElement;
    this.timeInput = this.element.querySelector('#format-time-input') as HTMLInputElement;
    this.languageSelect = this.element.querySelector('#format-language-select') as HTMLSelectElement;
    this.formatList = this.element.querySelector('[data-format-list]')!;

    // Set initial language from data or default to javascript
    const selectedLanguage = this.data.selectedLanguage || 'javascript';
    this.languageSelect.value = selectedLanguage;

    // Update current date from inputs
    this.updateCurrentDate();

    // Add event listeners
    this.dateInput.addEventListener('change', () => {
      this.updateCurrentDate();
      this.updateFormatList();
    });

    this.timeInput.addEventListener('change', () => {
      this.updateCurrentDate();
      this.updateFormatList();
    });

    this.languageSelect.addEventListener('change', () => {
      this.data.selectedLanguage = this.languageSelect.value;
      this.saveToStorage();
      this.updateFormatList();
    });

    // Initial render
    this.updateFormatList();
  }

  private updateCurrentDate(): void {
    const dateValue = this.dateInput.value;
    const timeValue = this.timeInput.value;

    if (dateValue && timeValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      const [hours, minutes] = timeValue.split(':').map(Number);
      this.currentDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    } else if (dateValue) {
      const [year, month, day] = dateValue.split('-').map(Number);
      this.currentDate = new Date(year, month - 1, day);
    } else if (timeValue) {
      const now = new Date();
      const [hours, minutes] = timeValue.split(':').map(Number);
      this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    } else {
      this.currentDate = new Date();
    }
  }

  private updateFormatList(): void {
    const language = this.languageSelect.value;
    const formats = this.languageFormats[language] || [];

    if (formats.length === 0) {
      this.formatList.innerHTML = '<div class="format-placeholder">No formats available for this language.</div>';
      return;
    }

    const formatsHtml = formats.map(format => {
      const example = this.generateExample(format, language);
      return `
        <div class="format-item">
          <div class="format-name">${format.name}</div>
          <div class="format-code">${this.escapeHtml(format.format)}</div>
          <div class="format-example">Example: ${this.escapeHtml(example)}</div>
        </div>
      `;
    }).join('');

    this.formatList.innerHTML = formatsHtml;
  }

  private generateExample(format: FormatOption, language: string): string {
    const date = this.currentDate;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthZero = String(month).padStart(2, '0');
    const day = date.getDate();
    const dayZero = String(day).padStart(2, '0');
    const hours = date.getHours();
    const hoursZero = String(hours).padStart(2, '0');
    const hours12 = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
    const hours12Zero = String(hours12).padStart(2, '0');
    const minutes = date.getMinutes();
    const minutesZero = String(minutes).padStart(2, '0');
    const seconds = date.getSeconds();
    const secondsZero = String(seconds).padStart(2, '0');
    const milliseconds = date.getMilliseconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const unixMs = date.getTime();
    const unixS = Math.floor(unixMs / 1000);
    const dayOfWeek = date.getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = dayNames[dayOfWeek];
    const monthName = monthNames[date.getMonth()];
    const isoString = date.toISOString();
    const isoDate = isoString.split('T')[0];
    const isoTime = isoString.split('T')[1].split('.')[0];

    // Generate example based on format name and language
    const formatName = format.name.toLowerCase();
    
    if (formatName.includes('iso') && !formatName.includes('date only')) {
      if (language === 'javascript' && formatName.includes('string')) {
        return date.toISOString();
      }
      return `${isoDate}T${isoTime}`;
    }
    
    if (formatName.includes('date only') || (formatName.includes('date') && !formatName.includes('time'))) {
      if (formatName.includes('us format') || formatName.includes('mm/dd/yyyy')) {
        return `${monthZero}/${dayZero}/${year}`;
      }
      if (formatName.includes('european') || formatName.includes('dd/mm/yyyy')) {
        return `${dayZero}/${monthZero}/${year}`;
      }
      return `${year}-${monthZero}-${dayZero}`;
    }
    
    if (formatName.includes('time only') || (formatName.includes('time') && !formatName.includes('date'))) {
      if (formatName.includes('12h') || formatName.includes('12 hour')) {
        return `${hours12Zero}:${minutesZero}:${secondsZero} ${ampm}`;
      }
      return `${hoursZero}:${minutesZero}:${secondsZero}`;
    }
    
    if (formatName.includes('locale date string')) {
      return date.toLocaleDateString();
    }
    
    if (formatName.includes('locale time string')) {
      return date.toLocaleTimeString();
    }
    
    if (formatName.includes('locale string')) {
      return date.toLocaleString();
    }
    
    if (formatName.includes('date string') || formatName.includes('tostring')) {
      return date.toString();
    }
    
    if (formatName.includes('unix timestamp')) {
      if (formatName.includes('ms') || formatName.includes('milli')) {
        return String(unixMs);
      }
      if (language === 'python') {
        return `${unixS}.0`;
      }
      return String(unixS);
    }
    
    if (formatName.includes('year')) {
      return String(year);
    }
    
    if (formatName.includes('month')) {
      if (formatName.includes('0-11') || formatName.includes('getmonth')) {
        return String(date.getMonth());
      }
      if (formatName.includes('name')) {
        return monthName;
      }
      if (formatName.includes('1-12')) {
        return String(month);
      }
      return monthZero;
    }
    
    if (formatName.includes('day')) {
      if (formatName.includes('week')) {
        if (language === 'java') {
          return dayName.toUpperCase();
        }
        return dayName;
      }
      if (formatName.includes('0-6') || formatName.includes('getday')) {
        return String(dayOfWeek);
      }
      return dayZero;
    }
    
    if (formatName.includes('hour')) {
      if (formatName.includes('12h') || formatName.includes('12 hour')) {
        return hours12Zero;
      }
      return String(hours);
    }
    
    if (formatName.includes('minute')) {
      return String(minutes);
    }
    
    if (formatName.includes('second')) {
      return String(seconds);
    }
    
    if (formatName.includes('millisecond')) {
      return String(milliseconds);
    }
    
    if (formatName.includes('am/pm') || formatName.includes('ampm')) {
      return ampm;
    }
    
    if (formatName.includes('full date/time') || formatName.includes('custom format')) {
      if (format.format.includes('yyyy-MM-dd HH:mm:ss') || format.format.includes('%Y-%m-%d %H:%M:%S')) {
        return `${year}-${monthZero}-${dayZero} ${hoursZero}:${minutesZero}:${secondsZero}`;
      }
      return `${year}-${monthZero}-${dayZero} ${hoursZero}:${minutesZero}:${secondsZero}`;
    }
    
    // Default: try to parse common patterns
    if (format.format.includes('YYYY') || format.format.includes('%Y')) {
      if (format.format.includes('MM') || format.format.includes('%m')) {
        if (format.format.includes('dd') || format.format.includes('%d')) {
          if (format.format.includes('HH') || format.format.includes('%H')) {
            return `${year}-${monthZero}-${dayZero} ${hoursZero}:${minutesZero}:${secondsZero}`;
          }
          return `${year}-${monthZero}-${dayZero}`;
        }
      }
    }
    
    // Fallback to static example if we can't generate one
    return format.example;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private saveToStorage(): void {
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  public updateData(data: FormatHelperTileData): void {
    this.data = data;
    if (data.selectedLanguage && this.languageSelect) {
      this.languageSelect.value = data.selectedLanguage;
      this.updateFormatList();
    }
  }

  public destroy(): void {
    // Cleanup if needed
  }
}

