"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, ArrowRight, Shield } from "lucide-react";

export default function QuickAnswerPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Quick Answer</h1>
        <p className="text-[var(--text-secondary)]">Team Status Investigation Tools</p>
      </div>

      <Card className="frosted-glass-card">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Users className="w-6 h-6" />
            Richard Niger & Marcelo Guerra Team Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Authenticated Access Available
              </h3>
              <p className="mb-4">You're logged in as <strong>{user.email}</strong>. You can now access team data to investigate team assignments.</p>
              
              <div className="grid gap-3">
                <Link href="/dashboard" className="w-full">
                  <Button className="w-full justify-between">
                    Main Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                
                {(user.role === "admin" || user.role === "manager") && (
                  <Link href="/dashboard/admin-tools" className="w-full">
                    <Button variant="outline" className="w-full justify-between">
                      Admin Tools - Team Management
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h2 className="text-xl font-bold mb-2">Investigation Methods Available:</h2>
              <div className="space-y-2">
                <p>• <Link href="/dashboard" className="text-blue-600 underline">Dashboard</Link> - Main application view</p>
                <p>• <Link href="/dashboard/admin-tools" className="text-blue-600 underline">Admin Tools</Link> - Team management for admins</p>
                <p>• <Link href="/login" className="text-blue-600 underline">Login</Link> - Authenticate to access team data</p>
              </div>
            </div>
          )}
          
          <div className="bg-amber-50 border border-amber-200 rounded p-4">
            <h3 className="font-bold mb-2">Investigation Process:</h3>
            <p>To determine if Richard Niger and Marcelo Guerra are on the same team:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              {!user && <li>Authenticate with the application</li>}
              <li>Query the Firestore database for both team members</li>
              <li>Compare their team IDs</li>
              <li>Review team assignments and roles</li>
            </ol>
          </div>
          
          {!user && (
            <div className="text-center">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Login to Investigate
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
