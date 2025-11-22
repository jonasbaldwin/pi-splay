export type TileSize = 's';

export interface TimeMark {
  time: string; // HH:MM:SS.nnnn
  epoch: number;
  timestamp: number; // Milliseconds since epoch (for calculating elapsed time)
}

export interface Tile {
  id: string;
  type: 'time' | 'epoch' | 'calendar' | 'date' | 'timezone-converter' | 'map' | 'format-helper';
  size: TileSize;
  data: TimeTileData | EpochTileData | CalendarTileData | DateTileData | TimezoneConverterTileData | MapTileData | FormatHelperTileData;
  gridPosition?: { x: number; y: number }; // Grid position for drag and drop
}

export interface TimeTileData {
  timezone: string; // Can be 'local', 'utc', or IANA timezone string
  marks: TimeMark[];
}

export interface EpochTileData {
  marks: TimeMark[];
  inputA?: string;
  inputB?: string;
}

export interface CalendarTileData {
  selectedDates: string[]; // ISO date strings (YYYY-MM-DD)
  dateColors?: number[]; // Color indices for each selected date
  currentMonth: number; // 0-11 (JavaScript month)
  currentYear: number;
}

export interface DateTileData {
  // Date module has no additional data - always shows today's date
}

export interface TimezoneConverterTileData {
  sourceTimezone: string; // Can be 'local', 'utc', or IANA timezone string
  targetTimezones: string[]; // Array of timezone strings
  date?: string; // Optional date in YYYY-MM-DD format
  time?: string; // Optional time in HH:MM:SS format
}

export interface MapTileData {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  zoom?: number;
}

export interface FormatHelperTileData {
  selectedLanguage?: string; // Language identifier (e.g., 'javascript', 'python')
}

