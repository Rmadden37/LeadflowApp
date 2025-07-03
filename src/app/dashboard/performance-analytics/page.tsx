"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Brain, TrendingUp, BarChart3, Users, Target, PieChart, Activity, Sparkles, Loader2, Send, Bot, User, Sun, Crown, Database } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import PerformanceDashboard from "@/components/analytics/performance-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

// Google Sheets URLs from your .env file
const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1JbDgrzjZrpCmTLDtv44N3-NMvdc_bf15JvNErW3Qpxaj3DgCQlYfn5cDwZGH3RuD5yIWQm5SV0DN/pub?gid=1888217885&single=true&output=csv";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  chartData?: any;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  loading?: boolean;
}

interface SalesData {
  closer?: string;
  setter?: string;
  date_submitted?: string;
  system_size?: string;
  realization?: string;
  team?: string;
  region?: string;
  [key: string]: string | undefined;
}

// Helper function to parse CSV data
function parseCSV(csvText: string): SalesData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const data: SalesData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    if (row.length < headers.length) continue;
    
    const rowData: SalesData = {};
    headers.forEach((header, index) => {
      const value = row[index]?.replace(/['"]/g, '')?.trim();
      rowData[header] = value;
    });
    
    data.push(rowData);
  }
  
  return data;
}

// AI Assistant for sales data analysis
class SalesAIAssistant {
  static analyzeQuery(query: string): { intent: string; entities: string[]; chartType?: string } {
    const lowerQuery = query.toLowerCase();
    
    let intent = 'general';
    let chartType: string | undefined;
    
    if (lowerQuery.includes('chart') || lowerQuery.includes('graph') || lowerQuery.includes('visualiz')) {
      if (lowerQuery.includes('pie')) chartType = 'pie';
      else if (lowerQuery.includes('line') || lowerQuery.includes('trend')) chartType = 'line';
      else if (lowerQuery.includes('area')) chartType = 'area';
      else chartType = 'bar';
    }
    
    if (lowerQuery.includes('top') && (lowerQuery.includes('closer') || lowerQuery.includes('performer'))) {
      intent = 'top_closers';
      chartType = chartType || 'bar';
    } else if (lowerQuery.includes('team') && lowerQuery.includes('performance')) {
      intent = 'team_performance';
      chartType = chartType || 'bar';
    } else if (lowerQuery.includes('conversion') || lowerQuery.includes('rate')) {
      intent = 'conversion_rates';
      chartType = chartType || 'bar';
    } else if (lowerQuery.includes('monthly') || lowerQuery.includes('time') || lowerQuery.includes('trend')) {
      intent = 'time_trends';
      chartType = chartType || 'line';
    } else if (lowerQuery.includes('system size') || lowerQuery.includes('kw')) {
      intent = 'system_analysis';
      chartType = chartType || 'bar';
    } else if (lowerQuery.includes('region') || lowerQuery.includes('location')) {
      intent = 'regional_analysis';
      chartType = chartType || 'pie';
    }
    
    const entities = this.extractEntities(lowerQuery);
    return { intent, entities, chartType };
  }
  
  static extractEntities(query: string): string[] {
    const entities: string[] = [];
    const teamNames = ['dynasty vendetta', 'takeoverpros', 'revolution'];
    const metrics = ['sales', 'revenue', 'kw', 'conversion', 'leads'];
    
    teamNames.forEach(team => {
      if (query.includes(team)) entities.push(team);
    });
    
    metrics.forEach(metric => {
      if (query.includes(metric)) entities.push(metric);
    });
    
    return entities;
  }
  
  static async generateResponse(
    query: string, 
    salesData: SalesData[]
  ): Promise<{ response: string; chartData?: any; chartType?: string }> {
    const analysis = this.analyzeQuery(query);
    
    try {
      switch (analysis.intent) {
        case 'top_closers':
          return this.getTopClosers(salesData, analysis.chartType);
        case 'team_performance':
          return this.getTeamPerformance(salesData, analysis.chartType);
        case 'conversion_rates':
          return this.getConversionRates(salesData, analysis.chartType);
        case 'time_trends':
          return this.getTimeTrends(salesData, analysis.chartType);
        case 'system_analysis':
          return this.getSystemAnalysis(salesData, analysis.chartType);
        case 'regional_analysis':
          return this.getRegionalAnalysis(salesData, analysis.chartType);
        default:
          return this.getGeneralInsights(salesData);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      return {
        response: "☀️ The cosmic data streams encountered turbulence! Please try rephrasing your question, and Ra shall illuminate the sales insights."
      };
    }
  }
  
  static getTopClosers(salesData: SalesData[], chartType?: string) {
    const closerStats = new Map();
    
    salesData.forEach(record => {
      if (record.closer && record.realization === '1') {
        const existing = closerStats.get(record.closer) || { name: record.closer, sales: 0, totalKW: 0 };
        existing.sales += 1;
        existing.totalKW += parseFloat(record.system_size || '0') / 1000;
        closerStats.set(record.closer, existing);
      }
    });
    
    const topClosers = Array.from(closerStats.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
    
    const response = `🏆 **Top Performing Closers (by Net Sales)**\n\n${topClosers.map((closer, i) => 
      `${i + 1}. **${closer.name}**: ${closer.sales} sales, ${closer.totalKW.toFixed(1)} kW`
    ).join('\n')}\n\nTotal combined: ${topClosers.reduce((sum, c) => sum + c.sales, 0)} sales`;
    
    return {
      response,
      chartData: topClosers,
      chartType: chartType || 'bar'
    };
  }
  
  static getTeamPerformance(salesData: SalesData[], chartType?: string) {
    const teamStats = new Map();
    
    salesData.forEach(record => {
      if (record.team && record.realization === '1') {
        const existing = teamStats.get(record.team) || { team: record.team, sales: 0, totalKW: 0 };
        existing.sales += 1;
        existing.totalKW += parseFloat(record.system_size || '0') / 1000;
        teamStats.set(record.team, existing);
      }
    });
    
    const teams = Array.from(teamStats.values()).sort((a, b) => b.sales - a.sales);
    
    const response = `🏛️ **Team Performance Analysis**\n\n${teams.map((team, i) => 
      `${i + 1}. **${team.team}**: ${team.sales} sales, ${team.totalKW.toFixed(1)} kW`
    ).join('\n')}\n\nThe solar energy flows strongest through coordinated team efforts!`;
    
    return {
      response,
      chartData: teams,
      chartType: chartType || 'bar'
    };
  }
  
  static getConversionRates(salesData: SalesData[], chartType?: string) {
    const closerConversion = new Map();
    
    salesData.forEach(record => {
      if (record.closer) {
        const existing = closerConversion.get(record.closer) || { 
          name: record.closer, 
          total: 0, 
          sales: 0 
        };
        existing.total += 1;
        if (record.realization === '1') existing.sales += 1;
        closerConversion.set(record.closer, existing);
      }
    });
    
    const conversionData = Array.from(closerConversion.values())
      .filter(closer => closer.total >= 5) // Only closers with 5+ leads
      .map(closer => ({
        ...closer,
        conversionRate: (closer.sales / closer.total * 100)
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);
    
    const response = `📊 **Conversion Rate Analysis**\n\n${conversionData.map((closer, i) => 
      `${i + 1}. **${closer.name}**: ${closer.conversionRate.toFixed(1)}% (${closer.sales}/${closer.total})`
    ).join('\n')}\n\nConversion mastery reveals the true solar champions!`;
    
    return {
      response,
      chartData: conversionData,
      chartType: chartType || 'bar'
    };
  }
  
  static getTimeTrends(salesData: SalesData[], chartType?: string) {
    const monthlyData = new Map();
    
    salesData.forEach(record => {
      if (record.date_submitted && record.realization === '1') {
        const date = new Date(record.date_submitted);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const existing = monthlyData.get(monthKey) || { 
          month: monthKey, 
          sales: 0, 
          totalKW: 0 
        };
        existing.sales += 1;
        existing.totalKW += parseFloat(record.system_size || '0') / 1000;
        monthlyData.set(monthKey, existing);
      }
    });
    
    const trendData = Array.from(monthlyData.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
    
    const response = `📈 **Monthly Sales Trends**\n\n${trendData.map(month => 
      `**${month.month}**: ${month.sales} sales, ${month.totalKW.toFixed(1)} kW`
    ).join('\n')}\n\nThe cosmic cycles reveal patterns of solar prosperity!`;
    
    return {
      response,
      chartData: trendData,
      chartType: chartType || 'line'
    };
  }
  
  static getSystemAnalysis(salesData: SalesData[], chartType?: string) {
    const sizeRanges = {
      'Small (0-5kW)': 0,
      'Medium (5-10kW)': 0,
      'Large (10-15kW)': 0,
      'Extra Large (15kW+)': 0
    };
    
    let totalKW = 0;
    let count = 0;
    
    salesData.forEach(record => {
      if (record.system_size && record.realization === '1') {
        const kw = parseFloat(record.system_size) / 1000;
        totalKW += kw;
        count += 1;
        
        if (kw <= 5) sizeRanges['Small (0-5kW)']++;
        else if (kw <= 10) sizeRanges['Medium (5-10kW)']++;
        else if (kw <= 15) sizeRanges['Large (10-15kW)']++;
        else sizeRanges['Extra Large (15kW+)']++;
      }
    });
    
    const avgKW = count > 0 ? totalKW / count : 0;
    const chartData = Object.entries(sizeRanges).map(([size, count]) => ({
      size,
      count,
      value: count
    }));
    
    const response = `⚡ **System Size Analysis**\n\nAverage System Size: **${avgKW.toFixed(1)} kW**\nTotal Sales: **${count}**\nTotal Capacity: **${totalKW.toFixed(1)} kW**\n\n**Distribution:**\n${Object.entries(sizeRanges).map(([size, count]) => 
      `${size}: ${count} systems`
    ).join('\n')}\n\nThe solar installations illuminate diverse energy needs!`;
    
    return {
      response,
      chartData,
      chartType: chartType || 'pie'
    };
  }
  
  static getRegionalAnalysis(salesData: SalesData[], chartType?: string) {
    const regionStats = new Map();
    
    salesData.forEach(record => {
      if (record.region && record.realization === '1') {
        const existing = regionStats.get(record.region) || { 
          region: record.region, 
          sales: 0, 
          totalKW: 0 
        };
        existing.sales += 1;
        existing.totalKW += parseFloat(record.system_size || '0') / 1000;
        regionStats.set(record.region, existing);
      }
    });
    
    const regions = Array.from(regionStats.values())
      .sort((a, b) => b.sales - a.sales);
    
    const response = `🗺️ **Regional Performance Analysis**\n\n${regions.map((region, i) => 
      `${i + 1}. **${region.region}**: ${region.sales} sales, ${region.totalKW.toFixed(1)} kW`
    ).join('\n')}\n\nThe sun's energy spreads across all territories!`;
    
    return {
      response,
      chartData: regions.map(r => ({ ...r, value: r.sales })),
      chartType: chartType || 'pie'
    };
  }
  
  static getGeneralInsights(salesData: SalesData[]) {
    const totalLeads = salesData.length;
    const netSales = salesData.filter(r => r.realization === '1').length;
    const conversionRate = totalLeads > 0 ? (netSales / totalLeads * 100) : 0;
    const totalKW = salesData
      .filter(r => r.realization === '1')
      .reduce((sum, r) => sum + (parseFloat(r.system_size || '0') / 1000), 0);
    
    return {
      response: `☀️ **Sales Performance Overview**\n\n📊 **Key Metrics:**\n• Total Leads: **${totalLeads.toLocaleString()}**\n• Net Sales: **${netSales.toLocaleString()}**\n• Conversion Rate: **${conversionRate.toFixed(1)}%**\n• Total kW Sold: **${totalKW.toFixed(1)} kW**\n\n🌟 Ask me about:\n• "Show me the top closers"\n• "Team performance chart"\n• "Monthly sales trends"\n• "System size analysis"\n• "Regional breakdown"\n\nThe cosmic sales data awaits your divine queries!`
    };
  }
}

// AI Assistant Component
function AISalesAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "☀️ Greetings! I am Ra, your divine sales analytics assistant. I have access to your live Google Sheets data and can analyze performance, create charts, and provide insights. What would you like to explore?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load sales data from Google Sheets
  useEffect(() => {
    const loadSalesData = async () => {
      try {
        const response = await fetch(GOOGLE_SHEETS_CSV_URL);
        const csvText = await response.text();
        const data = parseCSV(csvText);
        setSalesData(data);
        setDataLoaded(true);
        console.log('Loaded sales data:', data.length, 'records');
      } catch (error) {
        console.error('Error loading sales data:', error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: "⚠️ Unable to load sales data from Google Sheets. Please check the connection and try again.",
          isBot: true,
          timestamp: new Date()
        }]);
      }
    };
    
    loadSalesData();
  }, []);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    try {
      const { response, chartData, chartType } = await SalesAIAssistant.generateResponse(
        inputValue,
        salesData
      );
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isBot: true,
        timestamp: new Date(),
        chartData,
        chartType: chartType as any
      };
      
      setMessages(prev => [...prev, botMessage]);
      
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: "☀️ The cosmic energies encountered a disturbance. Please try again with a different question.",
        isBot: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const renderChart = (message: Message) => {
    if (!message.chartData || !message.chartType) return null;
    
    switch (message.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={message.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#0088FE" name="Sales" />
              <Bar dataKey="totalKW" fill="#00C49F" name="Total kW" />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={message.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#0088FE" name="Sales" />
              <Line type="monotone" dataKey="totalKW" stroke="#00C49F" name="Total kW" />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={message.chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {message.chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };
  
  const quickQuestions = [
    "Show me the top 10 closers",
    "Team performance chart",
    "Monthly sales trends",
    "System size analysis",
    "Regional breakdown",
    "Conversion rates by closer"
  ];
  
  return (
    <div className="flex flex-col h-[700px] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 rounded-lg border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-100 to-orange-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-600 dark:to-orange-600 flex items-center justify-center border-2 border-amber-300 dark:border-amber-500">
              <Sun className="h-6 w-6 text-amber-700 dark:text-amber-100" />
            </div>
            <Crown className="h-4 w-4 text-amber-700 dark:text-amber-300 absolute -top-1 -right-1" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">Ra - Sales Analytics AI</h2>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {dataLoaded ? `Connected to live data (${salesData.length.toLocaleString()} records)` : 'Loading data...'}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Live Data
        </Badge>
      </div>
      
      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="p-4 border-b bg-white/50 dark:bg-slate-800/50">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick questions to try:</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputValue(question)}
                className="text-xs"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            {message.isBot && (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-600 dark:to-orange-600 flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-amber-700 dark:text-amber-100" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.isBot ? 'bg-white dark:bg-slate-700' : 'bg-blue-500 text-white'} rounded-lg p-3 shadow`}>
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
              
              {/* Chart */}
              {message.chartData && (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-slate-600 rounded">
                  {renderChart(message)}
                </div>
              )}
              
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
            
            {!message.isBot && (
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-600 dark:to-orange-600 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-amber-700 dark:text-amber-100" />
            </div>
            <div className="bg-white dark:bg-slate-700 rounded-lg p-3 shadow">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Ra is analyzing the data...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t bg-white/50 dark:bg-slate-800/50 rounded-b-lg">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about sales data, request charts, analyze performance..."
            className="flex-1"
            disabled={isLoading || !dataLoaded}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading || !inputValue.trim() || !dataLoaded}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceAnalyticsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!user) return null;

  if (user.role === "setter") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analytics Not Available</h2>
              <p className="text-muted-foreground">Analytics are available for closers and managers only.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
            Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Performance dashboards and AI-powered insights
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Powered
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full flex flex-nowrap overflow-x-auto gap-1 mb-4 border-0 px-0 py-0 bg-gradient-to-br from-[#23243a]/80 to-[#18192a]/80 dark:from-[#23243a]/80 dark:to-[#18192a]/80 backdrop-blur-md rounded-xl shadow-lg">
          <TabsTrigger value="dashboard" className="flex-1 min-w-[110px] px-0 py-2 text-base sm:text-base whitespace-nowrap text-ellipsis overflow-hidden flex items-center gap-2 justify-center font-semibold rounded-none bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-none">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="ai-assistant" className="flex-1 min-w-[110px] px-0 py-2 text-base sm:text-base whitespace-nowrap text-ellipsis overflow-hidden flex items-center gap-2 justify-center font-semibold rounded-none bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-none">
            AI Assistant
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <PerformanceDashboard />
        </TabsContent>

        <TabsContent value="ai-assistant" className="mt-6 space-y-6">
          <AISalesAssistant />
        </TabsContent>
      </Tabs>
    </div>
  );
}