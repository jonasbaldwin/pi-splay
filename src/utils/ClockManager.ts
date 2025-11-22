/**
 * Shared clock manager that runs a single timer for all time-based modules.
 * This ensures all clocks stay in sync and reduces memory/CPU usage.
 */
type ClockSubscriber = {
  onTick: () => void;
};

export class ClockManager {
  private static instance: ClockManager | null = null;
  private subscribers: Set<ClockSubscriber> = new Set();
  private intervalId: number | null = null;
  private timeoutId: number | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): ClockManager {
    if (!ClockManager.instance) {
      ClockManager.instance = new ClockManager();
    }
    return ClockManager.instance;
  }

  /**
   * Register a subscriber to receive clock ticks
   */
  public subscribe(subscriber: ClockSubscriber): void {
    this.subscribers.add(subscriber);
    
    // Start the clock if this is the first subscriber
    if (!this.isRunning) {
      this.startClock();
    }
  }

  /**
   * Unregister a subscriber
   */
  public unsubscribe(subscriber: ClockSubscriber): void {
    this.subscribers.delete(subscriber);
    
    // Stop the clock if there are no more subscribers
    if (this.subscribers.size === 0 && this.isRunning) {
      this.stopClock();
    }
  }

  /**
   * Start the shared clock timer
   */
  private startClock(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleNextTick();
  }

  /**
   * Stop the shared clock timer
   */
  private stopClock(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Schedule the next tick to align with the second boundary
   */
  private scheduleNextTick(): void {
    // Calculate milliseconds until the next second boundary
    const now = new Date();
    const currentMs = now.getMilliseconds();
    const msUntilNextSecond = 1000 - currentMs;
    
    // Schedule the next update to occur exactly at the next second boundary
    // Add a small buffer (20ms) to ensure we're past the boundary
    const delay = Math.max(20, msUntilNextSecond + 20);
    
    this.timeoutId = window.setTimeout(() => {
      // Notify all subscribers
      this.notifySubscribers();
      
      // After the first aligned tick, use setInterval for subsequent ticks
      this.intervalId = window.setInterval(() => {
        this.notifySubscribers();
      }, 1000);
    }, delay);
  }

  /**
   * Notify all subscribers of a clock tick
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.onTick();
      } catch (error) {
        console.error('Error in clock subscriber:', error);
      }
    });
  }
}


