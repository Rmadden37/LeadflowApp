"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import CreateLeadFormEnhanced from "@/components/dashboard/create-lead-form-enhanced";
import { useToast } from "@/hooks/use-toast";

export default function CreateLeadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Check user permissions
  const canCreateLeads = user?.role === "setter" || user?.role === "manager" || user?.role === "admin";

  if (!user) {
    return null; // Layout handles redirect
  }

  if (!canCreateLeads) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                You don't have permission to create leads. Only setters, managers, and admins can create new leads.
              </p>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleFormClose = () => {
    setIsFormOpen(false);
    // Navigate back to dashboard when form is closed
    router.push("/dashboard");
  };

  const handleFormSuccess = () => {
    // Show success message and navigate back
    toast({
      title: "Lead Created Successfully",
      description: "The new lead has been added to the system.",
    });
    router.push("/dashboard");
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline text-gray-900 dark:text-white">
            Create New Lead
          </h1>
          <p className="text-muted-foreground">
            Add a new lead to your team's pipeline
          </p>
        </div>
      </div>

      {/* Create Lead Card */}
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <Plus className="h-6 w-6 text-primary" />
            Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateLeadFormEnhanced 
            isOpen={true} 
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
            embedded={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
