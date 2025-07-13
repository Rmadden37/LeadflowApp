"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import CreateLeadFormNoJump from "@/components/dashboard/create-lead-form-no-jump";
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
      <div className="min-h-screen dashboard-safe-content ios-optimized flex items-center justify-center">
        <div className="max-w-lg mx-auto frosted-glass-card p-8 rounded-xl text-center">
          <h2 className="text-xl font-semibold text-white mb-4">Access Denied</h2>
          <p className="text-white/70 mb-6">
            You don't have permission to create leads. Only setters, managers, and admins can create new leads.
          </p>
          <Button 
            onClick={() => router.back()} 
            variant="outline"
            className="frosted-glass-card border-white/20 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
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
    <div className="min-h-screen dashboard-safe-content ios-optimized" data-route="create-lead">
      {/* Header with dark theme - removed back button */}
      <div className="mb-6 p-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline text-white">
          Create New Lead
        </h1>
        <p className="text-white/70">
          Add a new lead to your team's pipeline
        </p>
      </div>

      {/* Create Lead Card with dark frosted glass styling */}
      <div className="px-6 pb-6">
        <div className="max-w-2xl mx-auto frosted-glass-card p-6 rounded-xl" style={{ background: 'rgba(30, 30, 30, 0.8)' }}>
          <div className="text-center mb-6">
            <h2 className="flex items-center justify-center gap-2 text-xl font-semibold text-white">
              <Plus className="h-6 w-6 text-[#007AFF]" />
              Lead Information
            </h2>
          </div>
          <CreateLeadFormNoJump 
            isOpen={true} 
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
            embedded={true}
          />
        </div>
      </div>
    </div>
  );
}
