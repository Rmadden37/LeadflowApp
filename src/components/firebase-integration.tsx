/**
 * Firebase Integration Component
 * 
 * Demonstrates how to integrate the Firebase error resolution system
 * into your React application with iOS-native design principles
 * 
 * @author Aurelian Salomon
 */

'use client';

import React, { useEffect, useState } from 'react';
import { 
  initializeFirebase,
  requestFirebaseNotificationPermission,
  getFirebaseFCMToken,
  addFirebaseMessageListener,
  debugFirebase,
  getFirebaseInitializationState
} from '@/lib/firebase-initializer';
import { FirebaseConnectionStatus, useFirebaseStatus } from '@/components/firebase-connection-status';
import { useFirebaseConnection } from '@/lib/firebase';

interface FirebaseIntegrationProps {
  userId?: string;
  onTokenReceived?: (token: string) => void;
  onMessageReceived?: (payload: any) => void;
  showDebugPanel?: boolean;
}

export const FirebaseIntegration: React.FC<FirebaseIntegrationProps> = ({
  userId,
  onTokenReceived,
  onMessageReceived,
  showDebugPanel = false
}) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  
  const { isConnected, isLoading } = useFirebaseConnection();
  const { hasErrors, errorCount, lastError } = useFirebaseStatus();

  useEffect(() => {
    const initializeFirebaseServices = async () => {
      try {
        console.log('🔄 Initializing Firebase services...');
        await initializeFirebase();
        
        // Check notification permission
        if ('Notification' in window) {
          setNotificationPermission(Notification.permission);
        }
        
        console.log('✅ Firebase services initialized');
      } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeFirebaseServices();
  }, []);

  useEffect(() => {
    if (!userId || isInitializing) return;

    let unsubscribeFunction: (() => void) | null = null;

    const setupMessaging = async () => {
      try {
        // Request notification permission if needed
        const permission = await requestFirebaseNotificationPermission();
        setNotificationPermission(permission);

        if (permission === 'granted') {
          // Get FCM token
          const token = await getFirebaseFCMToken();
          if (token) {
            setFcmToken(token);
            onTokenReceived?.(token);
            console.log('✅ FCM token obtained and stored');
          }

          // Add message listener
          const unsubscribe = addFirebaseMessageListener((payload) => {
            console.log('📱 Foreground message received:', payload);
            onMessageReceived?.(payload);
            
            // Show in-app notification for iOS-like experience
            if (payload.notification) {
              showInAppNotification(payload.notification.title, payload.notification.body);
            }
          });

          // Store unsubscribe function for cleanup
          if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribeFunction = unsubscribe;
          }
        }
      } catch (error) {
        console.error('❌ Failed to setup Firebase messaging:', error);
      }
    };

    // Execute async setup
    setupMessaging();
    
    // Return cleanup function
    return () => {
      if (unsubscribeFunction && typeof unsubscribeFunction === 'function') {
        unsubscribeFunction();
      }
    };
  }, [userId, isInitializing, onTokenReceived, onMessageReceived]);

  const showInAppNotification = (title: string, body: string) => {
    // iOS-style in-app notification
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 left-1/2 transform -translate-x-1/2 z-50
      bg-white/90 backdrop-blur-xl border border-gray-200/50
      rounded-2xl shadow-lg p-4 max-w-sm w-full mx-4
      animate-slide-down
    `;
    
    notification.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L3 9h4v7h6V9h4l-7-7z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">${title}</p>
          <p class="text-xs text-gray-500 mt-1">${body}</p>
        </div>
        <button class="text-gray-400 hover:text-gray-600 flex-shrink-0" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds with iOS-style fade out
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(-50%) translateY(-20px)';
      
      setTimeout(() => {
        if (notification.parentElement) {
          notification.parentElement.removeChild(notification);
        }
      }, 300);
    }, 5000);
  };

  const requestNotificationPermission = async () => {
    const permission = await requestFirebaseNotificationPermission();
    setNotificationPermission(permission);
  };

  const handleDebugClick = async () => {
    await debugFirebase();
    setDebugPanelOpen(true);
  };

  if (isInitializing) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Initializing Firebase...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <FirebaseConnectionStatus position="top" />

      {/* Firebase Status Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Firebase Status</h3>
          {showDebugPanel && (
            <button
              onClick={handleDebugClick}
              className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Debug
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Connection Status */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">Connection</span>
            </div>
            <p className="text-xs text-gray-500">
              {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>

          {/* Error Status */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${hasErrors ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span className="text-sm font-medium">Errors</span>
            </div>
            <p className="text-xs text-gray-500">
              {hasErrors ? `${errorCount} errors` : 'No errors'}
            </p>
          </div>

          {/* Notification Permission */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                notificationPermission === 'granted' ? 'bg-green-500' : 
                notificationPermission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm font-medium">Notifications</span>
            </div>
            <p className="text-xs text-gray-500">
              {notificationPermission === 'granted' ? 'Enabled' : 
               notificationPermission === 'denied' ? 'Blocked' : 'Not requested'}
            </p>
          </div>

          {/* FCM Token */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${fcmToken ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">FCM Token</span>
            </div>
            <p className="text-xs text-gray-500">
              {fcmToken ? 'Available' : 'Not available'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {notificationPermission !== 'granted' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={requestNotificationPermission}
              className="w-full bg-blue-500 text-white rounded-xl py-2 px-4 text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Enable Notifications
            </button>
          </div>
        )}

        {/* Last Error Display */}
        {lastError && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <div className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-800">
                    {lastError.component}: {lastError.error}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {lastError.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// CSS for animations (add to your global CSS)
export const FirebaseIntegrationStyles = `
  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
  }
`;

export default FirebaseIntegration;
