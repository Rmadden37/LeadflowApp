/**
 * Firebase Connection Status Component
 * 
 * Provides visual feedback for Firebase connectivity issues and recovery actions
 * Implements iOS-native design patterns for seamless integration
 * 
 * @author Aurelian Salomon
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useFirebaseConnection } from '@/lib/firebase';
import { 
  getFirebaseConnectionManager, 
  getFirebaseInitializationState,
  forceFirebaseReconnect 
} from '@/lib/firebase-initializer';

interface FirebaseConnectionStatusProps {
  showWhenConnected?: boolean;
  className?: string;
  position?: 'top' | 'bottom';
}

export const FirebaseConnectionStatus: React.FC<FirebaseConnectionStatusProps> = ({
  showWhenConnected = false,
  className = '',
  position = 'top'
}) => {
  const { isConnected, isLoading } = useFirebaseConnection();
  const [initState, setInitState] = useState(getFirebaseInitializationState());
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastRetry, setLastRetry] = useState<Date | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setInitState(getFirebaseInitializationState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setLastRetry(new Date());
    
    try {
      await forceFirebaseReconnect();
    } catch (error) {
      console.error('Manual reconnection failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Don't show when connected unless explicitly requested
  if (isConnected && !showWhenConnected) {
    return null;
  }

  const getStatusColor = () => {
    if (isLoading || isRetrying) return 'bg-yellow-500';
    if (isConnected) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isRetrying) return 'Reconnecting...';
    if (isLoading) return 'Checking connection...';
    if (isConnected) return 'Connected to Firebase';
    return 'Connection issue detected';
  };

  const getActionButton = () => {
    if (isConnected || isLoading || isRetrying) return null;

    return (
      <button
        onClick={handleRetry}
        className="ml-3 px-3 py-1 bg-white/20 rounded-full text-xs font-medium hover:bg-white/30 transition-colors"
        disabled={isRetrying}
      >
        Retry
      </button>
    );
  };

  const positionClasses = position === 'top' 
    ? 'top-0 rounded-b-lg' 
    : 'bottom-0 rounded-t-lg';

  return (
    <div className={`
      fixed left-1/2 transform -translate-x-1/2 z-50
      ${positionClasses}
      ${getStatusColor()}
      text-white px-4 py-2 shadow-lg
      flex items-center justify-center
      min-w-64 max-w-sm
      transition-all duration-300 ease-in-out
      ${className}
    `}>
      <div className="flex items-center">
        {/* Status indicator */}
        <div className={`
          w-2 h-2 rounded-full mr-2
          ${isLoading || isRetrying ? 'animate-pulse bg-white/70' : 'bg-white'}
        `} />
        
        {/* Status text */}
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
        
        {/* Action button */}
        {getActionButton()}
      </div>
      
      {/* Error count indicator */}
      {initState.errors.length > 0 && (
        <div className="ml-3 px-2 py-0.5 bg-white/20 rounded-full text-xs">
          {initState.errors.length} errors
        </div>
      )}
      
      {/* Last retry indicator */}
      {lastRetry && (
        <div className="ml-2 text-xs opacity-70">
          Last retry: {lastRetry.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

/**
 * Firebase Debug Panel Component
 * 
 * Detailed debug information for development
 */
interface FirebaseDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseDebugPanel: React.FC<FirebaseDebugPanelProps> = ({
  isOpen,
  onClose
}) => {
  const { isConnected, isLoading } = useFirebaseConnection();
  const [initState, setInitState] = useState(getFirebaseInitializationState());
  const [connectionState, setConnectionState] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setInitState(getFirebaseInitializationState());
      
      const manager = getFirebaseConnectionManager();
      if (manager) {
        setConnectionState(manager.getConnectionState());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto m-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Firebase Debug Information</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Connection Status */}
          <div>
            <h4 className="font-medium mb-2">Connection Status</h4>
            <div className="bg-gray-100 p-3 rounded text-sm">
              <div>Connected: {isConnected ? '✅' : '❌'}</div>
              <div>Loading: {isLoading ? '⏳' : '✅'}</div>
            </div>
          </div>
          
          {/* Initialization State */}
          <div>
            <h4 className="font-medium mb-2">Initialization State</h4>
            <div className="bg-gray-100 p-3 rounded text-sm">
              <div>Initialized: {initState.isInitialized ? '✅' : '❌'}</div>
              <div>Connection Manager: {initState.hasConnectionManager ? '✅' : '❌'}</div>
              <div>Messaging Manager: {initState.hasMessagingManager ? '✅' : '❌'}</div>
              <div>Last Init: {initState.lastInitialization?.toLocaleString() || 'Never'}</div>
            </div>
          </div>
          
          {/* Connection Manager State */}
          {connectionState && (
            <div>
              <h4 className="font-medium mb-2">Connection Manager</h4>
              <div className="bg-gray-100 p-3 rounded text-sm">
                <div>Online: {connectionState.isOnline ? '✅' : '❌'}</div>
                <div>Firestore Online: {connectionState.isFirestoreOnline ? '✅' : '❌'}</div>
                <div>Reconnect Attempts: {connectionState.reconnectAttempts}</div>
                <div>Last Disconnect: {connectionState.lastDisconnect?.toLocaleString() || 'Never'}</div>
              </div>
            </div>
          )}
          
          {/* Recent Errors */}
          {initState.errors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Recent Errors ({initState.errors.length})</h4>
              <div className="bg-gray-100 p-3 rounded text-sm max-h-32 overflow-y-auto">
                {initState.errors.slice(-5).map((error, index) => (
                  <div key={index} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                    <div className="font-medium text-red-600">{error.component}</div>
                    <div className="text-gray-600">{error.error}</div>
                    <div className="text-xs text-gray-500">{error.timestamp.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for Firebase connection monitoring
 */
export const useFirebaseStatus = () => {
  const { isConnected, isLoading } = useFirebaseConnection();
  const [initState, setInitState] = useState(getFirebaseInitializationState());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setInitState(getFirebaseInitializationState());
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    isConnected,
    isLoading,
    isInitialized: initState.isInitialized,
    hasErrors: initState.errors.length > 0,
    errorCount: initState.errors.length,
    lastError: initState.errors[initState.errors.length - 1] || null
  };
};
