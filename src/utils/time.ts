export function formatTime(date: Date, includeMilliseconds: boolean = false, useUTC: boolean = false): string {
  const hours = useUTC ? date.getUTCHours() : date.getHours();
  const minutes = useUTC ? date.getUTCMinutes() : date.getMinutes();
  const seconds = useUTC ? date.getUTCSeconds() : date.getSeconds();
  const ms = useUTC ? date.getUTCMilliseconds() : date.getMilliseconds();
  
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  
  if (includeMilliseconds) {
    const msStr = String(ms).padStart(4, '0');
    return `${hoursStr}:${minutesStr}:${secondsStr}.${msStr}`;
  }
  
  return `${hoursStr}:${minutesStr}:${secondsStr}`;
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

/**
 * Formats a UTC timestamp (milliseconds) as a time string for a given timezone.
 * This is used to convert stored UTC timestamps to the appropriate display timezone.
 */
export function formatTimestampForTimezone(timestamp: number, timezone: string): string {
  const date = new Date(timestamp);
  
  if (timezone === 'local') {
    // Use local time
    return formatTime(date, true, false);
  } else if (timezone === 'utc') {
    // Use UTC time
    return formatTime(date, true, true);
  } else {
    // IANA timezone - use Intl API to get time components in that timezone
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const second = parts.find(p => p.type === 'second')?.value || '00';
      
      // Milliseconds are the same regardless of timezone (fractional seconds don't change)
      const ms = date.getMilliseconds();
      const msStr = String(ms).padStart(4, '0');
      
      return `${hour}:${minute}:${second}.${msStr}`;
    } catch (e) {
      // Fallback to local time if timezone is invalid
      return formatTime(date, true, false);
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
