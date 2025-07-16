/**
 * Admin Organization Switcher
 * 
 * Allows admins to switch between different organizational levels:
 * - Companies
 * - Regions 
 * - Teams
 * 
 * This component provides a hierarchical view and switching capability
 * for admins to manage different parts of the organization.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  MapPin, 
  Users, 
  Crown, 
  ChevronRight,
  Globe,
  Loader2,
  Check,
  AlertCircle
} from "lucide-react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  getDocs 
} from "firebase/firestore";

interface Company {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface Region {
  id: string;
  name: string;
  description: string;
  companyId?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface Team {
  id: string;
  name: string;
  description: string;
  regionId: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  settings?: {
    autoAssignment?: boolean;
    maxLeadsPerCloser?: number;
    workingHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
}

interface OrganizationContext {
  selectedCompany?: Company;
  selectedRegion?: Region;
  selectedTeam?: Team;
  level: 'company' | 'region' | 'team';
}

export default function AdminOrganizationSwitcher() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for organizational data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Current selections
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [currentLevel, setCurrentLevel] = useState<'company' | 'region' | 'team'>('company');

  // Statistics
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalRegions: 0,
    totalTeams: 0,
    totalUsers: 0
  });

  // Load organizational data
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load companies (simulate for now)
        const mockCompanies: Company[] = [
          {
            id: "leadflow-corp",
            name: "LeadFlow Corporation",
            description: "Primary company organization",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        setCompanies(mockCompanies);

        // Load regions
        const regionsQuery = query(
          collection(db, "regions"),
          orderBy("name", "asc")
        );
        
        const regionsUnsubscribe = onSnapshot(regionsQuery, (snapshot) => {
          const regionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Region[];
          setRegions(regionsData);
        });

        // Load teams
        const teamsQuery = query(
          collection(db, "teams"),
          orderBy("name", "asc")
        );
        
        const teamsUnsubscribe = onSnapshot(teamsQuery, (snapshot) => {
          const teamsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Team[];
          setTeams(teamsData);
        });

        // Load statistics
        await loadStatistics();

        // Set default selections
        if (mockCompanies.length > 0) {
          setSelectedCompanyId(mockCompanies[0].id);
        }

        setLoading(false);

        return () => {
          regionsUnsubscribe();
          teamsUnsubscribe();
        };
      } catch (error) {
        console.error("Error loading organizational data:", error);
        toast({
          title: "Error",
          description: "Failed to load organizational data",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    loadData();
  }, [user, toast]);

  // Load statistics
  const loadStatistics = async () => {
    try {
      const [usersSnapshot, regionsSnapshot, teamsSnapshot] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "regions")),
        getDocs(collection(db, "teams"))
      ]);

      setStats({
        totalCompanies: companies.length || 1, // Mock for now
        totalRegions: regionsSnapshot.size,
        totalTeams: teamsSnapshot.size,
        totalUsers: usersSnapshot.size
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  // Handle level switching
  const handleLevelSwitch = async (level: 'company' | 'region' | 'team') => {
    setCurrentLevel(level);
    
    // Clear lower level selections when switching to higher level
    if (level === 'company') {
      setSelectedRegionId("");
      setSelectedTeamId("");
    } else if (level === 'region') {
      setSelectedTeamId("");
    }

    // Update context
    updateContext(level);
  };

  // Handle company selection
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedRegionId("");
    setSelectedTeamId("");
    updateContext('company');
  };

  // Handle region selection
  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    setSelectedTeamId("");
    setCurrentLevel('region');
    updateContext('region');
  };

  // Handle team selection
  const handleTeamChange = async (teamId: string) => {
    setUpdating(true);
    try {
      setSelectedTeamId(teamId);
      setCurrentLevel('team');
      
      // Update user's current team context (optional - for admin switching)
      if (user && teamId) {
        await updateDoc(doc(db, "users", user.uid), {
          currentAdminContext: {
            level: 'team',
            teamId: teamId,
            updatedAt: new Date()
          }
        });
      }

      updateContext('team');
      
      toast({
        title: "Context Switched",
        description: `Now viewing ${teams.find(t => t.id === teamId)?.name || 'selected team'}`,
      });
    } catch (error) {
      console.error("Error switching team context:", error);
      toast({
        title: "Error",
        description: "Failed to switch team context",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  // Update context for future use (could be stored in localStorage or state management)
  const updateContext = (level: 'company' | 'region' | 'team') => {
    const context: OrganizationContext = {
      level,
      selectedCompany: companies.find(c => c.id === selectedCompanyId),
      selectedRegion: regions.find(r => r.id === selectedRegionId),
      selectedTeam: teams.find(t => t.id === selectedTeamId)
    };

    // Store in localStorage for persistence
    localStorage.setItem('adminContext', JSON.stringify(context));
  };

  // Filter teams by selected region
  const filteredTeams = selectedRegionId 
    ? teams.filter(team => team.regionId === selectedRegionId)
    : teams;

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading organizational data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <CardTitle>Admin Organization Switcher</CardTitle>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)} Level
            </Badge>
          </div>
          <CardDescription>
            Switch between different organizational levels to manage companies, regions, and teams
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organization Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCompanies}</div>
              <div className="text-xs text-muted-foreground">Companies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalRegions}</div>
              <div className="text-xs text-muted-foreground">Regions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalTeams}</div>
              <div className="text-xs text-muted-foreground">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.totalUsers}</div>
              <div className="text-xs text-muted-foreground">Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Select Management Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={currentLevel === 'company' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLevelSwitch('company')}
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              Company
              {currentLevel === 'company' && <Check className="h-3 w-3" />}
            </Button>
            <Button
              variant={currentLevel === 'region' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLevelSwitch('region')}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              Region
              {currentLevel === 'region' && <Check className="h-3 w-3" />}
            </Button>
            <Button
              variant={currentLevel === 'team' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLevelSwitch('team')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Team
              {currentLevel === 'team' && <Check className="h-3 w-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchical Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Organization Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Company
            </label>
            <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center gap-2">
                      <span>{company.name}</span>
                      {company.isActive && <Badge variant="secondary" className="text-xs">Active</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region Selection */}
          {(currentLevel === 'region' || currentLevel === 'team') && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ChevronRight className="h-3 w-3" />
                <MapPin className="h-4 w-4 text-green-500" />
                Region
              </label>
              <Select value={selectedRegionId} onValueChange={handleRegionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.filter(r => r.isActive).map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      <div className="flex items-center gap-2">
                        <span>{region.name}</span>
                        <Badge variant="outline" className="text-xs">{region.description}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Team Selection */}
          {currentLevel === 'team' && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <ChevronRight className="h-3 w-3" />
                <ChevronRight className="h-3 w-3" />
                <Users className="h-4 w-4 text-purple-500" />
                Team
              </label>
              <Select 
                value={selectedTeamId} 
                onValueChange={handleTeamChange}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTeams.filter(t => t.isActive).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <span>{team.name}</span>
                        <Badge variant="outline" className="text-xs">{team.description}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updating && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Switching context...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Selection Summary */}
      {(selectedCompanyId || selectedRegionId || selectedTeamId) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Current Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedCompanyId && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Company:</span>
                  <span>{companies.find(c => c.id === selectedCompanyId)?.name}</span>
                </div>
              )}
              {selectedRegionId && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Region:</span>
                  <span>{regions.find(r => r.id === selectedRegionId)?.name}</span>
                </div>
              )}
              {selectedTeamId && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Team:</span>
                  <span>{teams.find(t => t.id === selectedTeamId)?.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning for team context */}
      {currentLevel === 'team' && selectedTeamId && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Team Context Active</p>
                <p className="text-yellow-700">
                  You are now viewing and managing the {teams.find(t => t.id === selectedTeamId)?.name} team. 
                  All admin actions will be scoped to this team unless changed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
