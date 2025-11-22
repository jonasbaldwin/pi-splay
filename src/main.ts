import { TileManager } from './components/TileManager';
import { TabManager } from './components/TabManager';
import { Tile } from './types';

function generateId(): string {
  return `tile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function initializeDashboard(): void {
  const container = document.getElementById('dashboard');
  const tabBar = document.getElementById('tab-bar');
  if (!container) {
    console.error('Dashboard container not found');
    return;
  }
  if (!tabBar) {
    console.error('Tab bar not found');
    return;
  }

  const tileManager = new TileManager(container);
  const tabManager = new TabManager(tabBar);

  // Initialize with default tiles: local time, UTC time, epoch time, and calendar
  const today = new Date();
  const defaultTiles: Tile[] = [
    {
      id: generateId(),
      type: 'time',
      size: 's',
      data: {
        timezone: 'local',
        marks: []
      }
    },
    {
      id: generateId(),
      type: 'time',
      size: 's',
      data: {
        timezone: 'utc',
        marks: []
      }
    },
    {
      id: generateId(),
      type: 'epoch',
      size: 's',
      data: {
        marks: []
      }
    },
    {
      id: generateId(),
      type: 'calendar',
      size: 's',
      data: {
        selectedDates: [],
        currentMonth: today.getMonth(),
        currentYear: today.getFullYear()
      }
    },
    {
      id: generateId(),
      type: 'date',
      size: 's',
      data: {}
    }
  ];

  // Set up callbacks
  tileManager.setOnTilesChange((tiles) => {
    const activeTabId = tabManager.getActiveTabId();
    if (activeTabId) {
      tabManager.setTilesForActiveTab(tiles);
    }
  });

  tabManager.setOnTabChange((tabId) => {
    const activeTab = tabManager.getActiveTab();
    if (activeTab) {
      tileManager.loadTiles(activeTab.tiles);
    }
  });

  tabManager.setOnTilesChange((tabId, tiles) => {
    // When tiles change in a tab, update the tile manager if it's the active tab
    if (tabId === tabManager.getActiveTabId()) {
      tileManager.loadTiles(tiles);
    }
  });

  // Load tiles for the active tab
  const activeTab = tabManager.getActiveTab();
  if (activeTab) {
    if (activeTab.tiles.length > 0) {
      tileManager.loadTiles(activeTab.tiles);
    } else if (activeTab.name === 'default' && tabManager.getAllTabs().length === 1) {
      // Only add default tiles to the first "default" tab if it's empty and it's the only tab
      // This handles the case of a fresh install or migration
      defaultTiles.forEach(tile => {
        tileManager.addTile(tile, false);
      });
      // Save the default tiles to the tab
      tabManager.setTilesForActiveTab(tileManager.getAllTiles());
    } else {
      // Empty tab, just load empty array
      tileManager.loadTiles([]);
    }
  }

  // Store managers in window for potential future extensions
  (window as any).tileManager = tileManager;
  (window as any).tabManager = tabManager;
  
  // Initialize add tile functionality
  initializeAddTileModal(tileManager);
}

function initializeAddTileModal(tileManager: TileManager): void {
  const modal = document.getElementById('tile-modal');
  const closeBtn = modal?.querySelector('.modal-close-btn');
  const cancelBtn = modal?.querySelector('.btn-cancel');
  const addTileBtn = document.getElementById('btn-add-tile');
  const tileTypeSelection = document.getElementById('tile-type-selection');
  const tileConfig = document.getElementById('tile-config');
  
  let selectedTileType: string | null = null;
  let selectedConfig: any = {};
  
  // Tile type options
  const tileTypes = [
    { type: 'time', label: 'Time', icon: '🕐' },
    { type: 'epoch', label: 'Epoch', icon: '⏱️' },
    { type: 'calendar', label: 'Calendar', icon: '📅' },
    { type: 'date', label: 'Date', icon: '📆' },
    { type: 'timezone-converter', label: 'Timezone Converter', icon: '🌍' },
    { type: 'map', label: 'World Map', icon: '🗺️' },
    { type: 'format-helper', label: 'Date Formatter', icon: '📝' },
    { type: 'quick-notes', label: 'Quick Notes', icon: '📝' },
    { type: 'number-converter', label: 'Number Converter', icon: '🔢' }
  ];
  
  // Populate tile type selection
  if (tileTypeSelection) {
    tileTypeSelection.innerHTML = tileTypes.map(t => `
      <div class="tile-type-option" data-tile-type="${t.type}">
        <span class="tile-type-icon">${t.icon}</span>
        <span class="tile-type-label">${t.label}</span>
      </div>
    `).join('');
    
    // Handle tile type selection
    tileTypeSelection.querySelectorAll('.tile-type-option').forEach(option => {
      option.addEventListener('click', () => {
        const type = (option as HTMLElement).getAttribute('data-tile-type');
        if (type) {
          selectedTileType = type;
          tileTypeSelection?.querySelectorAll('.tile-type-option').forEach(opt => {
            opt.classList.remove('selected');
          });
          option.classList.add('selected');
          showTileConfig(type);
        }
      });
    });
  }
  
  function showTileConfig(type: string): void {
    if (!tileConfig) return;
    
    let configHtml = '';
    
    if (type === 'time') {
      // Timezone selection
      const timezones = [
        { value: 'local', label: 'Local Time' },
        { value: 'utc', label: 'UTC' },
        { value: 'America/New_York', label: 'New York (EST/EDT)' },
        { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
        { value: 'Europe/London', label: 'London (GMT/BST)' },
        { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
        { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
        { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
        { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
        { value: 'America/Denver', label: 'Denver (MST/MDT)' },
        { value: 'America/Phoenix', label: 'Phoenix (MST)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
        { value: 'Asia/Dubai', label: 'Dubai (GST)' },
        { value: 'Asia/Kolkata', label: 'Mumbai (IST)' }
      ];
      
      configHtml = `
        <div class="config-section">
          <label class="config-label">Select Timezone:</label>
          <select class="config-select" id="timezone-select">
            ${timezones.map(tz => `<option value="${tz.value}">${tz.label}</option>`).join('')}
          </select>
        </div>
      `;
      selectedConfig = { timezone: 'local', marks: [] };
    } else if (type === 'epoch') {
      configHtml = '<p class="config-info">Epoch tile displays Unix timestamp.</p>';
      selectedConfig = { marks: [] };
    } else if (type === 'calendar') {
      const today = new Date();
      configHtml = '<p class="config-info">Calendar tile shows current and next month.</p>';
      selectedConfig = {
        selectedDates: [],
        currentMonth: today.getMonth(),
        currentYear: today.getFullYear()
      };
    } else if (type === 'date') {
      configHtml = '<p class="config-info">Date tile displays today\'s date.</p>';
      selectedConfig = {};
    } else if (type === 'timezone-converter') {
      configHtml = '<p class="config-info">Timezone converter converts times between different timezones.</p>';
      selectedConfig = {
        sourceTimezone: 'local',
        targetTimezones: []
      };
    } else if (type === 'map') {
      configHtml = '<p class="config-info">World map tile - tap to get coordinates, search locations, or enter coordinates.</p>';
      selectedConfig = {};
    } else if (type === 'format-helper') {
      configHtml = '<p class="config-info">Format helper shows date/time formatting options for different programming languages.</p>';
      selectedConfig = { selectedLanguage: 'javascript' };
    } else if (type === 'quick-notes') {
      configHtml = '<p class="config-info">Quick notes tile allows you to add and manage small notes with markdown support.</p>';
      selectedConfig = { notes: [] };
    } else if (type === 'number-converter') {
      configHtml = '<p class="config-info">Number converter converts between decimal, binary, hexadecimal, and octal formats.</p>';
      selectedConfig = { value: 42 };
    }
    
    tileConfig.innerHTML = configHtml;
    tileConfig.style.display = 'block';
    
    // Update config when timezone changes
    if (type === 'time') {
      const timezoneSelect = document.getElementById('timezone-select') as HTMLSelectElement;
      if (timezoneSelect) {
        timezoneSelect.addEventListener('change', (e) => {
          selectedConfig.timezone = (e.target as HTMLSelectElement).value;
        });
      }
    }
    
    if (addTileBtn) {
      addTileBtn.disabled = false;
    }
  }
  
  // Function to open modal
  const openModal = (clearPendingPosition: boolean = false) => {
    if (modal) {
      if (clearPendingPosition) {
        tileManager.clearPendingGridPosition();
      }
      modal.classList.add('active');
      selectedTileType = null;
      selectedConfig = {};
      if (tileConfig) tileConfig.style.display = 'none';
      if (tileTypeSelection) {
        tileTypeSelection.querySelectorAll('.tile-type-option').forEach(opt => {
          opt.classList.remove('selected');
        });
      }
      if (addTileBtn) addTileBtn.disabled = true;
    }
  };
  
  // Listen for custom event to show modal when clicking drop zone
  window.addEventListener('showAddTileModal', () => {
    openModal();
  });
  
  // Close modal
  const closeModal = () => {
    if (modal) {
      modal.classList.remove('active');
      // Clear pending grid position if modal is closed without adding a tile
      tileManager.clearPendingGridPosition();
    }
  };
  
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Add tile
  addTileBtn?.addEventListener('click', () => {
    if (selectedTileType) {
      const newTile: Tile = {
        id: generateId(),
        type: selectedTileType as any,
        size: 's',
        data: selectedConfig
      };
      tileManager.addTile(newTile);
      // clearPendingGridPosition is called inside addTile, so we don't need to call it here
      closeModal();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

