"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PremiumBarChart, PremiumPieChart, PremiumLineChart } from "@/components/premium/premium-charts";
import { BarChart3, Activity, Calendar } from "lucide-react";
import { SetterPerformance, CloserPerformance, TrendData } from "./types";
import type { Lead } from "@/types";

interface PerformanceChartsProps {
  setterPerformance: SetterPerformance[];
  closerPerformance: CloserPerformance[];
  trendData: TrendData[];
  chartConfig: any;
  leads: Lead[];
}

export function PerformanceCharts({
  setterPerformance,
  closerPerformance,
  trendData,
  chartConfig,
  leads
}: PerformanceChartsProps) {
  // Prepare setter chart data
  const setterChartData = setterPerformance.map(setter => ({
    name: setter.name.split(" ")[0], // Use first name for chart
    sitRate: setter.sitRate,
    failedCreditRate: setter.failedCreditRate,
    cancelNoShowRate: setter.cancelNoShowRate
  }));

  // Prepare closer chart data
  const closerChartData = closerPerformance.map(closer => ({
    name: closer.name.split(" ")[0], // Use first name for chart
    closeRate: closer.closeRate,
    conversionRate: closer.conversionRate,
    selfGenRate: closer.selfGenRate
  }));

  // Prepare lead distribution data
  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadDistributionData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
    percentage: ((count / leads.length) * 100).toFixed(1)
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Setter Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Setter Performance Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PremiumBarChart 
            data={setterChartData} 
            categories={[
              { key: 'sitRate', label: 'Sit Rate %', color: '#0088FE' },
              { key: 'failedCreditRate', label: 'Failed Credit Rate %', color: '#00C49F' },
              { key: 'cancelNoShowRate', label: 'Cancel/No Show Rate %', color: '#FFBB28' }
            ]}
            xAxisKey="name"
            height={350}
            showTooltip={true}
            showLegend={true}
          />
        </CardContent>
      </Card>

      {/* Closer Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Closer Performance Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PremiumBarChart 
            data={closerChartData} 
            categories={[
              { key: 'closeRate', label: 'Close Rate %', color: '#8884d8' },
              { key: 'conversionRate', label: 'Conversion Rate %', color: '#82ca9d' },
              { key: 'selfGenRate', label: 'Self-Generated Rate %', color: '#ffc658' }
            ]}
            xAxisKey="name"
            height={350}
            showTooltip={true}
            showLegend={true}
          />
        </CardContent>
      </Card>

      {/* Lead Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Lead Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PremiumPieChart 
            data={leadDistributionData} 
            valueKey="value"
            labelKey="name"
            height={350}
            showTooltip={true}
            showLegend={true}
          />
        </CardContent>
      </Card>

      {/* Performance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PremiumLineChart 
            data={trendData} 
            lines={[
              { key: 'leads', label: 'Daily Leads', color: '#8884d8' },
              { key: 'sits', label: 'Sits', color: '#82ca9d' },
              { key: 'closes', label: 'Closes', color: '#ffc658' }
            ]}
            xAxisKey="date"
            height={350}
            showTooltip={true}
            showLegend={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
