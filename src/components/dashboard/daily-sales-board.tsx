"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, 
  Calendar, 
  Target,
  Zap,
  Trophy,
  Clock,
  ChevronLeft,
  ChevronRight,
  Settings,
  BarChart3,
  Users,
  Flame,
  Star,
  Award,
  Activity,
  CalendarDays,
  Timer,
  Loader2
} from "lucide-react";
import { collection, query, where, onSnapshot, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lead, AppUser } from "@/types";
import { format, isToday, startOfDay, endOfDay, subDays, addDays, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { SalesBoardNotifications } from "@/lib/sales-board-notifications";

interface DailySalesBoardProps {
  channelId: string;
  channelType: "team" | "region";
  teamId?: string;
  regionId?: string;
}

interface DayStats {
  date: Date;
  sales: SaleRecord[];
  appointments: AppointmentRecord[];
  totalSales: number;
  totalAppointments: number;
  momentum: number; // Calculated momentum score
  topPerformers: PerformerRecord[];
}

interface SaleRecord {
  id: string;
  closerName: string;
  closerId: string;
  customerName: string;
  amount?: number;
  timestamp: Date;
  type: "sold" | "credit_fail";
  streak?: number;
}

interface AppointmentRecord {
  id: string;
  setterName: string;
  setterId: string;
  customerName: string;
  appointmentTime: Date;
  type: "SD" | "ND" | "SO"; // Same Day, Next Day, Set Out
  status: "scheduled" | "rescheduled" | "completed" | "missed";
  timestamp: Date;
}

interface PerformerRecord {
  id: string;
  name: string;
  avatarUrl?: string;
  role: "closer" | "setter";
  count: number;
  streak: number;
  lastActivity: Date;
}

export default function DailySalesBoard({ 
  channelId, 
  channelType, 
  teamId, 
  regionId 
}: DailySalesBoardProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dayStats, setDayStats] = useState<DayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historicalData, setHistoricalData] = useState<DayStats[]>([]);
  const [sendingReaction, setSendingReaction] = useState<string | null>(null);

  // Real-time data subscription
  useEffect(() => {
    if (!user) return;

    const startOfSelectedDay = startOfDay(selectedDate);
    const endOfSelectedDay = endOfDay(selectedDate);

    // Query for leads in the selected timeframe
    let leadsQuery = query(
      collection(db, "leads"),
      where("updatedAt", ">=", Timestamp.fromDate(startOfSelectedDay)),
      where("updatedAt", "<=", Timestamp.fromDate(endOfSelectedDay)),
      orderBy("updatedAt", "desc")
    );

    // Filter by team or region
    if (channelType === "team" && teamId) {
      leadsQuery = query(
        collection(db, "leads"),
        where("teamId", "==", teamId),
        where("updatedAt", ">=", Timestamp.fromDate(startOfSelectedDay)),
        where("updatedAt", "<=", Timestamp.fromDate(endOfSelectedDay)),
        orderBy("updatedAt", "desc")
      );
    } else if (channelType === "region" && regionId) {
      // For regions, we'll need to get all team IDs in the region first
      // For now, we'll use a simplified approach
      leadsQuery = query(
        collection(db, "leads"),
        where("updatedAt", ">=", Timestamp.fromDate(startOfSelectedDay)),
        where("updatedAt", "<=", Timestamp.fromDate(endOfSelectedDay)),
        orderBy("updatedAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const leads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];

      processLeadsData(leads, selectedDate);
    });

    return unsubscribe;
  }, [user, selectedDate, channelType, teamId, regionId]);

  // Process leads data into sales and appointments
  const processLeadsData = (leads: Lead[], date: Date) => {
    const sales: SaleRecord[] = [];
    const appointments: AppointmentRecord[] = [];
    
    // Process sales (sold and credit_fail leads)
    leads.forEach(lead => {
      if (lead.status === "sold" || lead.status === "credit_fail") {
        sales.push({
          id: lead.id,
          closerName: lead.assignedCloserName || "Unknown Closer",
          closerId: lead.assignedCloserId || "",
          customerName: lead.customerName,
          timestamp: lead.updatedAt.toDate(),
          type: lead.status,
        });
      }
      
      // Process appointments (scheduled and rescheduled)
      if ((lead.status === "scheduled" || lead.status === "rescheduled") && lead.scheduledAppointmentTime) {
        const appointmentDate = lead.scheduledAppointmentTime.toDate();
        const createdDate = lead.createdAt.toDate();
        
        // Determine appointment type
        let type: "SD" | "ND" | "SO" = "SO"; // Default to Set Out
        const daysDiff = Math.floor((appointmentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) type = "SD"; // Same Day
        else if (daysDiff === 1) type = "ND"; // Next Day
        
        appointments.push({
          id: lead.id,
          setterName: lead.setterName || "Unknown Setter",
          setterId: lead.setterId || "",
          customerName: lead.customerName,
          appointmentTime: appointmentDate,
          type,
          status: lead.status === "rescheduled" ? "rescheduled" : "scheduled",
          timestamp: lead.updatedAt.toDate(),
        });
      }
    });

    // Calculate momentum (based on activity frequency and success rate)
    const momentum = calculateMomentum(sales, appointments);
    
    // Calculate top performers
    const topPerformers = calculateTopPerformers(sales, appointments);

    setDayStats({
      date,
      sales,
      appointments,
      totalSales: sales.filter(s => s.type === "sold").length,
      totalAppointments: appointments.length,
      momentum,
      topPerformers,
    });
    
    setLoading(false);
  };

  const calculateMomentum = (sales: SaleRecord[], appointments: AppointmentRecord[]) => {
    const totalActivity = sales.length + appointments.length;
    const successRate = sales.length > 0 ? sales.filter(s => s.type === "sold").length / sales.length : 0;
    
    // Calculate time-based momentum (more recent activity = higher momentum)
    const now = new Date();
    const recentActivity = [...sales, ...appointments].filter(item => {
      const hoursDiff = (now.getTime() - item.timestamp.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 2; // Activity within last 2 hours
    }).length;
    
    // Momentum score (0-100)
    return Math.min(100, (totalActivity * 10) + (successRate * 30) + (recentActivity * 20));
  };

  const calculateTopPerformers = (sales: SaleRecord[], appointments: AppointmentRecord[]): PerformerRecord[] => {
    const performers = new Map<string, PerformerRecord>();
    
    // Process sales data
    sales.forEach(sale => {
      if (!performers.has(sale.closerId)) {
        performers.set(sale.closerId, {
          id: sale.closerId,
          name: sale.closerName,
          role: "closer",
          count: 0,
          streak: 0,
          lastActivity: sale.timestamp,
        });
      }
      const performer = performers.get(sale.closerId)!;
      if (sale.type === "sold") {
        performer.count++;
      }
      if (sale.timestamp > performer.lastActivity) {
        performer.lastActivity = sale.timestamp;
      }
    });
    
    // Process appointments data
    appointments.forEach(appointment => {
      if (!performers.has(appointment.setterId)) {
        performers.set(appointment.setterId, {
          id: appointment.setterId,
          name: appointment.setterName,
          role: "setter",
          count: 0,
          streak: 0,
          lastActivity: appointment.timestamp,
        });
      }
      const performer = performers.get(appointment.setterId)!;
      performer.count++;
      if (appointment.timestamp > performer.lastActivity) {
        performer.lastActivity = appointment.timestamp;
      }
    });
    
    return Array.from(performers.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const isSelectedToday = isToday(selectedDate);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading sales board...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sendCelebrationReaction = async (type: "congratulations" | "motivation" | "fire") => {
    if (!user || !teamId || sendingReaction) return;
    
    setSendingReaction(type);
    try {
      await SalesBoardNotifications.sendCelebrationReaction(
        type,
        teamId,
        user.displayName || user.email || "Team Member",
        regionId
      );
    } catch (error) {
      console.error("Failed to send celebration reaction:", error);
    } finally {
      setSendingReaction(null);
    }
  };

  return (
    <Card className="w-full bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-slate-900/50 dark:to-slate-800/50 border-2 border-blue-200/30 dark:border-blue-500/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Trophy className="h-6 w-6 text-amber-500" />
              <Flame className="h-3 w-3 text-orange-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Daily Sales Board
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {channelType === "team" ? "Team Performance" : "Regional Performance"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              History
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 border border-blue-200/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateDate("prev")}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <div className="font-semibold text-sm">
              {isSelectedToday ? "Today" : format(selectedDate, "MMM d, yyyy")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(selectedDate, "EEEE")}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateDate("next")}
            className="h-8 w-8 p-0"
            disabled={isToday(selectedDate)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Sales</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-green-800 dark:text-green-300">
                {dayStats?.totalSales || 0}
              </span>
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                💥
              </Badge>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200/30">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Appointments</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-800 dark:text-blue-300">
                {dayStats?.totalAppointments || 0}
              </span>
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                📄
              </Badge>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-3 rounded-lg border border-amber-200/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Momentum</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-amber-800 dark:text-amber-300">
                {Math.round(dayStats?.momentum || 0)}%
              </span>
              <div className={cn(
                "h-2 w-2 rounded-full",
                (dayStats?.momentum || 0) > 70 ? "bg-green-500 animate-pulse" :
                (dayStats?.momentum || 0) > 40 ? "bg-amber-500" : "bg-gray-400"
              )}></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border border-purple-200/30">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Streak</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-purple-800 dark:text-purple-300">
                {isSelectedToday ? "🔥" : "📊"}
              </span>
              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                {isSelectedToday ? "Live" : "History"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Reset Notice for 8AM */}
        {isSelectedToday && (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-3 rounded-lg border border-indigo-200/30">
            <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400">
              <Timer className="h-4 w-4" />
              <span>Daily board resets at 8:00 AM • Track real-time progress throughout the day</span>
            </div>
          </div>
        )}

        {/* Sales Activity */}
        {dayStats && dayStats.sales.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm">Sales Activity</h3>
              <Badge variant="outline" className="text-xs">
                {dayStats.sales.filter(s => s.type === "sold").length} Closed
              </Badge>
            </div>
            
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {dayStats.sales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-gray-200/30"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        sale.type === "sold" ? "bg-green-500" : "bg-red-500"
                      )}></div>
                      <span className="text-xs font-medium">{sale.closerName}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate max-w-24">
                        {sale.customerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">
                        {sale.type === "sold" ? "💥" : "❌"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(sale.timestamp, "h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Appointments Activity */}
        {dayStats && dayStats.appointments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Appointments Set</h3>
              <Badge variant="outline" className="text-xs">
                {dayStats.appointments.length} Total
              </Badge>
            </div>
            
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {dayStats.appointments.slice(0, 5).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-gray-200/30"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs h-5 px-1">
                        {appointment.type}
                      </Badge>
                      <span className="text-xs font-medium">{appointment.setterName}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate max-w-24">
                        {appointment.customerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">📄</span>
                      <span className="text-xs text-muted-foreground">
                        {format(appointment.timestamp, "h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Top Performers */}
        {dayStats && dayStats.topPerformers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              <h3 className="font-semibold text-sm">Today's Leaders</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {dayStats.topPerformers.slice(0, 4).map((performer, index) => (
                <div
                  key={performer.id}
                  className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-2 rounded border border-gray-200/30"
                >
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={performer.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {performer.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {index === 0 && (
                      <Trophy className="h-3 w-3 text-amber-500 absolute -top-1 -right-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{performer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {performer.count} {performer.role === "closer" ? "sales" : "appointments"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {dayStats && dayStats.sales.length === 0 && dayStats.appointments.length === 0 && (
          <div className="text-center py-8">
            <div className="mb-3">
              {isSelectedToday ? (
                <Activity className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              ) : (
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              )}
            </div>
            <h3 className="font-semibold text-sm mb-1">
              {isSelectedToday ? "No Activity Yet" : "No Activity"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isSelectedToday 
                ? "Sales and appointments will appear here as they happen throughout the day."
                : `No sales or appointments were recorded on ${format(selectedDate, "MMM d, yyyy")}.`
              }
            </p>
          </div>
        )}

        {/* Quick Actions */}
        {isSelectedToday && (
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              onClick={() => sendCelebrationReaction("congratulations")}
              disabled={sendingReaction === "congratulations"}
            >
              {sendingReaction === "congratulations" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                "🎉"
              )} Celebrate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              onClick={() => sendCelebrationReaction("motivation")}
              disabled={sendingReaction === "motivation"}
            >
              {sendingReaction === "motivation" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                "💪"
              )} Motivate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
              onClick={() => sendCelebrationReaction("fire")}
              disabled={sendingReaction === "fire"}
            >
              {sendingReaction === "fire" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                "🔥"
              )} Fire!
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
