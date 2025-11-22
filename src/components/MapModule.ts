import { MapTileData } from '../types';

// Leaflet is loaded via script tag, accessed via window.L

export class MapModule {
  private element: HTMLElement;
  private data: MapTileData;
  private map: any = null;
  private marker: any = null;
  private locationInput!: HTMLInputElement;
  private latInput!: HTMLInputElement;
  private lngInput!: HTMLInputElement;
  private coordinatesDisplay!: HTMLElement;
  private locationDisplay!: HTMLElement;
  private mapClickHandler: ((e: any) => void) | null = null;
  private editModeCheckHandler: (() => void) | null = null;

  constructor(element: HTMLElement, data: MapTileData) {
    this.element = element;
    this.data = data;
    this.initialize();
    this.setupEditModeListener();
  }

  private setupEditModeListener(): void {
    // Listen for edit mode changes
    this.editModeCheckHandler = () => {
      const tileManager = (window as any).tileManager;
      const isEditMode = tileManager && tileManager.isInEditMode && tileManager.isInEditMode();
      
      // Immediately invalidate map size to force re-render
      if (this.map) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          if (this.map) {
            this.map.invalidateSize();
            // Also trigger a resize event
            window.dispatchEvent(new Event('resize'));
          }
        });
        
        // Do it again after a short delay to be sure
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 100);
      }
      
      // Wait a moment to ensure map is initialized before disabling interactions
      setTimeout(() => {
        if (isEditMode) {
          this.disableMapInteractions();
        } else {
          this.enableMapInteractions();
        }
      }, 50);
    };

    // Check initially after a delay to ensure map is ready
    setTimeout(() => {
      this.editModeCheckHandler();
    }, 300);

    // Listen for edit mode toggle events (we'll dispatch this from TileManager)
    window.addEventListener('editModeChanged', this.editModeCheckHandler);
  }

  private disableMapInteractions(): void {
    // Don't disable pointer events - just prevent map interactions
    // The tile drag system will handle dragging
    if (this.map) {
      try {
        // Remove click handler temporarily
        if (this.mapClickHandler) {
          this.map.off('click', this.mapClickHandler);
        }
        // Disable map dragging/zooming
        if (this.map.dragging) this.map.dragging.disable();
        if (this.map.doubleClickZoom) this.map.doubleClickZoom.disable();
        if (this.map.scrollWheelZoom) this.map.scrollWheelZoom.disable();
        if (this.map.touchZoom) this.map.touchZoom.disable();
        if (this.map.boxZoom) this.map.boxZoom.disable();
        if (this.map.keyboard) this.map.keyboard.disable();
      } catch (e) {
        // Ignore errors if handlers don't exist yet
      }
    }
    
    // Ensure map container is visible and force a re-render
    const mapContainer = this.element.querySelector('[data-map-container]') as HTMLElement;
    if (mapContainer && this.map) {
      // Force map to re-render by invalidating size
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          // Also try to trigger a redraw
          this.map.eachLayer((layer: any) => {
            if (layer.redraw) {
              layer.redraw();
            }
          });
        }
      }, 150);
    }
  }

  private enableMapInteractions(): void {
    // Re-enable map interactions
    if (this.map) {
      try {
        // Re-add click handler
        if (this.mapClickHandler) {
          this.map.on('click', this.mapClickHandler);
        }
        // Enable map dragging/zooming
        if (this.map.dragging) this.map.dragging.enable();
        if (this.map.doubleClickZoom) this.map.doubleClickZoom.enable();
        if (this.map.scrollWheelZoom) this.map.scrollWheelZoom.enable();
        if (this.map.touchZoom) this.map.touchZoom.enable();
        if (this.map.boxZoom) this.map.boxZoom.enable();
        if (this.map.keyboard) this.map.keyboard.enable();
        // Invalidate map size to ensure it renders correctly
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 100);
      } catch (e) {
        // Ignore errors
      }
    }
  }

  private initialize(): void {
    this.element.innerHTML = `
      <div class="map-module">
        <div class="map-controls">
          <div class="map-control-group">
            <label class="map-control-label">Location:</label>
            <input 
              type="text" 
              class="map-location-input" 
              data-location-input
              placeholder="Enter city, country, or state..."
            />
            <button class="map-search-btn" data-search-location>Search</button>
          </div>
          <div class="map-control-group">
            <label class="map-control-label">Coordinates:</label>
            <div class="map-coords-inputs">
              <input 
                type="number" 
                class="map-coord-input" 
                data-lat-input
                placeholder="Latitude"
                step="any"
              />
              <input 
                type="number" 
                class="map-coord-input" 
                data-lng-input
                placeholder="Longitude"
                step="any"
              />
              <button class="map-go-btn" data-go-to-coords>Go</button>
            </div>
          </div>
          <div class="map-info">
            <div class="map-info-header">
              <div class="map-info-title">Info:</div>
              <button class="map-clear-btn" data-clear-map title="Clear map">Clear</button>
            </div>
            <div class="map-coords-display" data-coords-display></div>
            <div class="map-location-display" data-location-display></div>
          </div>
        </div>
        <div class="map-container" data-map-container></div>
      </div>
    `;

    this.locationInput = this.element.querySelector('[data-location-input]') as HTMLInputElement;
    this.latInput = this.element.querySelector('[data-lat-input]') as HTMLInputElement;
    this.lngInput = this.element.querySelector('[data-lng-input]') as HTMLInputElement;
    this.coordinatesDisplay = this.element.querySelector('[data-coords-display]')!;
    this.locationDisplay = this.element.querySelector('[data-location-display]')!;

    // Load saved values
    if (this.data.latitude !== undefined && this.data.longitude !== undefined) {
      this.latInput.value = this.data.latitude.toString();
      this.lngInput.value = this.data.longitude.toString();
    }
    if (this.data.locationName) {
      this.locationInput.value = this.data.locationName;
    }

    // Initialize map
    this.initMap();

    // Add event listeners
    this.element.querySelector('[data-search-location]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.searchLocation();
    });

    this.element.querySelector('[data-go-to-coords]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.goToCoordinates();
    });

    this.locationInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.searchLocation();
      }
    });

    this.latInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.goToCoordinates();
      }
    });

    this.lngInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.goToCoordinates();
      }
    });

    // Add clear button handler
    this.element.querySelector('[data-clear-map]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearMap();
    });
  }

  private initMap(): void {
    const mapContainer = this.element.querySelector('[data-map-container]') as HTMLElement;
    if (!mapContainer) return;

    // Check if Leaflet is loaded, wait a bit if not
    if (typeof (window as any).L === 'undefined') {
      // Try waiting for Leaflet to load
      let attempts = 0;
      const checkLeaflet = setInterval(() => {
        attempts++;
        if (typeof (window as any).L !== 'undefined') {
          clearInterval(checkLeaflet);
          this.initializeMapWithLeaflet(mapContainer);
        } else if (attempts > 20) {
          clearInterval(checkLeaflet);
          mapContainer.innerHTML = '<div class="map-error">Map library not loaded. Please refresh the page.</div>';
        }
      }, 100);
      return;
    }

    this.initializeMapWithLeaflet(mapContainer);
  }

  private initializeMapWithLeaflet(mapContainer: HTMLElement): void {
    const L = (window as any).L;
    if (!L) return;

    // Ensure map container is visible before initializing
    // Don't set inline styles that might conflict - let CSS handle it
    // Just make sure it's in the DOM and has dimensions

    // Default center (world center)
    const defaultLat = this.data.latitude ?? 0;
    const defaultLng = this.data.longitude ?? 0;
    const defaultZoom = this.data.zoom ?? 2;

    // Initialize map
    this.map = L.map(mapContainer, {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
      zoomControl: true,
      attributionControl: true
    });

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Add click handler to get coordinates
    this.mapClickHandler = (e: any) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      this.updateCoordinates(lat, lng);
      this.updateMarker(lat, lng);
      this.saveToStorage();
    };
    this.map.on('click', this.mapClickHandler);

    // Check edit mode and set initial state after map is fully initialized
    setTimeout(() => {
      const tileManager = (window as any).tileManager;
      if (tileManager && tileManager.isInEditMode && tileManager.isInEditMode()) {
        this.disableMapInteractions();
      }
      // Invalidate size to ensure map renders - do it multiple times to be sure
      if (this.map) {
        this.map.invalidateSize();
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 100);
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
          }
        }, 300);
      }
    }, 200);

    // Add marker if we have saved coordinates
    if (this.data.latitude !== undefined && this.data.longitude !== undefined) {
      this.updateMarker(this.data.latitude, this.data.longitude);
      this.map.setView([this.data.latitude, this.data.longitude], this.data.zoom ?? 10);
    }

    // Update coordinates display on map move
    this.map.on('moveend', () => {
      const center = this.map.getCenter();
      this.updateCoordinatesDisplay(center.lat, center.lng);
    });
  }

  private updateMarker(lat: number, lng: number): void {
    if (!this.map) return;
    const L = (window as any).L;
    if (!L) return;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng]).addTo(this.map);
    }
  }

  private updateCoordinates(lat: number, lng: number): void {
    this.latInput.value = lat.toFixed(6);
    this.lngInput.value = lng.toFixed(6);
    this.data.latitude = lat;
    this.data.longitude = lng;
    this.updateCoordinatesDisplay(lat, lng);
  }

  private updateCoordinatesDisplay(lat: number, lng: number): void {
    this.coordinatesDisplay.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
  }

  private async searchLocation(): Promise<void> {
    const locationName = this.locationInput.value.trim();
    if (!locationName) return;

    try {
      // Use Nominatim (OpenStreetMap's geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Pi-Splay Dashboard'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        this.updateCoordinates(lat, lng);
        this.updateMarker(lat, lng);
        this.map.setView([lat, lng], 10);
        this.locationDisplay.textContent = result.display_name;
        this.data.locationName = locationName;
        this.saveToStorage();
      } else {
        this.locationDisplay.textContent = 'Location not found';
      }
    } catch (error) {
      console.error('Error searching location:', error);
      this.locationDisplay.textContent = 'Error searching location';
    }
  }

  private goToCoordinates(): void {
    const latStr = this.latInput.value.trim();
    const lngStr = this.lngInput.value.trim();

    if (!latStr || !lngStr) return;

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      this.locationDisplay.textContent = 'Invalid coordinates';
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.locationDisplay.textContent = 'Coordinates out of range';
      return;
    }

    this.updateCoordinates(lat, lng);
    this.updateMarker(lat, lng);
    this.map.setView([lat, lng], 10);
    this.data.locationName = undefined;
    this.locationInput.value = '';
    this.locationDisplay.textContent = '';
    this.saveToStorage();
  }

  private clearMap(): void {
    // Clear inputs
    this.locationInput.value = '';
    this.latInput.value = '';
    this.lngInput.value = '';
    
    // Clear displays
    this.coordinatesDisplay.textContent = '';
    this.locationDisplay.textContent = '';
    
    // Clear data
    this.data.latitude = undefined;
    this.data.longitude = undefined;
    this.data.locationName = undefined;
    this.data.zoom = 2;
    
    // Remove marker
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
    
    // Reset map view to world center
    if (this.map) {
      this.map.setView([0, 0], 2);
    }
    
    // Save to storage
    this.saveToStorage();
  }

  private saveToStorage(): void {
    // Notify TileManager to save
    const tileManager = (window as any).tileManager;
    if (tileManager && typeof tileManager.saveToStorage === 'function') {
      tileManager.saveToStorage();
    }
  }

  public updateData(data: MapTileData): void {
    this.data = data;
    
    // Restore input values
    if (this.data.latitude !== undefined && this.data.longitude !== undefined) {
      this.latInput.value = this.data.latitude.toString();
      this.lngInput.value = this.data.longitude.toString();
    } else {
      this.latInput.value = '';
      this.lngInput.value = '';
    }
    
    if (this.data.locationName) {
      this.locationInput.value = this.data.locationName;
    } else {
      this.locationInput.value = '';
    }

    // Update map if it exists
    if (this.map && this.data.latitude !== undefined && this.data.longitude !== undefined) {
      this.updateMarker(this.data.latitude, this.data.longitude);
      this.map.setView([this.data.latitude, this.data.longitude], this.data.zoom ?? 10);
      this.updateCoordinatesDisplay(this.data.latitude, this.data.longitude);
    }
  }

  public destroy(): void {
    if (this.editModeCheckHandler) {
      window.removeEventListener('editModeChanged', this.editModeCheckHandler);
      this.editModeCheckHandler = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
    }
    this.mapClickHandler = null;
  }
}

