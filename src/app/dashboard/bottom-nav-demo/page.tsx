"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Tablet,
  Monitor,
  Users,
  MessageCircle,
  Star,
  Plus
} from "lucide-react";

export default function BottomNavDemo() {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bottom Navigation Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Experience the new iOS-inspired bottom navigation designed by Aurelian Salomon. 
          Perfect thumb-friendly navigation for mobile users.
        </p>
        <Badge variant="secondary" className="text-xs">
          iOS Design Standards • Mobile-First • Accessible
        </Badge>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('mobile')}
            className="flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Mobile View
          </Button>
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('desktop')}
            className="flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            Desktop View
          </Button>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Mobile-First Design
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bottom navigation appears only on mobile devices, providing easy thumb access to primary functions.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• 44px minimum touch targets</li>
              <li>• iOS-style haptic feedback</li>
              <li>• Safe area support</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Role-Based Navigation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manager Tools tab only appears for users with manager or admin permissions.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Dynamic based on user role</li>
              <li>• Admin tools for administrators</li>
              <li>• Clean, contextual access</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-600" />
              Floating Team Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Always-accessible team chat button with unread message badges and strong haptic feedback.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Cross-context availability</li>
              <li>• Notification badges</li>
              <li>• Fixed positioning</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-600" />
              Create Lead CTA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Prominent floating "Create New Lead" button appears on dashboard for easy access to lead creation.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Center floating button</li>
              <li>• Dashboard-only visibility</li>
              <li>• Strong haptic feedback</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              Glass Morphism
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Beautiful backdrop blur effects and translucent surfaces create depth and modern aesthetics.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Backdrop blur support</li>
              <li>• Dark mode optimized</li>
              <li>• Native iOS feel</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-indigo-600" />
              Responsive Design
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Seamlessly switches between bottom navigation (mobile) and sidebar (desktop) based on screen size.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Automatic detection</li>
              <li>• Optimized for each platform</li>
              <li>• Consistent experience</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Implementation Notes */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            Aurelian Salomon Design Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h4>Navigation Structure:</h4>
            <ul className="text-sm space-y-1">
              <li><strong>Dashboard:</strong> Primary landing with floating Create Lead button</li>
              <li><strong>Leaderboard:</strong> Gamification and performance metrics</li>
              <li><strong>Manager Tools:</strong> Role-based access (Lead History, Teams, Analytics)</li>
              <li><strong>Profile:</strong> User settings + Admin Tools for administrators</li>
            </ul>
            
            <h4>Interaction Patterns:</h4>
            <ul className="text-sm space-y-1">
              <li><strong>Haptic Feedback:</strong> Light for navigation, medium for chat/create actions</li>
              <li><strong>Visual Feedback:</strong> Active states with iOS blue (#007AFF)</li>
              <li><strong>Touch Targets:</strong> Minimum 56px height for comfortable tapping</li>
              <li><strong>Safe Areas:</strong> Proper spacing for devices with home indicators</li>
              <li><strong>Floating Actions:</strong> Chat (right) and Create Lead (center) buttons</li>
            </ul>
          </div>
          
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              "Great mobile navigation disappears into the background, letting users focus 
              on their tasks while always knowing how to get where they need to go." - Aurelian Salomon
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          To experience the bottom navigation, resize your browser to mobile width 
          or visit this page on a mobile device.
        </p>
        <p className="text-xs text-gray-500">
          Navigation automatically switches based on screen size detection.
        </p>
      </div>
    </div>
  );
}
