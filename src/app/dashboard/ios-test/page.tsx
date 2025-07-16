"use client";

import React, { useState } from 'react';
import { IOSToggle } from '@/components/ui/ios-toggle';
import { PushNotificationManager } from '@/components/pwa-push-notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

export default function IOSTestPage() {
  const { user } = useAuth();
  const [toggle1, setToggle1] = useState(false);
  const [toggle2, setToggle2] = useState(true);
  const [toggle3, setToggle3] = useState(false);
  const [disabledToggle, setDisabledToggle] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8 text-center">
          iOS Toggle & PWA Test Page
        </h1>

        {/* iOS Toggle Testing */}
        <Card className="frosted-glass-card border border-[var(--glass-border)]">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">iOS-Style Toggle Switches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Toggle 1 - Off State */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-[var(--glass-border)]">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Basic Toggle (Off)</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Status: {toggle1 ? 'On' : 'Off'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={toggle1 ? "default" : "secondary"}>
                  {toggle1 ? 'Active' : 'Inactive'}
                </Badge>
                <IOSToggle
                  checked={toggle1}
                  onChange={setToggle1}
                />
              </div>
            </div>

            {/* Toggle 2 - On State */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-[var(--glass-border)]">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Basic Toggle (On)</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Status: {toggle2 ? 'On' : 'Off'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={toggle2 ? "default" : "secondary"}>
                  {toggle2 ? 'Active' : 'Inactive'}
                </Badge>
                <IOSToggle
                  checked={toggle2}
                  onChange={setToggle2}
                />
              </div>
            </div>

            {/* Toggle 3 - Interactive Test */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-[var(--glass-border)]">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Interactive Test</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Click the toggle or the button to test interaction
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setToggle3(!toggle3)}
                  className="text-[var(--text-primary)] border-[var(--glass-border)]"
                >
                  {toggle3 ? 'Turn Off' : 'Turn On'}
                </Button>
                <IOSToggle
                  checked={toggle3}
                  onChange={setToggle3}
                />
              </div>
            </div>

            {/* Disabled Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-[var(--glass-border)] opacity-60">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Disabled Toggle</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  This toggle is disabled and cannot be changed
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">Disabled</Badge>
                <IOSToggle
                  checked={disabledToggle}
                  onChange={setDisabledToggle}
                  disabled={true}
                />
              </div>
            </div>

            {/* Toggle States Demo */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-green-500/10 border border-[var(--glass-border)]">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Visual States</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-[var(--text-secondary)] mb-2">OFF State</p>
                  <IOSToggle checked={false} onChange={() => {}} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-[var(--text-secondary)] mb-2">ON State</p>
                  <IOSToggle checked={true} onChange={() => {}} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Notifications Testing */}
        <PushNotificationManager showSetupCard={true} autoRequestPermission={false} />

        {/* User Info for Testing */}
        {user && (
          <Card className="frosted-glass-card border border-[var(--glass-border)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-primary)]">Current User Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>UID:</strong> {user.uid}</p>
                <p><strong>Team ID:</strong> {user.teamId || 'Not assigned'}</p>
                <p><strong>Display Name:</strong> {user.displayName || 'Not set'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white"
          >
            Back to Dashboard
          </Button>
          <Button 
            onClick={() => {
              setToggle1(!toggle1);
              setToggle2(!toggle2);
              setToggle3(!toggle3);
            }}
            variant="outline"
            className="border-[var(--glass-border)] text-[var(--text-primary)]"
          >
            Toggle All
          </Button>
        </div>
      </div>
    </div>
  );
}
