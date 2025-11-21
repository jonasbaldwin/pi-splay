import { TimeMark } from '../types';
import { createTimeMark } from './time';

type MarkableModule = {
  addMark: (mark: TimeMark) => void;
  removeMark: (index: number) => void;
  clearMarks: () => void;
  getTimezone: () => string;
  getMarksList?: () => HTMLElement | null;
};

export class MarkSyncManager {
  private static instance: MarkSyncManager;
  private modules: Set<MarkableModule> = new Set();

  private constructor() {}

  public static getInstance(): MarkSyncManager {
    if (!MarkSyncManager.instance) {
      MarkSyncManager.instance = new MarkSyncManager();
    }
    return MarkSyncManager.instance;
  }

  public register(module: MarkableModule): void {
    this.modules.add(module);
  }

  public unregister(module: MarkableModule): void {
    this.modules.delete(module);
  }

  public syncTap(sourceModule: MarkableModule): void {
    // Create marks for all registered modules at the same moment
    const marks: Map<MarkableModule, TimeMark> = new Map();
    
    this.modules.forEach(module => {
      const timezone = module.getTimezone();
      const mark = createTimeMark(timezone);
      marks.set(module, mark);
    });

    // Add all marks simultaneously
    marks.forEach((mark, module) => {
      module.addMark(mark);
    });
  }

  public syncRemoveMark(index: number): void {
    this.modules.forEach(module => {
      module.removeMark(index);
    });
  }

  public syncClearMarks(): void {
    this.modules.forEach(module => {
      module.clearMarks();
    });
  }

  public syncScroll(sourceModule: MarkableModule, scrollTop: number): void {
    // Sync scroll position to all other modules
    this.modules.forEach(module => {
      // Skip the source module to avoid infinite loops
      if (module === sourceModule) return;
      
      const marksList = module.getMarksList?.();
      if (marksList) {
        marksList.scrollTop = scrollTop;
      }
    });
  }
}

