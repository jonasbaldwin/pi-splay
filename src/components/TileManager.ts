import { Tile, TileSize, TimeTileData, EpochTileData, CalendarTileData, DateTileData, TimezoneConverterTileData, TimeMark } from '../types';
import { TimeModule } from './TimeModule';
import { EpochModule } from './EpochModule';
import { CalendarModule } from './CalendarModule';
import { DateModule } from './DateModule';
import { TimezoneConverterModule } from './TimezoneConverterModule';

type ModuleInstance = TimeModule | EpochModule | CalendarModule | DateModule | TimezoneConverterModule | null;

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

  constructor(container: HTMLElement) {
    this.container = container;
    this.addTileBtn = document.getElementById('add-tile-btn');
    this.editModeBtn = document.getElementById('edit-mode-btn');
    this.initializeDragAndDrop();
    this.initializeMouseDragAndDrop();
    this.initializeTouchDragAndDrop();
    this.createTrashCan();
    this.initializeEditMode();
  }
  
  private initializeEditMode(): void {
    if (this.editModeBtn) {
      this.editModeBtn.addEventListener('click', () => {
        this.toggleEditMode();
      });
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
      // Enable dragging on all tiles
      this.container.querySelectorAll('[data-tile-id]').forEach(tile => {
        (tile as HTMLElement).setAttribute('draggable', 'true');
        tile.classList.add('edit-mode');
      });
      // Show all drop zones when entering edit mode
      this.showAllDropZones();
    } else {
      // Exit edit mode
      if (this.editModeBtn) {
        this.editModeBtn.textContent = '✏️';
        this.editModeBtn.setAttribute('aria-label', 'Edit mode');
      }
      // Disable dragging on all tiles
      this.container.querySelectorAll('[data-tile-id]').forEach(tile => {
        (tile as HTMLElement).setAttribute('draggable', 'false');
        tile.classList.remove('edit-mode');
      });
      // Hide drop zones, drop indicator, and trash can
      this.hideAllDropZones();
      this.hideDropIndicator();
      this.hideTrashCan();
      
      // Reset any drag state
      this.draggedElement = null;
      this.isMouseDragging = false;
      this.justFinishedDrag = false;
    }
  }
  
  public isInEditMode(): boolean {
    return this.isEditMode;
  }
  
  private createTrashCan(): void {
    this.trashCan = document.createElement('button');
    this.trashCan.className = 'trash-can-btn';
    this.trashCan.setAttribute('aria-label', 'Delete tile');
    this.trashCan.innerHTML = '🗑️';
    this.trashCan.style.display = 'none';
    document.body.appendChild(this.trashCan);
  }

  public addTile(tile: Tile): void {
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
    
    const tileElement = this.createTileElement(tile);
    const module = this.createModule(tile, tileElement);
    
    // Set draggable based on edit mode
    tileElement.setAttribute('draggable', this.isEditMode ? 'true' : 'false');
    if (this.isEditMode) {
      tileElement.classList.add('edit-mode');
    }
    
    // Set grid position if specified
    if (tile.gridPosition) {
      tileElement.style.gridColumn = `${tile.gridPosition.x + 1} / span ${this.getTileSpan(tile.size)}`;
      tileElement.style.gridRow = `${tile.gridPosition.y + 1}`;
    }
    
    this.tiles.set(tile.id, { tile, module });
    this.container.appendChild(tileElement);
    this.saveToStorage();
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
    }
  }

  public updateTile(id: string, updates: Partial<Tile>): void {
    const tileData = this.tiles.get(id);
    if (!tileData) return;

    const updatedTile = { ...tileData.tile, ...updates };
    tileData.tile = updatedTile;

    const element = this.container.querySelector(`[data-tile-id="${id}"]`) as HTMLElement;
    if (element) {
      // Update size class
      element.className = element.className.replace(/tile-[sml]/g, '');
      element.classList.add(`tile-${updatedTile.size}`);
      
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
        }
      }
      this.saveToStorage();
    }
  }

  private createTileElement(tile: Tile): HTMLElement {
    const element = document.createElement('div');
    element.className = `tile tile-${tile.size}`;
    element.setAttribute('data-tile-id', tile.id);
    // Set draggable based on current edit mode state
    element.setAttribute('draggable', this.isEditMode ? 'true' : 'false');
    element.setAttribute('data-tile-type', tile.type);
    
    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'tile-remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', 'Remove tile');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeTile(tile.id);
    });
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
    
    // Show trash can and hide add button
    this.showTrashCan();
    
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', tile.outerHTML);
    }
  }

  private handleDragEnd(e: DragEvent): void {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    
    // Check if we're over the trash can
    if (this.trashCan && this.isOverTrashCan(e)) {
      const tileId = this.draggedElement?.getAttribute('data-tile-id');
      if (tileId) {
        this.removeTile(tileId);
      }
    }
    
    this.draggedElement = null;
    this.draggedIndex = -1;
    
    this.hideDropIndicator();
    this.hideAllDropZones();
    this.hideTrashCan();
    
    // Remove dragover class from all tiles
    this.container.querySelectorAll('.tile').forEach(tile => {
      tile.classList.remove('dragover');
    });
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    
    // Check if over trash can
    if (this.trashCan && this.isOverTrashCan(e)) {
      e.dataTransfer!.dropEffect = 'move';
      this.trashCan.classList.add('trash-can-hovered');
      this.hideDropIndicator();
      return;
    }
    
    this.trashCan?.classList.remove('trash-can-hovered');
    e.dataTransfer!.dropEffect = 'move';

    // Show drop indicator at grid position and highlight hovered zone
    const gridPos = this.getGridPositionFromEvent(e);
    if (gridPos) {
      this.showDropIndicator(gridPos);
      this.highlightHoveredDropZone(gridPos);
    }
  }
  
  private isOverTrashCan(e: DragEvent | TouchEvent | MouseEvent): boolean {
    if (!this.trashCan) return false;
    
    const trashRect = this.trashCan.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : (e.touches?.[0]?.clientX || e.changedTouches?.[0]?.clientX);
    const clientY = 'clientY' in e ? e.clientY : (e.touches?.[0]?.clientY || e.changedTouches?.[0]?.clientY);
    
    if (clientX === undefined || clientY === undefined) return false;
    
    return clientX >= trashRect.left && 
           clientX <= trashRect.right && 
           clientY >= trashRect.top && 
           clientY <= trashRect.bottom;
  }
  
  private showTrashCan(): void {
    if (this.trashCan) {
      this.trashCan.style.display = 'flex';
    }
    if (this.addTileBtn) {
      this.addTileBtn.style.display = 'none';
    }
  }
  
  private hideTrashCan(): void {
    if (this.trashCan) {
      this.trashCan.style.display = 'none';
      this.trashCan.classList.remove('trash-can-hovered');
    }
    if (this.addTileBtn) {
      this.addTileBtn.style.display = 'flex';
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
    
    // Calculate grid position
    const tileWidth = 500;
    
    const x = clientX - containerRect.left - 16; // Account for px-4 padding
    const y = clientY - containerRect.top;
    
    // Ensure non-negative
    const col = Math.max(0, Math.floor(x / (tileWidth + gridGap)));
    const row = Math.max(0, Math.floor(y / (tileHeight + gridGap)));
    
    return { col, row };
  }
  
  private dropIndicator: HTMLElement | null = null;
  private dropZones: HTMLElement[] = [];
  private trashCan: HTMLElement | null = null;
  private addTileBtn: HTMLElement | null = null;
  private editModeBtn: HTMLElement | null = null;
  private isEditMode: boolean = false;
  
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
    const occupied = new Set<string>();
    this.tiles.forEach((tileData, id) => {
      const tile = tileData.tile;
      const gridPos = tile.gridPosition || this.getCurrentGridPosition(id);
      if (gridPos) {
        const span = this.getTileSpan(tile.size);
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
          // Prevent clicks on drop zones from triggering tile moves
          zone.addEventListener('mousedown', (e) => {
            e.stopPropagation();
          });
          this.container.appendChild(zone);
          this.dropZones.push(zone);
        }
      }
    }
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
    
    // Check if we're over the trash can
    if (this.trashCan && this.isOverTrashCan(e)) {
      const tileId = this.draggedElement.getAttribute('data-tile-id');
      if (tileId) {
        this.removeTile(tileId);
      }
      this.hideTrashCan();
      return;
    }
    
    const gridPos = this.getGridPositionFromEvent(e);
    if (gridPos) {
      // Position tile at grid coordinates
      const tileId = this.draggedElement.getAttribute('data-tile-id');
      if (tileId) {
        const tileData = this.tiles.get(tileId);
        if (tileData) {
          // Set grid position
          this.draggedElement.style.gridColumn = `${gridPos.col + 1} / span ${this.getTileSpan(tileData.tile.size)}`;
          this.draggedElement.style.gridRow = `${gridPos.row + 1}`;
          
          // Update tile data
          tileData.tile.gridPosition = { x: gridPos.col, y: gridPos.row };
          this.saveToStorage();
        }
      }
    }
    
    this.hideTrashCan();
    
    // Remove dragover from all tiles
    this.container.querySelectorAll('.tile').forEach(tile => {
      tile.classList.remove('dragover');
    });
  }
  
  private getTileSpan(size: string): number {
    if (size === 'm') return 2;
    if (size === 'l') return 3;
    return 1;
  }

  public getAllTiles(): Tile[] {
    return Array.from(this.tiles.values()).map(t => t.tile);
  }

  public saveToStorage(): void {
    const tiles = this.getAllTiles();
    try {
      localStorage.setItem('pi-splay-tiles', JSON.stringify(tiles));
    } catch (e) {
      console.error('Failed to save tiles to localStorage:', e);
    }
  }

  public loadFromStorage(): Tile[] | null {
    try {
      const stored = localStorage.getItem('pi-splay-tiles');
      if (stored) {
        return JSON.parse(stored) as Tile[];
      }
    } catch (e) {
      console.error('Failed to load tiles from localStorage:', e);
    }
    return null;
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
      this.showTrashCan();
      // Hide drop zones during drag to show only the indicator
      this.hideAllDropZones();
      e.preventDefault();
    }
    
    // Only continue if we're actually dragging
    if (this.isMouseDragging && this.draggedElement) {
      e.preventDefault();
      
      // Check if over trash can
      if (this.trashCan && this.isOverTrashCan(e)) {
        this.trashCan.classList.add('trash-can-hovered');
        this.hideDropIndicator();
        return;
      }
      
      this.trashCan?.classList.remove('trash-can-hovered');
      
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
      
      // Check if we're over the trash can
      if (this.trashCan && this.isOverTrashCan(e)) {
        if (tileId) {
          this.removeTile(tileId);
        }
      } else if (tileId) {
        const gridPos = this.getGridPositionFromEvent(e);
        
        if (gridPos) {
          const tileData = this.tiles.get(tileId);
          if (tileData) {
            const currentPos = tileData.tile.gridPosition || this.getCurrentGridPosition(tileId);
            // Only move if position actually changed
            if (!currentPos || currentPos.x !== gridPos.col || currentPos.y !== gridPos.row) {
              // Set grid position
              draggedTile.style.gridColumn = `${gridPos.col + 1} / span ${this.getTileSpan(tileData.tile.size)}`;
              draggedTile.style.gridRow = `${gridPos.row + 1}`;
              
              // Update tile data
              tileData.tile.gridPosition = { x: gridPos.col, y: gridPos.row };
              this.saveToStorage();
            }
          }
        }
      }
      
      // Clean up immediately
      this.container.querySelectorAll('.tile').forEach(t => {
        t.classList.remove('dragover');
      });
      
      // Always hide drop indicator and trash can
      this.hideDropIndicator();
      this.hideTrashCan();
      
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
      this.showTrashCan();
      e.preventDefault();
    }
    
    if (this.isTouchDragging) {
      e.preventDefault();
      
      // Check if over trash can
      if (this.trashCan && this.isOverTrashCan(e)) {
        this.trashCan.classList.add('trash-can-hovered');
        this.hideDropIndicator();
        return;
      }
      
      this.trashCan?.classList.remove('trash-can-hovered');
      
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
      
      // Check if we're over the trash can
      if (this.trashCan && this.isOverTrashCan(e)) {
        const tileId = this.draggedElement.getAttribute('data-tile-id');
        if (tileId) {
          this.removeTile(tileId);
        }
      } else {
        const touch = e.changedTouches[0];
        const gridPos = this.getGridPositionFromEvent(e);
        
        if (gridPos) {
          // Position tile at grid coordinates
          const tileId = this.draggedElement.getAttribute('data-tile-id');
          if (tileId) {
            const tileData = this.tiles.get(tileId);
            if (tileData) {
              // Set grid position
              this.draggedElement.style.gridColumn = `${gridPos.col + 1} / span ${this.getTileSpan(tileData.tile.size)}`;
              this.draggedElement.style.gridRow = `${gridPos.row + 1}`;
              
              // Update tile data
              tileData.tile.gridPosition = { x: gridPos.col, y: gridPos.row };
              this.saveToStorage();
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
      this.hideTrashCan();
    }
    
    this.draggedElement.classList.remove('dragging');
    this.draggedElement = null;
    this.isTouchDragging = false;
    this.touchStartModule = null;
  }
}

