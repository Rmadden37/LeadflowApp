"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initializeTeams, getAllTeams, type Team } from "@/utils/init-teams";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

export default function InitTeamsComponent() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load existing teams on mount
  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true);
      try {
        const teamsData = await getAllTeams();
        setTeams(teamsData);
      } catch (error) {
        console.error("Error loading teams:", error);
        toast({
          title: "Error",
          description: "Failed to load teams. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [toast]);

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await initializeTeams();
      
      // Reload teams after initialization
      const updatedTeams = await getAllTeams();
      setTeams(updatedTeams);
      
      toast({
        title: "Success",
        description: "Teams have been initialized successfully!",
      });
    } catch (error: any) {
      console.error("Error initializing teams:", error);
      toast({
        title: "Error",
        description: `Failed to initialize teams: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Team Configuration</CardTitle>
        <CardDescription>
          Ensure required Empire region teams are available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Teams List */}
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-semibold">Current Teams:</h3>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : teams.length > 0 ? (
            <div className="border rounded-md p-3 space-y-2 bg-muted/30">
              {teams.map(team => (
                <div key={team.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{team.name}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({team.regionId} region)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No teams found</p>
          )}
        </div>
        
        <Button 
          onClick={handleInitialize} 
          disabled={isInitializing}
          className="w-full"
        >
          {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {teams.length === 0 ? "Initialize Teams" : "Reset Teams"}
        </Button>
      </CardContent>
    </Card>
  );
}
