const HOUR_FORMAT_KEY = 'pi-splay-hour-format';

export function getHourFormat(): '12' | '24' {
  try {
    const stored = localStorage.getItem(HOUR_FORMAT_KEY);
    if (stored === '12' || stored === '24') {
      return stored;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return '24'; // Default to 24-hour format
}

export function setHourFormat(format: '12' | '24'): void {
  try {
    localStorage.setItem(HOUR_FORMAT_KEY, format);
  } catch (e) {
    console.error('Failed to save hour format preference:', e);
  }
}

export function formatTime(date: Date, includeMilliseconds: boolean = false, useUTC: boolean = false, use12Hour?: boolean): string {
  const hourFormat = use12Hour !== undefined ? use12Hour : getHourFormat() === '12';
  
  let hours = useUTC ? date.getUTCHours() : date.getHours();
  const minutes = useUTC ? date.getUTCMinutes() : date.getMinutes();
  const seconds = useUTC ? date.getUTCSeconds() : date.getSeconds();
  const ms = useUTC ? date.getUTCMilliseconds() : date.getMilliseconds();
  
  let period = '';
  if (hourFormat) {
    period = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
  }
  
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  
  if (includeMilliseconds) {
    const msStr = String(ms).padStart(4, '0');
    return `${hoursStr}:${minutesStr}:${secondsStr}.${msStr}${period}`;
  }
  
  return `${hoursStr}:${minutesStr}:${secondsStr}${period}`;
}

export function getTimeForTimezone(timezone: string): Date {
  if (timezone === 'local') {
    return new Date();
  } else if (timezone === 'utc') {
    return new Date();
  } else {
    // IANA timezone - format as ISO string with timezone
    const now = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';
      const hour = parts.find(p => p.type === 'hour')?.value || '';
      const minute = parts.find(p => p.type === 'minute')?.value || '';
      const second = parts.find(p => p.type === 'second')?.value || '';
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    } catch (e) {
      // Fallback to local time if timezone is invalid
      return new Date();
    }
  }
}

export function createTimeMark(timezone: string): { time: string; epoch: number; timestamp: number } {
  const date = getTimeForTimezone(timezone);
  const timestamp = date.getTime(); // Store full timestamp in milliseconds
  const epoch = Math.floor(timestamp / 1000);
  const useUTC = timezone === 'utc';
  const time = formatTime(date, true, useUTC);
  return { time, epoch, timestamp };
}

export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } else if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  } else {
    return `${seconds}s`;
  }
}

export function formatDetailedElapsedTime(ms: number): string {
  const totalMs = Math.abs(ms);
  
  // Calculate each component
  const milliseconds = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  const days = totalDays % 365;
  const years = Math.floor(totalDays / 365);
  
  // Always show all components: y years d days h hours m minutes s seconds m milliseconds
  return `${years}y ${days}d ${hours}h ${minutes}m ${seconds}s ${milliseconds}ms`;
}

/**
 * Formats a UTC timestamp (milliseconds) as a time string for a given timezone.
 * This is used to convert stored UTC timestamps to the appropriate display timezone.
 */
export function formatTimestampForTimezone(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  const use12Hour = getHourFormat() === '12';
  
  if (timezone === 'local') {
    // Use local time
    return formatTime(date, true, false, use12Hour);
  } else if (timezone === 'utc') {
    // Use UTC time
    return formatTime(date, true, true, use12Hour);
  } else {
    // IANA timezone - use Intl API to get time components in that timezone
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
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
      
      // Milliseconds are the same regardless of timezone (fractional seconds don't change)
      const ms = date.getMilliseconds();
      const msStr = String(ms).padStart(4, '0');
      
      return `${hour}:${minute}:${second}.${msStr}${periodStr}`;
    } catch (e) {
      // Fallback to local time if timezone is invalid
      return formatTime(date, true, false, use12Hour);
    }
  }
}

export function getTimezoneLabel(timezone: string): string {
  if (timezone === 'local') return 'Local';
  if (timezone === 'utc') return 'UTC';
  
  // Try to get a friendly name for IANA timezones
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(now);
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value || timezone;
    return timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
  } catch (e) {
    return timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
  }
}

export function formatEpochToDateTime(epoch: number): string {
  const date = new Date(epoch * 1000);
  
  // Format: "Oct 12, 2025 17:06:03.0023 UTC"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(date.getUTCMilliseconds()).padStart(4, '0');
  
  return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds}.${milliseconds} UTC`;
}
