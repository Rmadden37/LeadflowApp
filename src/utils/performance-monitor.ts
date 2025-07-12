/**
 * AURELIAN SALOMAN'S REAL-TIME PERFORMANCE MONITOR
 * 
 * This utility provides real-time performance monitoring specifically
 * for iOS Safari, tracking FPS, memory usage, and interaction latency.
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  memoryUsage: number;
  interactionLatency: number;
  scrollPerformance: number;
  gpuAcceleration: boolean;
  batteryLevel?: number;
  networkSpeed: string;
  devicePixelRatio: number;
}

interface PerformanceConfig {
  enableFpsMonitoring?: boolean;
  enableMemoryMonitoring?: boolean;
  enableInteractionTracking?: boolean;
  enableScrollTracking?: boolean;
  sampleInterval?: number;
  reportInterval?: number;
  debug?: boolean;
}

class PerformanceMonitor {
  private config: Required<PerformanceConfig>;
  private metrics: PerformanceMetrics;
  private isMonitoring = false;
  
  // FPS tracking
  private frameCount = 0;
  private lastTime = 0;
  private fpsHistory: number[] = [];
  private rafId: number | null = null;
  
  // Memory tracking
  private memoryHistory: number[] = [];
  
  // Interaction tracking
  private interactionStartTime = 0;
  private interactionHistory: number[] = [];
  
  // Scroll tracking
  private scrollStartTime = 0;
  private scrollHistory: number[] = [];
  
  // Event listeners
  private listeners: (() => void)[] = [];
  
  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enableFpsMonitoring: true,
      enableMemoryMonitoring: true,
      enableInteractionTracking: true,
      enableScrollTracking: true,
      sampleInterval: 1000,
      reportInterval: 5000,
      debug: false,
      ...config
    };

    this.metrics = {
      fps: 0,
      averageFps: 0,
      memoryUsage: 0,
      interactionLatency: 0,
      scrollPerformance: 0,
      gpuAcceleration: false,
      networkSpeed: 'unknown',
      devicePixelRatio: window.devicePixelRatio || 1
    };

    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    // Check GPU acceleration
    this.checkGPUAcceleration();
    
    // Check network speed
    this.checkNetworkSpeed();
    
    // Check battery level (if available)
    this.checkBatteryLevel();

    if (this.config.debug) {
      console.log('🔍 Performance Monitor initialized', this.config);
    }
  }

  private checkGPUAcceleration() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      this.metrics.gpuAcceleration = !!gl;
      
      if (this.config.debug && this.metrics.gpuAcceleration && gl) {
        // Cast to WebGLRenderingContext for proper typing
        const webglContext = gl as WebGLRenderingContext;
        const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          console.log('🎮 GPU Renderer:', renderer);
        }
      }
    } catch (error) {
      this.metrics.gpuAcceleration = false;
    }
  }

  private checkNetworkSpeed() {
    // @ts-ignore - Navigator.connection is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      this.metrics.networkSpeed = connection.effectiveType || 'unknown';
      
      if (this.config.debug) {
        console.log('📶 Network Speed:', this.metrics.networkSpeed, connection);
      }
    }
  }

  private async checkBatteryLevel() {
    try {
      // @ts-ignore - Battery API is experimental
      const battery = await navigator.getBattery?.();
      if (battery) {
        this.metrics.batteryLevel = Math.round(battery.level * 100);
        
        if (this.config.debug) {
          console.log('🔋 Battery Level:', this.metrics.batteryLevel + '%');
        }
      }
    } catch (error) {
      // Battery API not supported
    }
  }

  public startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;

    if (this.config.enableFpsMonitoring) {
      this.startFpsMonitoring();
    }

    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }

    if (this.config.enableInteractionTracking) {
      this.startInteractionTracking();
    }

    if (this.config.enableScrollTracking) {
      this.startScrollTracking();
    }

    // Start periodic reporting
    const reportInterval = setInterval(() => {
      this.generateReport();
    }, this.config.reportInterval);

    this.listeners.push(() => clearInterval(reportInterval));

    if (this.config.debug) {
      console.log('🚀 Performance monitoring started');
    }
  }

  private startFpsMonitoring() {
    const measureFps = (timestamp: number) => {
      if (this.lastTime === 0) {
        this.lastTime = timestamp;
        this.frameCount = 0;
      }

      this.frameCount++;
      const deltaTime = timestamp - this.lastTime;

      if (deltaTime >= this.config.sampleInterval) {
        const fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.metrics.fps = fps;
        
        // Update FPS history
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 60) { // Keep last 60 samples
          this.fpsHistory.shift();
        }
        
        // Calculate average FPS
        this.metrics.averageFps = Math.round(
          this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
        );

        this.frameCount = 0;
        this.lastTime = timestamp;
      }

      if (this.isMonitoring) {
        this.rafId = requestAnimationFrame(measureFps);
      }
    };

    this.rafId = requestAnimationFrame(measureFps);
    this.listeners.push(() => {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
    });
  }

  private startMemoryMonitoring() {
    const measureMemory = () => {
      if (!this.isMonitoring) return;

      // @ts-ignore - performance.memory is experimental
      const memory = performance.memory;
      if (memory) {
        const memoryMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        this.metrics.memoryUsage = memoryMB;
        
        this.memoryHistory.push(memoryMB);
        if (this.memoryHistory.length > 60) {
          this.memoryHistory.shift();
        }
      }

      setTimeout(measureMemory, this.config.sampleInterval);
    };

    setTimeout(measureMemory, this.config.sampleInterval);
  }

  private startInteractionTracking() {
    const trackInteractionStart = () => {
      this.interactionStartTime = performance.now();
    };

    const trackInteractionEnd = () => {
      if (this.interactionStartTime > 0) {
        const latency = performance.now() - this.interactionStartTime;
        this.interactionHistory.push(latency);
        
        if (this.interactionHistory.length > 20) {
          this.interactionHistory.shift();
        }
        
        this.metrics.interactionLatency = Math.round(
          this.interactionHistory.reduce((sum, lat) => sum + lat, 0) / this.interactionHistory.length
        );
        
        this.interactionStartTime = 0;
      }
    };

    // Track various interaction types
    const events = ['touchstart', 'mousedown', 'keydown'];
    const endEvents = ['touchend', 'mouseup', 'keyup'];

    events.forEach(event => {
      document.addEventListener(event, trackInteractionStart, { passive: true });
      this.listeners.push(() => {
        document.removeEventListener(event, trackInteractionStart);
      });
    });

    endEvents.forEach(event => {
      document.addEventListener(event, trackInteractionEnd, { passive: true });
      this.listeners.push(() => {
        document.removeEventListener(event, trackInteractionEnd);
      });
    });
  }

  private startScrollTracking() {
    const trackScrollStart = () => {
      this.scrollStartTime = performance.now();
    };

    const trackScrollEnd = () => {
      if (this.scrollStartTime > 0) {
        const duration = performance.now() - this.scrollStartTime;
        this.scrollHistory.push(duration);
        
        if (this.scrollHistory.length > 20) {
          this.scrollHistory.shift();
        }
        
        this.metrics.scrollPerformance = Math.round(
          this.scrollHistory.reduce((sum, dur) => sum + dur, 0) / this.scrollHistory.length
        );
        
        this.scrollStartTime = 0;
      }
    };

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (this.scrollStartTime === 0) {
        trackScrollStart();
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScrollEnd, 150);
    };

    document.addEventListener('scroll', handleScroll, { passive: true });
    this.listeners.push(() => {
      document.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    });
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      fps: {
        current: this.metrics.fps,
        average: this.metrics.averageFps,
        status: this.metrics.averageFps >= 55 ? 'excellent' : 
                this.metrics.averageFps >= 45 ? 'good' : 
                this.metrics.averageFps >= 30 ? 'fair' : 'poor'
      },
      memory: {
        usage: this.metrics.memoryUsage,
        trend: this.getMemoryTrend()
      },
      interactions: {
        averageLatency: this.metrics.interactionLatency,
        status: this.metrics.interactionLatency <= 16 ? 'excellent' :
                this.metrics.interactionLatency <= 33 ? 'good' :
                this.metrics.interactionLatency <= 50 ? 'fair' : 'poor'
      },
      scroll: {
        averageDuration: this.metrics.scrollPerformance,
        status: this.metrics.scrollPerformance <= 16 ? 'smooth' : 'janky'
      },
      device: {
        gpuAcceleration: this.metrics.gpuAcceleration,
        devicePixelRatio: this.metrics.devicePixelRatio,
        networkSpeed: this.metrics.networkSpeed,
        batteryLevel: this.metrics.batteryLevel
      }
    };

    if (this.config.debug) {
      console.table(report);
    }

    return JSON.stringify(report, null, 2);
  }

  private getMemoryTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.memoryHistory.length < 5) return 'stable';
    
    const recent = this.memoryHistory.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const diff = last - first;
    
    if (diff > 5) return 'increasing';
    if (diff < -5) return 'decreasing';
    return 'stable';
  }

  public stopMonitoring() {
    this.isMonitoring = false;
    
    // Clean up all listeners
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];

    if (this.config.debug) {
      console.log('🛑 Performance monitoring stopped');
    }
  }

  public createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'performance-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 200px;
      backdrop-filter: blur(10px);
    `;

    const updateOverlay = () => {
      if (!this.isMonitoring) return;

      overlay.innerHTML = `
        <div><strong>🚀 Performance Monitor</strong></div>
        <div>FPS: ${this.metrics.fps} (avg: ${this.metrics.averageFps})</div>
        <div>Memory: ${this.metrics.memoryUsage} MB</div>
        <div>Interaction: ${this.metrics.interactionLatency}ms</div>
        <div>Scroll: ${this.metrics.scrollPerformance}ms</div>
        <div>GPU: ${this.metrics.gpuAcceleration ? '✅' : '❌'}</div>
        <div>Network: ${this.metrics.networkSpeed}</div>
        ${this.metrics.batteryLevel ? `<div>Battery: ${this.metrics.batteryLevel}%</div>` : ''}
      `;

      setTimeout(updateOverlay, 1000);
    };

    updateOverlay();
    return overlay;
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(config: PerformanceConfig = {}) {
  const monitorRef = React.useRef<PerformanceMonitor | null>(null);
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);

  React.useEffect(() => {
    monitorRef.current = new PerformanceMonitor(config);
    monitorRef.current.startMonitoring();

    const interval = setInterval(() => {
      if (monitorRef.current) {
        setMetrics(monitorRef.current.getMetrics());
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (monitorRef.current) {
        monitorRef.current.stopMonitoring();
      }
    };
  }, [config]);

  const showOverlay = React.useCallback(() => {
    if (monitorRef.current) {
      const overlay = monitorRef.current.createOverlay();
      document.body.appendChild(overlay);
      
      return () => {
        const existingOverlay = document.getElementById('performance-overlay');
        if (existingOverlay) {
          document.body.removeChild(existingOverlay);
        }
      };
    }
    return undefined;
  }, []);

  const generateReport = React.useCallback(() => {
    return monitorRef.current?.generateReport() || '';
  }, []);

  return {
    metrics,
    showOverlay,
    generateReport
  };
}

export { PerformanceMonitor };
export default PerformanceMonitor;
