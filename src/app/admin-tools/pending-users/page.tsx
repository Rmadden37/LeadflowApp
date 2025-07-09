"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, UserCheck, AlertCircle } from "lucide-react";
import { AppUser } from "@/types";
import AuthenticatedLayoutWrapper from "@/components/authenticated-layout-wrapper";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface PendingUser extends AppUser {
  [x: string]: any;
  id: string;
}

export default function PendingUsersPage() {
  const { user, loading, role } = useAuth();
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [approvingUser, setApprovingUser] = useState<string | null>(null);

  // Function to fetch pending users
  const fetchPendingUsers = async () => {
    try {
      setLoadingUsers(true);
      const pendingQuery = query(
        collection(db, "users"),
        where("isPendingApproval", "==", true)
      );

      const querySnapshot = await getDocs(pendingQuery);
      const users: PendingUser[] = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data() as AppUser;
        users.push({ ...userData, id: doc.id });
      });

      setPendingUsers(users);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      toast({
        title: "Error",
        description: "Failed to load pending users.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Approve a user
  const handleApproveUser = async (userId: string) => {
    try {
      setApprovingUser(userId);
      const approveUserFn = httpsCallable(functions, "approveUser");
      await approveUserFn({ userId });

      toast({
        title: "Success",
        description: "User has been approved successfully.",
      });

      // Refresh the pending users list
      fetchPendingUsers();
    } catch (error: any) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve user.",
        variant: "destructive",
      });
    } finally {
      setApprovingUser(null);
    }
  };

  // Load pending users when the component mounts
  useEffect(() => {
    if (user && (role === "admin" || role === "manager")) {
      fetchPendingUsers();
    }
  }, [user, role]);

  // If not logged in or loading, show loading spinner
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not an admin or manager, show access denied
  if (role !== "admin" && role !== "manager") {
    return (
      <AuthenticatedLayoutWrapper>
        <div className="container max-w-6xl py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to view this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Only managers and administrators can approve new users.</p>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayoutWrapper>
    );
  }

  return (
    <AuthenticatedLayoutWrapper>
      <div className="container max-w-6xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center gap-2">
              <UserCheck className="h-6 w-6" />
              Pending User Approval
            </CardTitle>
            <CardDescription>
              Review and approve new users who have signed up to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Signup Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((pendingUser) => (
                      <TableRow key={pendingUser.id}>
                        <TableCell className="font-medium">
                          {pendingUser.displayName}
                        </TableCell>
                        <TableCell>{pendingUser.email}</TableCell>
                        <TableCell>
                          <Badge variant={pendingUser.role === "closer" ? "default" : "secondary"}>
                            {pendingUser.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{pendingUser.phoneNumber}</TableCell>
                        <TableCell>
                          {pendingUser.createdAt 
                            ? formatDistanceToNow(new Date(pendingUser.createdAt.seconds * 1000), { addSuffix: true }) 
                            : "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleApproveUser(pendingUser.id)}
                            disabled={approvingUser === pendingUser.id}
                            size="sm"
                          >
                            {approvingUser === pendingUser.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-lg font-medium">No pending users</p>
                <p className="text-sm text-muted-foreground">
                  There are currently no users waiting for approval.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayoutWrapper>
  );
}
