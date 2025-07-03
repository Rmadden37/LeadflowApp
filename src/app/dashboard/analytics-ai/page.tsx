"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Sparkles } from "lucide-react";
import BotChat from "@/components/dashboard/bot-chat";
import { Button } from "@/components/ui/button";

export default function AnalyticsAIPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics AI Assistant</h1>
          <p className="text-muted-foreground">
            Your intelligent guide to sales insights and data analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <Sparkles className="h-4 w-4 text-blue-700 dark:text-blue-300" />
        </div>
      </div>

      {/* Main AI Assistant Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-2 border-blue-200 dark:border-blue-500/30 dark:card-glass">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-200 to-indigo-300 dark:from-blue-800/20 dark:to-indigo-800/30 flex items-center justify-center border-4 border-blue-300 dark:border-blue-500/50 shadow-lg">
                <Brain className="h-10 w-10 text-blue-700 dark:text-blue-400" />
              </div>
              <Sparkles className="h-6 w-6 text-blue-700 dark:text-blue-300 absolute -top-2 -right-2" />
            </div>
          </div>
          <CardTitle className="text-2xl text-blue-900 dark:text-blue-300">
            LeadFlow Analytics Assistant
          </CardTitle>
          <p className="text-blue-700 dark:text-gray-300">
            Your intelligent analytics assistant, ready to provide insights with advanced AI
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-white/20 dark:bg-slate-800/30 rounded-lg">
              <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">Smart Analytics</h3>
              <p className="text-blue-600 dark:text-gray-400">AI-powered insights from your sales data</p>
            </div>
            <div className="p-4 bg-white/20 dark:bg-slate-800/30 rounded-lg">
              <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">Data Visualization</h3>
              <p className="text-blue-600 dark:text-gray-400">Dynamic charts and graphs on demand</p>
            </div>
            <div className="p-4 bg-white/20 dark:bg-slate-800/30 rounded-lg">
              <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">Strategic Insights</h3>
              <p className="text-blue-600 dark:text-gray-400">Advanced recommendations and analysis</p>
            </div>
          </div>
          
          <Button 
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Brain className="mr-2 h-5 w-5" />
            Start Analytics Chat
          </Button>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              What the AI Can Help With
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                Top performer analysis and rankings
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                Revenue and system size breakdowns
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                Team performance comparisons
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                Custom charts and visualizations
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                Strategic sales insights
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Example Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2 text-sm">
              <li className="italic text-muted-foreground">"Show me the top 5 closers by revenue"</li>
              <li className="italic text-muted-foreground">"Create a chart of system sizes by team"</li>
              <li className="italic text-muted-foreground">"How is Richard performing this month?"</li>
              <li className="italic text-muted-foreground">"Compare Dynasty Vendetta vs TakeoverPros"</li>
              <li className="italic text-muted-foreground">"What's our average deal size?"</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chat Dialog */}
      <BotChat 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}