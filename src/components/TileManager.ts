import { Tile, TileSize, TimeTileData, EpochTileData, CalendarTileData, DateTileData, TimezoneConverterTileData, MapTileData, FormatHelperTileData, QuickNotesTileData, NumberConverterTileData, TimeMark } from '../types';
import { TimeModule } from './TimeModule';
import { EpochModule } from './EpochModule';
import { CalendarModule } from './CalendarModule';
import { DateModule } from './DateModule';
import { TimezoneConverterModule } from './TimezoneConverterModule';
import { MapModule } from './MapModule';
import { FormatHelperModule } from './FormatHelperModule';
import { QuickNotesModule } from './QuickNotesModule';
import { NumberConverterModule } from './NumberConverterModule';
import { getThemePreference, setThemePreference, applyTheme, ThemePreference } from '../utils/theme';

type ModuleInstance = TimeModule | EpochModule | CalendarModule | DateModule | TimezoneConverterModule | MapModule | FormatHelperModule | QuickNotesModule | NumberConverterModule | null;

export class TileManager {
  private container: HTMLElement;
  private tiles: Map<string, { tile: Tile; module: ModuleInstance }> = new Map();
  private draggedElement: HTMLElement | null = null;
  private draggedIndex: number = -1;
  private touchStartY: number = 0;
  private touchStartX: number = 0;
  private isTouchDragging: boolean = false;
  private touchStartModule: HTMLElement | null = null;
  private mouseStartY: number = 0;
  private mouseStartX: number = 0;
  private isMouseDragging: boolean = false;
  private justFinishedDrag: boolean = false;
  private onTilesChangeCallback: ((tiles: Tile[]) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.editModeBtn = document.getElementById('edit-mode-btn');
    this.editModeNote = document.getElementById('edit-mode-note');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.initializeDragAndDrop();
    this.initializeMouseDragAndDrop();
    this.initializeTouchDragAndDrop();
    this.initializeEditMode();
    this.initializeThemeToggle();
  }

  public setOnTilesChange(callback: (tiles: Tile[]) => void): void {
    this.onTilesChangeCallback = callback;
  }

  public loadTiles(tiles: Tile[]): void {
    // Clear existing tiles
    this.tiles.forEach((tileData) => {
      if (tileData.module) {
        tileData.module.destroy();
      }
    });
    this.tiles.clear();
    this.container.innerHTML = '';

    // Load new tiles
    tiles.forEach(tile => {
      this.addTile(tile, false); // Don't save to storage, we'll do it after all tiles are loaded
    });
  }
  
  private initializeEditMode(): void {
    if (this.editModeBtn) {
      this.editModeBtn.addEventListener('click', () => {
        this.toggleEditMode();
      });
    }
  }

  private initializeThemeToggle(): void {
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    this.updateThemeToggleIcon();
  }

  private toggleTheme(): void {
    const currentPreference = getThemePreference();
    let nextPreference: ThemePreference;
    
    // Cycle through: system -> light -> dark -> system
    if (currentPreference === 'system') {
      nextPreference = 'light';
    } else if (currentPreference === 'light') {
      nextPreference = 'dark';
    } else {
      nextPreference = 'system';
    }
    
    setThemePreference(nextPreference);
    this.updateThemeToggleIcon();
  }

  private updateThemeToggleIcon(): void {
    if (!this.themeToggleBtn) return;
    
    const preference = getThemePreference();
    if (preference === 'light') {
      this.themeToggleBtn.textContent = '☀️';
      this.themeToggleBtn.setAttribute('aria-label', 'Theme: Light (click to switch to Dark)');
    } else if (preference === 'dark') {
      this.themeToggleBtn.textContent = '🌙';
      this.themeToggleBtn.setAttribute('aria-label', 'Theme: Dark (click to switch to System)');
    } else {
      this.themeToggleBtn.textContent = '🌓';
      this.themeToggleBtn.setAttribute('aria-label', 'Theme: System (click to switch to Light)');
    }
  }
  
  private toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    
    if (this.isEditMode) {
      // Enter edit mode
      if (this.editModeBtn) {
        this.editModeBtn.textContent = '✕';
        this.editModeBtn.setAttribute('aria-label', 'Exit edit mode');
      }
      // Show theme toggle button
      if (this.themeToggleBtn) {
        this.themeToggleBtn.style.display = 'flex';
      }
      // Show edit mode note
      if (this.editModeNote) {
        this.editModeNote.style.display = 'block';
      }
      // Enable dragging on all tiles
      this.container.querySelectorAll('[data-tile-id]').forEach(tile => {
        (tile as HTMLElement).setAttribute('draggable', 'true');
        tile.classList.add('edit-mode');
        // Get or create remove button
        let removeBtn = tile.querySelector('.tile-remove-btn') as HTMLElement;
        if (!removeBtn) {
          // Create button if it doesn't exist (for tiles loaded from storage)
          const tileId = tile.getAttribute('data-tile-id');
          if (tileId) {
            removeBtn = document.createElement('button');
            removeBtn.className = 'tile-remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.setAttribute('aria-label', 'Remove tile');
            removeBtn.style.zIndex = '9999';
            removeBtn.style.position = 'absolute';
            removeBtn.style.top = '1.75rem';
            removeBtn.style.left = '1.75rem';
            
            const handleRemove = (e: Event) => {
              e.stopPropagation();
              e.preventDefault();
              this.removeTile(tileId);
            };
            
            removeBtn.addEventListener('click', handleRemove);
            removeBtn.addEventListener('touchend', handleRemove);
            tile.appendChild(removeBtn);
          }
        }
        if (removeBtn) {
          removeBtn.style.display = 'flex';
          removeBtn.style.visibility = 'visible';
          removeBtn.style.opacity = '1';
          removeBtn.style.zIndex = '9999';
          removeBtn.style.position = 'absolute';
          removeBtn.style.top = '1.75rem';
          removeBtn.style.left = '1.75rem';
          // Move to end of tile element to ensure it's on top
          tile.appendChild(removeBtn);
        }
      });
      // Show all drop zones when entering edit mode
      this.showAllDropZones();
    } else {
      // Exit edit mode
      if (this.editModeBtn) {
        this.editModeBtn.textContent = '⚙️';
        this.editModeBtn.setAttribute('aria-label', 'Edit mode');
      }
      // Hide theme toggle button
      if (this.themeToggleBtn) {
        this.themeToggleBtn.style.display = 'none';
      }
      // Hide edit mode note
      if (this.editModeNote) {
        this.editModeNote.style.display = 'none';
      }
      // Disable dragging on all tiles
      this.container.querySelectorAll('[data-tile-id]').forEach(tile => {
        (tile as HTMLElement).setAttribute('draggable', 'false');
        tile.classList.remove('edit-mode');
        // Hide remove button
        const removeBtn = tile.querySelector('.tile-remove-btn') as HTMLElement;
        if (removeBtn) {
          removeBtn.style.display = 'none';
          removeBtn.style.visibility = 'hidden';
          removeBtn.style.opacity = '0';
        }
      });
      // Hide drop zones and drop indicator
      this.hideAllDropZones();
      this.hideDropIndicator();
      
      // Reset any drag state
      this.draggedElement = null;
      this.isMouseDragging = false;
      this.justFinishedDrag = false;
    }
    
    // Dispatch event for modules to listen to
    window.dispatchEvent(new CustomEvent('editModeChanged'));
    
    // Force a layout recalculation which helps with map rendering
    if (this.isEditMode) {
      // Trigger a reflow to help map tiles render
      this.container.offsetHeight; // Force reflow
    }
  }
  
  public isInEditMode(): boolean {
    return this.isEditMode;
  }
  
  public addTile(tile: Tile, saveToStorage: boolean = true): void {
    // Migrate old tile sizes to 's' (double-wide feature was removed)
    // Handle legacy tiles from localStorage that might have 'm' or 'l'
    const tileSize = tile.size as string;
    if (tileSize === 'm' || tileSize === 'l') {
      tile.size = 's';
    }
    
    // If this is a new time or epoch tile, copy marks from existing time/epoch tiles
    if (tile.type === 'time' || tile.type === 'epoch') {
      const existingMarks = this.getExistingMarks();
      if (existingMarks.length > 0) {
        if (tile.type === 'time') {
          (tile.data as TimeTileData).marks = [...existingMarks];
        } else if (tile.type === 'epoch') {
          (tile.data as EpochTileData).marks = [...existingMarks];
        }
      }
    }
    
    // Use pending grid position if available
    if (this.pendingGridPosition && !tile.gridPosition) {
      tile.gridPosition = { ...this.pendingGridPosition };
      this.clearPendingGridPosition();
    }
    
    const tileElement = this.createTileElement(tile);
    const module = this.createModule(tile, tileElement);
    
    // Set draggable based on edit mode
    tileElement.setAttribute('draggable', this.isEditMode ? 'true' : 'false');
    if (this.isEditMode) {
      tileElement.classList.add('edit-mode');
      // Explicitly show remove button if in edit mode
      const removeBtn = tileElement.querySelector('.tile-remove-btn') as HTMLElement;
      if (removeBtn) {
        removeBtn.style.display = 'flex';
        removeBtn.style.visibility = 'visible';
        removeBtn.style.opacity = '1';
        removeBtn.style.zIndex = '9999';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '1.75rem';
        removeBtn.style.left = '1.75rem';
        // Move button to end of element so it's on top of module content
        tileElement.appendChild(removeBtn);
      }
    }
    
    // Set grid position - always use span 1 (double-wide feature was removed)
    if (tile.gridPosition) {
      tileElement.style.gridColumn = `${tile.gridPosition.x + 1} / span 1`;
      tileElement.style.gridRow = `${tile.gridPosition.y + 1}`;
    } else {
      // Find next available position and set it
      const nextPos = this.getNextAvailablePosition();
      tile.gridPosition = nextPos;
      tileElement.style.gridColumn = `${nextPos.x + 1} / span 1`;
      tileElement.style.gridRow = `${nextPos.y + 1}`;
    }
    
    this.tiles.set(tile.id, { tile, module });
    this.container.appendChild(tileElement);
    
    if (saveToStorage) {
      this.saveToStorage();
    }
    
    // Refresh drop zones if in edit mode
    if (this.isEditMode) {
      this.hideAllDropZones();
      this.showAllDropZones();
    }
  }
  
  private getExistingMarks(): TimeMark[] {
    // Get marks from the first existing time or epoch tile
    for (const tileData of this.tiles.values()) {
      if (tileData.tile.type === 'time') {
        const timeData = tileData.tile.data as TimeTileData;
        if (timeData.marks && timeData.marks.length > 0) {
          return timeData.marks;
        }
      } else if (tileData.tile.type === 'epoch') {
        const epochData = tileData.tile.data as EpochTileData;
        if (epochData.marks && epochData.marks.length > 0) {
          return epochData.marks;
        }
      }
    }
    return [];
  }

  public removeTile(id: string): void {
    const tileData = this.tiles.get(id);
    if (tileData) {
      if (tileData.module) {
        tileData.module.destroy();
      }
      const element = this.container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
      if (element) {
        element.remove();
      }
      this.tiles.delete(id);
      this.saveToStorage();
      if (this.onTilesChangeCallback) {
        this.onTilesChangeCallback(this.getAllTiles());
      }
    }
  }

  public updateTile(id: string, updates: Partial<Tile>): void {
    const tileData = this.tiles.get(id);
    if (!tileData) return;

    const updatedTile = { ...tileData.tile, ...updates };
    tileData.tile = updatedTile;

    const element = this.container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
    if (element) {
      // Update size class (all tiles are now 's')
      element.className = element.className.replace(/tile-[sml]/g, '');
      element.classList.add('tile-s');
      
      // Update module if data changed
      if (updates.data && tileData.module) {
        if (updatedTile.type === 'time') {
          (tileData.module as TimeModule).updateData(updates.data as TimeTileData);
        } else if (updatedTile.type === 'epoch') {
          (tileData.module as EpochModule).updateData(updates.data as EpochTileData);
        } else if (updatedTile.type === 'calendar') {
          (tileData.module as CalendarModule).updateData(updates.data as CalendarTileData);
        } else if (updatedTile.type === 'date') {
          (tileData.module as DateModule).updateData(updates.data as DateTileData);
        } else if (updatedTile.type === 'timezone-converter') {
          (tileData.module as TimezoneConverterModule).updateData(updates.data as TimezoneConverterTileData);
        } else if (updatedTile.type === 'map') {
          (tileData.module as MapModule).updateData(updates.data as MapTileData);
        } else if (updatedTile.type === 'format-helper') {
          (tileData.module as FormatHelperModule).updateData(updates.data as FormatHelperTileData);
        } else if (updatedTile.type === 'quick-notes') {
          (tileData.module as QuickNotesModule).updateData(updates.data as QuickNotesTileData);
        } else if (updatedTile.type === 'number-converter') {
          (tileData.module as NumberConverterModule).updateData(updates.data as NumberConverterTileData);
        }
      }
      this.saveToStorage();
      if (this.onTilesChangeCallback) {
        this.onTilesChangeCallback(this.getAllTiles());
      }
    }
  }

  private createTileElement(tile: Tile): HTMLElement {
    const element = document.createElement('div');
    // All tiles are now 's' size (double-wide feature was removed)
    element.className = 'tile tile-s';
    element.setAttribute('data-tile-id', tile.id);
    // Set draggable based on current edit mode state
    element.setAttribute('draggable', this.isEditMode ? 'true' : 'false');
    element.setAttribute('data-tile-type', tile.type);
    
    // Add remove button - append it last so it's on top
    const removeBtn = document.createElement('button');
    removeBtn.className = 'tile-remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', 'Remove tile');
    // Always create button, visibility controlled by edit mode
    if (!this.isEditMode) {
      removeBtn.style.display = 'none';
    } else {
      removeBtn.style.display = 'flex';
      removeBtn.style.visibility = 'visible';
      removeBtn.style.opacity = '1';
    }
    // Set explicit z-index to ensure it's above everything
    removeBtn.style.zIndex = '9999';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '1.75rem';
    removeBtn.style.left = '1.75rem';
    
    // Handle both click and touch events
    const handleRemove = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      this.removeTile(tile.id);
    };
    
    removeBtn.addEventListener('click', handleRemove);
    removeBtn.addEventListener('touchend', handleRemove);
    
    // Append button last so it's on top of module content
    // We'll append it after module is created, but for now append it
    element.appendChild(removeBtn);
    
    return element;
  }

  private createModule(tile: Tile, element: HTMLElement): ModuleInstance {
    if (tile.type === 'time') {
      return new TimeModule(element, tile.data as TimeTileData);
    } else if (tile.type === 'epoch') {
      return new EpochModule(element, tile.data as EpochTileData);
    } else if (tile.type === 'calendar') {
      return new CalendarModule(element, tile.data as CalendarTileData);
    } else if (tile.type === 'date') {
      return new DateModule(element, tile.data as DateTileData);
    } else if (tile.type === 'timezone-converter') {
      return new TimezoneConverterModule(element, tile.data as TimezoneConverterTileData);
    } else if (tile.type === 'map') {
      return new MapModule(element, tile.data as MapTileData);
    } else if (tile.type === 'format-helper') {
      return new FormatHelperModule(element, tile.data as FormatHelperTileData);
    } else if (tile.type === 'quick-notes') {
      return new QuickNotesModule(element, tile.data as QuickNotesTileData);
    } else if (tile.type === 'number-converter') {
      return new NumberConverterModule(element, tile.data as NumberConverterTileData);
    }
    return null;
  }

  private initializeDragAndDrop(): void {
    // Note: dragstart and dragend are attached to individual tile elements in createTileElement
    // Only dragover, drop, and dragleave need to be on the container
    this.container.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.container.addEventListener('drop', (e) => this.handleDrop(e));
    this.container.addEventListener('dragleave', (e) => this.handleDragLeave(e));
  }

  private handleDragStart(e: DragEvent): void {
    // Only allow dragging in edit mode
    if (!this.isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // currentTarget is the tile element that has the drag listener
    const tile = e.currentTarget as HTMLElement;
    if (!tile || !tile.hasAttribute('data-tile-id')) {
      e.preventDefault();
      return;
    }
    
    // Check if the actual click target is an interactive element
    const target = e.target as HTMLElement;
    const interactiveElements = ['button', 'select', 'input', 'a', 'option'];
    if (interactiveElements.includes(target.tagName.toLowerCase())) {
      e.preventDefault();
      return;
    }
    
    // Don't start drag if clicking on calendar days
    if (target.closest('.calendar-day')) {
      e.preventDefault();
      return;
    }
    
    // Don't start drag if clicking on labels
    if (target.closest('label')) {
      e.preventDefault();
      return;
    }

    // IMPORTANT: Don't prevent default - let the drag happen!
    this.draggedElement = tile;
    this.draggedIndex = Array.from(this.container.children).indexOf(tile);
    tile.classList.add('dragging');
    
    // Show all drop zones
    this.showAllDropZones();
    
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', tile.outerHTML);
    }
  }

  private handleDragEnd(e: DragEvent): void {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    
    this.draggedElement = null;
    this.draggedIndex = -1;
    this.lastHighlightedGridPos = null;
    
    this.hideDropIndicator();
    this.hideAllDropZones();
    
    // Remove dragover class from all tiles
    this.container.querySelectorAll('.tile').forEach(tile => {
      tile.classList.remove('dragover');
    });
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    // Show drop indicator at grid position and highlight hovered zone
    const gridPos = this.getGridPositionFromEvent(e);
    if (gridPos) {
      this.showDropIndicator(gridPos);
      this.highlightHoveredDropZone(gridPos);
    }
  }
  
  private getGridPositionFromEvent(e: DragEvent | TouchEvent | MouseEvent): { col: number; row: number } | null {
    const containerRect = this.container.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : (e.touches?.[0]?.clientX || e.changedTouches?.[0]?.clientX);
    const clientY = 'clientY' in e ? e.clientY : (e.touches?.[0]?.clientY || e.changedTouches?.[0]?.clientY);
    
    if (clientX === undefined || clientY === undefined) return null;
    
    // Check if point is within container horizontally, but allow vertical extension below
    if (clientX < containerRect.left || clientX > containerRect.right ||
        clientY < containerRect.top) {
      return null;
    }
    // Allow drops below the container (within reasonable bounds - up to 5 rows below)
    const maxRowsBelow = 5;
    const gridGap = 24;
    const tileHeight = 200;
    const maxY = containerRect.bottom + (maxRowsBelow * (tileHeight + gridGap));
    if (clientY > maxY) {
      return null;
    }
    
    // Try to find the drop zone element that contains the cursor position (most accurate)
    // Check all drop zones to find which one contains the cursor
    // This is more reliable than elementFromPoint which might hit the dragged element
    for (const dropZone of this.dropZones) {
      const zoneRect = dropZone.getBoundingClientRect();
      if (clientX >= zoneRect.left && clientX <= zoneRect.right &&
          clientY >= zoneRect.top && clientY <= zoneRect.bottom) {
        const dropPos = dropZone.getAttribute('data-drop-pos');
        if (dropPos) {
          const [dropCol, dropRow] = dropPos.split(',').map(Number);
          return { col: dropCol, row: dropRow };
        }
      }
    }
    
    // Also try elementFromPoint as a fallback (might work if dragged element is transparent)
    const elementAtPoint = document.elementFromPoint(clientX, clientY);
    if (elementAtPoint) {
      const dropZone = elementAtPoint.closest('.drop-zone') as HTMLElement;
      if (dropZone) {
        const dropPos = dropZone.getAttribute('data-drop-pos');
        if (dropPos) {
          const [dropCol, dropRow] = dropPos.split(',').map(Number);
          return { col: dropCol, row: dropRow };
        }
      }
    }
    
    // Fallback: calculate grid position relative to container
    // Account for scroll by using getBoundingClientRect (already accounts for scroll)
    const tileWidth = 500;
    
    // Calculate position relative to container's top-left corner (accounting for padding)
    // The container has px-4 (16px) padding
    const x = clientX - containerRect.left - 16;
    const y = clientY - containerRect.top;
    
    // Calculate column: account for grid gap between columns
    const col = Math.max(0, Math.floor(x / (tileWidth + gridGap)));
    
    // Calculate row: use a simple formula based on grid structure
    // Each row is tileHeight + gridGap tall
    const row = Math.max(0, Math.floor(y / (tileHeight + gridGap)));
    
    return { col, row };
  }
  
  private dropIndicator: HTMLElement | null = null;
  private dropZones: HTMLElement[] = [];
  private editModeBtn: HTMLElement | null = null;
  private editModeNote: HTMLElement | null = null;
  private themeToggleBtn: HTMLElement | null = null;
  private isEditMode: boolean = false;
  private lastHighlightedGridPos: { col: number; row: number } | null = null;
  
  private showDropIndicator(gridPos: { col: number; row: number }): void {
    // Remove existing indicator
    if (this.dropIndicator) {
      this.dropIndicator.remove();
    }
    
    // Create drop indicator
    this.dropIndicator = document.createElement('div');
    this.dropIndicator.className = 'drop-indicator';
    this.dropIndicator.style.gridColumn = `${gridPos.col + 1} / span 1`;
    this.dropIndicator.style.gridRow = `${gridPos.row + 1} / span 1`;
    this.container.appendChild(this.dropIndicator);
  }
  
  private hideDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }
  }
  
  private showAllDropZones(): void {
    // Calculate occupied positions
    // Note: All tiles now occupy only 1 column (double-wide feature was removed)
    const occupied = new Set<string>();
    this.tiles.forEach((tileData, id) => {
      const tile = tileData.tile;
      const gridPos = tile.gridPosition || this.getCurrentGridPosition(id);
      if (gridPos) {
        // Always use span 1 since double-wide feature was removed
        const span = 1;
        for (let c = gridPos.x; c < gridPos.x + span; c++) {
          occupied.add(`${c},${gridPos.y}`);
        }
      }
    });
    
    // Calculate max rows and cols based on container and existing tiles
    const gridGap = 24;
    const tileWidth = 500;
    const tileHeight = 200;
    const containerRect = this.container.getBoundingClientRect();
    const maxCols = Math.ceil((containerRect.width - 32) / (tileWidth + gridGap));
    const maxRows = Math.max(
      Math.ceil((containerRect.height) / (tileHeight + gridGap)),
      ...Array.from(this.tiles.values()).map(t => {
        const pos = t.tile.gridPosition || this.getCurrentGridPosition(t.tile.id);
        return pos ? pos.y + 1 : 0;
      })
    ) + 5; // Add 5 extra rows below
    
    // Create drop zones for all unoccupied positions
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < maxCols; col++) {
        const key = `${col},${row}`;
        if (!occupied.has(key)) {
          const zone = document.createElement('div');
          zone.className = 'drop-zone';
          zone.style.gridColumn = `${col + 1} / span 1`;
          zone.style.gridRow = `${row + 1} / span 1`;
          zone.setAttribute('data-drop-pos', key);
          // Make drop zones clickable in edit mode
          zone.style.pointerEvents = 'auto';
          zone.style.cursor = 'pointer';
          // Prevent clicks on drop zones from triggering tile moves during drag
          zone.addEventListener('mousedown', (e) => {
            // Only prevent if we're currently dragging
            if (this.draggedElement) {
              e.stopPropagation();
            }
          });
          // Handle click on drop zone to show tile modal
          zone.addEventListener('click', (e) => {
            // Only handle click if not dragging
            if (!this.draggedElement && !this.isMouseDragging && !this.isTouchDragging) {
              e.stopPropagation();
              const dropPos = zone.getAttribute('data-drop-pos');
              if (dropPos) {
                const [col, row] = dropPos.split(',').map(Number);
                this.showAddTileModalAtPosition({ x: col, y: row });
              }
            }
          });
          this.container.appendChild(zone);
          this.dropZones.push(zone);
        }
      }
    }
  }
  
  private pendingGridPosition: { x: number; y: number } | null = null;
  
  private showAddTileModalAtPosition(gridPosition: { x: number; y: number }): void {
    this.pendingGridPosition = gridPosition;
    // Dispatch event to show modal
    window.dispatchEvent(new CustomEvent('showAddTileModal', { detail: { gridPosition } }));
  }
  
  public getPendingGridPosition(): { x: number; y: number } | null {
    return this.pendingGridPosition;
  }
  
  public clearPendingGridPosition(): void {
    this.pendingGridPosition = null;
  }
  
  private hideAllDropZones(): void {
    // Clear any hover state before removing
    this.dropZones.forEach(zone => {
      zone.classList.remove('drop-zone-hovered');
      zone.remove();
    });
    this.dropZones = [];
  }
  
  private highlightHoveredDropZone(gridPos: { col: number; row: number }): void {
    // Store the highlighted position for use on drop
    this.lastHighlightedGridPos = gridPos;
    
    // Reset all zones to grey
    this.dropZones.forEach(zone => {
      zone.classList.remove('drop-zone-hovered');
    });
    
    // Highlight the hovered zone
    const hoveredKey = `${gridPos.col},${gridPos.row}`;
    const hoveredZone = this.dropZones.find(zone => 
      zone.getAttribute('data-drop-pos') === hoveredKey
    );
    if (hoveredZone) {
      hoveredZone.classList.add('drop-zone-hovered');
    }
  }
  
  private getCurrentGridPosition(tileId: string): { x: number; y: number } | null {
    const element = this.container.querySelector(`[data-tile-id="${tileId}"]`) as HTMLElement;
    if (!element) return null;
    
    const gridColumn = element.style.gridColumn;
    const gridRow = element.style.gridRow;
    
    if (gridColumn && gridRow) {
      // Parse "1 / span 1" format
      const colMatch = gridColumn.match(/(\d+)/);
      const rowMatch = gridRow.match(/(\d+)/);
      if (colMatch && rowMatch) {
        return { x: parseInt(colMatch[1], 10) - 1, y: parseInt(rowMatch[1], 10) - 1 };
      }
    }
    
    return null;
  }

  private getNextAvailablePosition(): { x: number; y: number } {
    // Calculate occupied positions
    const occupied = new Set<string>();
    this.tiles.forEach((tileData, id) => {
      const tile = tileData.tile;
      const gridPos = tile.gridPosition || this.getCurrentGridPosition(id);
      if (gridPos) {
        occupied.add(`${gridPos.x},${gridPos.y}`);
      }
    });
    
    // Calculate max cols based on container width
    const gridGap = 24;
    const tileWidth = 500;
    const containerRect = this.container.getBoundingClientRect();
    const maxCols = Math.max(3, Math.ceil((containerRect.width - 32) / (tileWidth + gridGap)));
    
    // Find first available position, scanning row by row
    for (let row = 0; row < 100; row++) { // Limit to 100 rows
      for (let col = 0; col < maxCols; col++) {
        const key = `${col},${row}`;
        if (!occupied.has(key)) {
          return { x: col, y: row };
        }
      }
    }
    
    // Fallback: return position at end
    return { x: 0, y: 100 };
  }

  private handleDragLeave(e: DragEvent): void {
    // Only hide indicator if leaving the container entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!this.container.contains(relatedTarget)) {
      this.hideDropIndicator();
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    this.hideDropIndicator();
    this.hideAllDropZones();
    
    if (!this.draggedElement) return;
    
    // Use the last highlighted position if available (most accurate)
    // Otherwise fall back to calculating from event
    const gridPos = this.lastHighlightedGridPos || this.getGridPositionFromEvent(e);
    if (gridPos) {
      // Position tile at grid coordinates
      const tileId = this.draggedElement.getAttribute('data-tile-id');
      if (tileId) {
        const tileData = this.tiles.get(tileId);
        if (tileData) {
          // Set grid position (all tiles use span 1)
          this.draggedElement.style.gridColumn = `${gridPos.col + 1} / span 1`;
          this.draggedElement.style.gridRow = `${gridPos.row + 1}`;
          
          // Update tile data
          tileData.tile.gridPosition = { x: gridPos.col, y: gridPos.row };
          this.saveToStorage();
          if (this.onTilesChangeCallback) {
            this.onTilesChangeCallback(this.getAllTiles());
          }
        }
      }
    }
    
    this.lastHighlightedGridPos = null;
    
    // Remove dragover from all tiles
    this.container.querySelectorAll('.tile').forEach(tile => {
      tile.classList.remove('dragover');
    });
  }
  
  private getTileSpan(size: string): number {
    // All tiles now use span 1 (double-wide feature was removed)
    return 1;
  }

  public getAllTiles(): Tile[] {
    // Sync grid positions from DOM before returning
    // This ensures tiles without explicit positions (auto-placed by browser) are saved correctly
    // DOM is the source of truth, especially after drag operations
    return Array.from(this.tiles.values()).map(tileData => {
      // Try to sync position from DOM (most accurate, especially after drag)
      const currentPos = this.getCurrentGridPosition(tileData.tile.id);
      if (currentPos) {
        tileData.tile.gridPosition = currentPos;
      }
      // If we can't read from DOM but tile has a position, keep it
      // (This handles cases where DOM might not be ready yet, but position was set)
      return tileData.tile;
    });
  }

  public saveToStorage(): void {
    const tiles = this.getAllTiles();
    if (this.onTilesChangeCallback) {
      this.onTilesChangeCallback(tiles);
    }
  }

  private initializeMouseDragAndDrop(): void {
    this.container.addEventListener('mousedown', (e) => this.handleMouseStart(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseEnd(e));
  }

  private initializeTouchDragAndDrop(): void {
    this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
  }

  private handleMouseStart(e: MouseEvent): void {
    // Only allow mouse dragging in edit mode
    if (!this.isEditMode) {
      return;
    }
    
    // If we just finished a drag, ignore this mousedown to prevent accidental moves
    if (this.justFinishedDrag) {
      this.justFinishedDrag = false;
      return;
    }
    
    const target = e.target as HTMLElement;
    const tile = target.closest('[data-tile-id]') as HTMLElement;
    
    if (!tile) return;
    
    // Don't start drag if clicking directly on interactive elements
    const interactiveElements = ['button', 'select', 'input', 'a'];
    if (interactiveElements.includes(target.tagName.toLowerCase())) {
      return;
    }
    
    // Don't start drag if clicking on calendar days
    if (target.closest('.calendar-day')) {
      return;
    }
    
    // Don't start drag if clicking on select options or their labels
    if (target.closest('option') || target.closest('label')) {
      return;
    }
    
    // Don't start drag if clicking on map container (but allow drag from map itself)
    if (target.closest('.map-container') || target.closest('.leaflet-container')) {
      // Allow drag from map in edit mode
      // The map interactions are disabled in edit mode, so this should work
    }
    
    this.mouseStartY = e.clientY;
    this.mouseStartX = e.clientX;
    this.draggedElement = tile;
    this.isMouseDragging = false;
  }

  private handleMouseMove(e: MouseEvent): void {
    // Stop immediately if not in edit mode or no element being dragged
    if (!this.isEditMode || !this.draggedElement) {
      return;
    }
    
    const deltaY = Math.abs(e.clientY - this.mouseStartY);
    const deltaX = Math.abs(e.clientX - this.mouseStartX);
    
    // Start dragging if moved more than 10px in any direction
    if ((deltaY > 10 || deltaX > 10) && !this.isMouseDragging) {
      this.isMouseDragging = true;
      this.draggedElement.classList.add('dragging');
      // Show drop zones during drag for accurate positioning
      this.showAllDropZones();
      e.preventDefault();
    }
    
    // Only continue if we're actually dragging
    if (this.isMouseDragging && this.draggedElement) {
      e.preventDefault();
      
      // Show drop indicator at grid position and highlight hovered zone
      const gridPos = this.getGridPositionFromEvent(e);
      if (gridPos) {
        this.showDropIndicator(gridPos);
        this.highlightHoveredDropZone(gridPos);
      }
    }
  }

  private handleMouseEnd(e: MouseEvent): void {
    // Immediately stop all dragging
    const wasDragging = this.isMouseDragging;
    const draggedTile = this.draggedElement;
    const tileId = draggedTile?.getAttribute('data-tile-id');
    
    // Reset drag state immediately - clear draggedElement first to prevent handleMouseMove from processing
    this.draggedElement = null;
    this.isMouseDragging = false;
    
    if (draggedTile) {
      draggedTile.classList.remove('dragging');
    }
    
    if (wasDragging && draggedTile) {
      e.preventDefault();
      e.stopPropagation();
      
      if (tileId) {
        // Use the last highlighted position if available (most accurate)
        // Otherwise fall back to calculating from event
        const gridPos = this.lastHighlightedGridPos || this.getGridPositionFromEvent(e);
        
        if (gridPos) {
          const tileData = this.tiles.get(tileId);
          if (tileData) {
            const currentPos = tileData.tile.gridPosition || this.getCurrentGridPosition(tileId);
            // Only move if position actually changed
            if (!currentPos || currentPos.x !== gridPos.col || currentPos.y !== gridPos.row) {
              // Set grid position (all tiles use span 1)
              draggedTile.style.gridColumn = `${gridPos.col + 1} / span 1`;
              draggedTile.style.gridRow = `${gridPos.row + 1}`;
              
              // Update tile data
              tileData.tile.gridPosition = { x: gridPos.col, y: gridPos.row };
              this.saveToStorage();
              if (this.onTilesChangeCallback) {
                this.onTilesChangeCallback(this.getAllTiles());
              }
            }
          }
        }
      }
      
      // Clean up immediately
      this.container.querySelectorAll('.tile').forEach(t => {
        t.classList.remove('dragover');
      });
      
      // Always hide drop indicator
      this.hideDropIndicator();
      this.lastHighlightedGridPos = null;
      
      // Re-show drop zones since we're still in edit mode
      if (this.isEditMode) {
        this.showAllDropZones();
      }
      
      // Prevent click events if we were dragging
      this.justFinishedDrag = true;
      setTimeout(() => {
        this.justFinishedDrag = false;
      }, 300);
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    // Only allow touch dragging in edit mode
    if (!this.isEditMode) {
      return;
    }
    
    const target = e.target as HTMLElement;
    const tile = target.closest('[data-tile-id]') as HTMLElement;
    
    if (!tile) return;
    
    // Don't start drag if clicking directly on interactive elements
    const interactiveElements = ['button', 'select', 'input', 'a'];
    if (interactiveElements.includes(target.tagName.toLowerCase())) {
      return;
    }
    
    // Don't start drag if clicking on calendar days
    if (target.closest('.calendar-day')) {
      return;
    }
    
    // Don't start drag if clicking on select options or their labels
    if (target.closest('option') || target.closest('label')) {
      return;
    }
    
    // Map container clicks are allowed for dragging in edit mode
    // (map interactions are disabled in edit mode)
    
    const touch = e.touches[0];
    this.touchStartY = touch.clientY;
    this.touchStartX = touch.clientX;
    this.draggedElement = tile;
    this.isTouchDragging = false;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.draggedElement) return;
    
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    
    // Start dragging if moved more than 10px in any direction
    if ((deltaY > 10 || deltaX > 10) && !this.isTouchDragging) {
      this.isTouchDragging = true;
      this.draggedElement.classList.add('dragging');
      this.showAllDropZones();
      e.preventDefault();
    }
    
    if (this.isTouchDragging) {
      e.preventDefault();
      
      // Show drop indicator at grid position and highlight hovered zone
      const gridPos = this.getGridPositionFromEvent(e);
      if (gridPos) {
        this.showDropIndicator(gridPos);
        this.highlightHoveredDropZone(gridPos);
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.draggedElement) return;
    
    if (this.isTouchDragging) {
      e.preventDefault();
      
      const touch = e.changedTouches[0];
      // Use the last highlighted position if available (most accurate)
      // Otherwise fall back to calculating from event
      const gridPos = this.lastHighlightedGridPos || this.getGridPositionFromEvent(e);
      
      if (gridPos) {
        // Position tile at grid coordinates
        const tileId = this.draggedElement.getAttribute('data-tile-id');
        if (tileId) {
          const tileData = this.tiles.get(tileId);
          if (tileData) {
            // Set grid position (all tiles use span 1)
            this.draggedElement.style.gridColumn = `${gridPos.col + 1} / span 1`;
            this.draggedElement.style.gridRow = `${gridPos.row + 1}`;
            
            // Update tile data
            tileData.tile.gridPosition = { x: gridPos.col, y: gridPos.row };
            this.saveToStorage();
            if (this.onTilesChangeCallback) {
              this.onTilesChangeCallback(this.getAllTiles());
            }
          }
        }
      }
      
      // Clean up
      this.container.querySelectorAll('.tile').forEach(t => {
        t.classList.remove('dragover');
      });
      
      this.hideDropIndicator();
      this.hideAllDropZones();
      this.lastHighlightedGridPos = null;
    }
    
    this.draggedElement.classList.remove('dragging');
    this.draggedElement = null;
    this.isTouchDragging = false;
    this.touchStartModule = null;
  }
}

