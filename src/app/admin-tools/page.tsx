"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Settings, Shield, AlertTriangle, UserCheck } from "lucide-react";
import Link from "next/link";

export default function AdminTools() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string>("");
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Check if user has permission
  const hasPermission = user && (user.role === "manager" || user.role === "admin");

  useEffect(() => {
    // Test Firebase availability
    const testFirebase = async () => {
      try {
        const { db } = await import("@/lib/firebase");
        if (db) {
          setFirebaseReady(true);
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          console.error("Firebase not ready:", error);
        }
        setResults("❌ Firebase connection failed. Please refresh the page.");
      }
    };
    
    if (hasPermission) {
      testFirebase();
    }
  }, [hasPermission]);

  const handleQuickFix = async () => {
    if (!hasPermission) {
      setResults("❌ Access denied. Admin/Manager role required.");
      return;
    }

    setIsLoading(true);
    setResults("Starting Tony Tiger lead fix...");
    
    try {
      setResults("Loading Firebase...");
      
      // Import Firebase dynamically
      const { db } = await import("@/lib/firebase");
      const { 
        collection, 
        query, 
        where, 
        getDocs, 
        doc, 
        updateDoc, 
        serverTimestamp 
      } = await import("firebase/firestore");
      
      setResults("✅ Firebase loaded. Searching for Tony Tiger lead...");
      
      // Search for Tony Tiger lead - try customer name first
      let customerQuery = query(
        collection(db, 'leads'),
        where('customerName', '==', 'Tony Tiger')
      );
      
      let snapshot = await getDocs(customerQuery);
      
      if (snapshot.empty) {
        setResults("No customer named Tony Tiger found. Searching assigned closers...");
        
        // Try searching by assigned closer name
        customerQuery = query(
          collection(db, 'leads'),
          where('assignedCloserName', '==', 'Tony Tiger')
        );
        
        snapshot = await getDocs(customerQuery);
      }
      
      if (snapshot.empty) {
        setResults("❌ No Tony Tiger lead found. Let me search all leads...");
        
        // Get all leads and search manually
        const allLeadsQuery = query(collection(db, 'leads'));
        const allSnapshot = await getDocs(allLeadsQuery);
        
        let resultText = `Found ${allSnapshot.size} total leads:\n\n`;
        let tonyFound = false;
        
        allSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const customer = data.customerName || 'No Name';
          const assigned = data.assignedCloserName || 'Unassigned';
          
          if (customer.toLowerCase().includes('tony') || 
              assigned.toLowerCase().includes('tony') ||
              customer.toLowerCase().includes('tiger') || 
              assigned.toLowerCase().includes('tiger')) {
            resultText += `🎯 MATCH: ${docSnap.id}\n`;
            resultText += `   Customer: ${customer}\n`;
            resultText += `   Assigned: ${assigned}\n`;
            resultText += `   Status: ${data.status}\n\n`;
            tonyFound = true;
          }
        });
        
        if (!tonyFound) {
          resultText += "\n❌ No leads found containing 'Tony' or 'Tiger'";
        }
        
        setResults(resultText);
        return;
      }
      
      let resultText = `Found ${snapshot.size} Tony Tiger lead(s):\n\n`;
      let updatedCount = 0;
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        resultText += `📋 Lead ID: ${docSnap.id}\n`;
        resultText += `👤 Customer: ${data.customerName}\n`;
        resultText += `🎯 Assigned to: ${data.assignedCloserName || 'Unassigned'}\n`;
        resultText += `📊 Status: ${data.status}\n`;
        resultText += `🕒 Created: ${data.createdAt?.toDate?.() || 'Unknown'}\n`;
        resultText += `---\n`;
        
        if (data.status === 'scheduled') {
          resultText += `🔄 Updating ${docSnap.id} from "scheduled" to "rescheduled"...\n`;
          
          await updateDoc(doc(db, 'leads', docSnap.id), {
            status: 'rescheduled',
            updatedAt: serverTimestamp(),
            statusChangeReason: 'Fixed icon color - lead was reassigned so should show rescheduled'
          });
          
          resultText += `✅ Updated successfully!\n`;
          updatedCount++;
        } else if (data.status === 'rescheduled') {
          resultText += `✅ Already marked as "rescheduled"\n`;
        } else {
          resultText += `ℹ️ Status is "${data.status}" - no update needed\n`;
        }
        
        resultText += `\n`;
      }
      
      if (updatedCount > 0) {
        resultText += `\n🎉 SUCCESS! Updated ${updatedCount} lead(s) to "rescheduled".\n`;
        resultText += `🎨 Tony Tiger's lead will now show a PURPLE rescheduled icon.\n`;
        resultText += `🔄 Refresh the dashboard to see changes.`;
      } else {
        resultText += `\n📝 No leads needed updating.`;
      }
      
      setResults(resultText);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error.stack || error.toString() : String(error);
      setResults(`❌ Error: ${errorMessage}\n\nFull error: ${errorDetails}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading if user is not loaded yet
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (!hasPermission) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This tool requires Manager or Admin role.</p>
            <p>Your current role: {user.role}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center justify-center gap-2">
          <Settings className="w-8 h-8" />
          Admin Tools
        </h1>
        <p className="text-[var(--text-secondary)]">System administration and maintenance tools</p>
      </div>

      {/* Permission Check */}
      {!hasPermission && (
        <Card className="frosted-glass-card border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Access Denied</h2>
            <p className="text-red-600 mb-4">You need Manager or Admin privileges to access these tools.</p>
            <Link href="/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {hasPermission && (
        <>
          {/* Admin Tool Cards */}
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3 mb-6">
            {/* Pending User Approval Card */}
            <Card className="frosted-glass-card hover:shadow-lg transition-all duration-300">
              <Link href="/admin-tools/pending-users">
                <CardContent className="p-6 flex flex-col items-center space-y-4 h-full">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                    <UserCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-center">Pending Users</h3>
                  <p className="text-sm text-center text-muted-foreground">
                    Review and approve new user signup requests
                  </p>
                </CardContent>
              </Link>
            </Card>

            {/* Team Initialization Card - Only for admins */}
            {user?.role === "admin" && (
              <Card className="frosted-glass-card hover:shadow-lg transition-all duration-300">
                <Link href="/dashboard/initialize-teams">
                  <CardContent className="p-6 flex flex-col items-center space-y-4 h-full">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <Settings className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-center">Team Setup</h3>
                    <p className="text-sm text-center text-muted-foreground">
                      Initialize required teams for the Empire region
                    </p>
                  </CardContent>
                </Link>
              </Card>
            )}

            {/* Tony Tiger Fix Card */}
            <Card className="frosted-glass-card hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 flex flex-col items-center space-y-4 h-full">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-center">Tony Tiger Fix</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Fix the Tony Tiger lead status in the database
                </p>
                <Button 
                  onClick={handleQuickFix}
                  disabled={isLoading || !firebaseReady}
                  className="w-full mt-auto"
                >
                  {isLoading ? "Working..." : "Run Fix"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tony Tiger Fix Results */}
          {results && (
            <Card className="max-w-4xl mx-auto frosted-glass-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Tony Tiger Fix Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">{results}</pre>
                </div>
                <div className="text-xs text-gray-500 border-t pt-4 mt-4">
                  <p><strong>Alternative method:</strong> You can also run the browser console script:</p>
                  <ol className="list-decimal ml-5 mt-1 space-y-1">
                    <li>Go to the dashboard page</li>
                    <li>Open Developer Tools (F12) → Console tab</li>
                    <li>Copy and paste the script from <code>/scripts/browser-fix-tony-tiger.js</code></li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}