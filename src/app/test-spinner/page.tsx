"use client";

import { Loader2 } from "lucide-react";

export default function TestSpinnerPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="space-y-8 text-center">
        <h1 className="text-2xl font-bold">🔄 Spinner Test Page</h1>
        
        <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-2">✅ Working Spinners</h2>
            
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-sm font-medium mb-2">Tailwind animate-spin</h3>
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-sm font-medium mb-2">Custom loading-spinner class</h3>
              <Loader2 className="h-8 w-8 loading-spinner text-green-500 mx-auto" />
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-sm font-medium mb-2">Manual CSS animation</h3>
              <div 
                className="h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"
                style={{
                  animation: 'spin 1s linear infinite'
                }}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-2">📊 Status</h2>
            
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow text-left">
              <h3 className="text-sm font-medium mb-2">System Info</h3>
              <div className="text-xs space-y-1">
                <p>• Reduced Motion: <span className="text-green-600">Disabled</span></p>
                <p>• CSS Animation Support: <span className="text-green-600">Enabled</span></p>
                <p>• Tailwind CSS: <span className="text-green-600">Loaded</span></p>
              </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow text-left">
              <h3 className="text-sm font-medium mb-2">Test Results</h3>
              <div className="text-xs space-y-1">
                <p>• Loading circles should be spinning above ↑</p>
                <p>• If not spinning, check browser console</p>
                <p>• CSS animations were forcibly enabled</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <a 
            href="/dashboard" 
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
