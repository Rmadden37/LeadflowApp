"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Users, ClipboardList, BarChart3, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ManagerToolsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect non-managers
  useEffect(() => {
    if (user && user.role !== 'manager' && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
    return null;
  }

  const managerSections = [
    { 
      id: 'lead-history', 
      title: 'Lead History', 
      description: 'View and manage all lead activity and interactions',
      icon: ClipboardList, 
      href: '/dashboard/lead-history',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
    },
    { 
      id: 'manage-teams', 
      title: 'Manage Teams', 
      description: 'Organize team members and manage assignments',
      icon: Users, 
      href: '/dashboard/manage-teams',
      color: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
    },
    { 
      id: 'analytics', 
      title: 'Performance Analytics', 
      description: 'Comprehensive performance insights and reporting',
      icon: BarChart3, 
      href: '/dashboard/performance-analytics',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    }
  ];

  const handleSectionClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manager Tools
          </h1>
          <Badge variant="secondary" className="text-xs">
            {user.role === 'admin' ? 'Administrator' : 'Manager'}
          </Badge>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Access powerful tools to manage your team and analyze performance
        </p>
      </div>
      
      {/* Manager Tools Grid */}
      <div className="grid grid-cols-1 gap-4">
        {managerSections.map((section) => {
          const Icon = section.icon;
          
          return (
            <Card 
              key={section.id} 
              className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => handleSectionClick(section.href)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-xl ${section.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {section.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {section.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/lead-history')}
          >
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-5 h-5 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Recent Leads</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/performance-analytics')}
          >
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-5 h-5 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">Today's Stats</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
