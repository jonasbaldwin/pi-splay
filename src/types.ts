export type TileSize = 's';

export interface TimeMark {
  time: string; // HH:MM:SS.nnnn
  epoch: number;
  timestamp: number; // Milliseconds since epoch (for calculating elapsed time)
}

export interface Tile {
  id: string;
  type: 'time' | 'epoch' | 'calendar' | 'date' | 'timezone-converter' | 'map' | 'format-helper' | 'quick-notes' | 'number-converter' | 'uuid' | 'nanoid' | 'test-logger';
  size: TileSize;
  data: TimeTileData | EpochTileData | CalendarTileData | DateTileData | TimezoneConverterTileData | MapTileData | FormatHelperTileData | QuickNotesTileData | NumberConverterTileData | UUIDTileData | NanoIdTileData | TestLoggerTileData;
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

export interface QuickNote {
  id: string;
  content: string;
  createdAt: number; // Timestamp in milliseconds
}

export interface QuickNotesTileData {
  notes: QuickNote[];
}

export interface NumberConverterTileData {
  value?: number; // Stored decimal value
}

export interface UUIDEntry {
  id: string; // The UUID value itself
  version: '1' | '3' | '4' | '5';
  used: boolean; // Whether it has been copied
  lastUsedAt?: number; // Timestamp when last copied (milliseconds)
  pinned: boolean; // Whether it's pinned
  createdAt: number; // Timestamp when created (milliseconds)
  notes?: string; // Notes for this specific UUID
}

export interface UUIDTileData {
  version: '1' | '3' | '4' | '5'; // Current selected version
  uuids: UUIDEntry[]; // List of UUIDs
}

export interface NanoIdEntry {
  id: string; // The NanoId value itself
  used: boolean; // Whether it has been copied
  lastUsedAt?: number; // Timestamp when last copied (milliseconds)
  pinned: boolean; // Whether it's pinned
  createdAt: number; // Timestamp when created (milliseconds)
  notes?: string; // Notes for this specific NanoId
}

export interface NanoIdTileData {
  alphabet: string; // Custom alphabet (default: standard nanoid alphabet)
  length: number; // Length of generated IDs (default: 21)
  nanoIds: NanoIdEntry[]; // List of NanoIds
}

export interface TestLogEntry {
  id: string;
  sequence: string;
  notes: string;
  timestamp: number;
  starred?: boolean;
}

export interface TestLoggerTileData {
  description: string;
  primaryType: 'alphabet' | 'greek' | 'numbers';
  secondaryType: 'alphabet' | 'greek' | 'numbers' | 'none';
  tertiaryType: 'alphabet' | 'greek' | 'numbers' | 'none';
  quaternaryType: 'alphabet' | 'greek' | 'numbers' | 'none';
  primaryIndex: number;
  secondaryIndex: number;
  tertiaryIndex: number;
  quaternaryIndex: number;
  primaryDelimiter?: string;
  secondaryDelimiter?: string;
  tertiaryDelimiter?: string;
  quaternaryDelimiter?: string;
  logs: TestLogEntry[];
  previewNote?: string;
  keepNote?: boolean;
}

export interface Tab {
  id: string;
  name: string;
  tiles: Tile[];
}

