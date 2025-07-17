"use client";

import {useState, useEffect, useMemo} from "react";
import type {Lead} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, writeBatch} from "firebase/firestore";
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Calendar,
  Phone,
  MapPin,
  User,
  Clock,
  Check,
  X,
  Edit,
  Users,
} from "lucide-react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useRouter} from "next/navigation";
import {format} from "date-fns";
import VerifiedCheckbox from "@/components/dashboard/verified-checkbox";

export default function ImprovedTeamLeadsPage() {
  const {user, loading: authLoading} = useAuth();
  const {toast} = useToast();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dispatchFilter, setDispatchFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  
  // Inline editing state
  const [editingLead, setEditingLead] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{[key: string]: string | number}>({});
  const [saving, setSaving] = useState(false);

  // Bulk operations state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [teamClosers, setTeamClosers] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "manager" && user.role !== "admin"))) {
      router.replace(user ? "/dashboard" : "/login");
      return;
    }

    if (user && user.teamId && (user.role === "manager" || user.role === "admin")) {
      setLeadsLoading(true);
      const q = query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const leadsData = querySnapshot.docs.map(
            (doc) => ({id: doc.id, ...doc.data()} as Lead)
          );
          setLeads(leadsData);
          setLeadsLoading(false);
        },
        (_error) => {
          toast({
            title: "Error",
            description: "Failed to load leads. Please refresh the page.",
            variant: "destructive",
          });
          setLeadsLoading(false);
        }
      );

      return () => unsubscribe();
    }
    return undefined;
  }, [user, authLoading, router, toast]);

  // Fetch team closers for reassignment
  useEffect(() => {
    if (!user?.teamId) return;
    
    const closersQuery = query(
      collection(db, "users"),
      where("teamId", "==", user.teamId),
      where("role", "==", "closer"),
      where("isActive", "==", true)
    );
    
    const unsubscribe = onSnapshot(closersQuery, (snapshot) => {
      const closersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeamClosers(closersData);
    });
    
    return () => unsubscribe();
  }, [user?.teamId]);

  // Filtered and searched leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customerPhone.includes(searchTerm) ||
        (lead.address && lead.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.assignedCloserName && lead.assignedCloserName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.setterName && lead.setterName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status filter with recovery targets support
      let matchesStatus = true;
      if (statusFilter === "recovery") {
        matchesStatus = lead.status === "canceled" || lead.status === "no_sale";
      } else if (statusFilter !== "all") {
        matchesStatus = lead.status === statusFilter;
      }

      // Dispatch type filter
      const matchesDispatch = dispatchFilter === "all" || lead.dispatchType === dispatchFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== "all") {
        const leadDate = lead.createdAt.toDate();
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            matchesDate = leadDate.toDateString() === now.toDateString();
            break;
          case "week": {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = leadDate >= weekAgo;
            break;
          }
          case "month": {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = leadDate >= monthAgo;
            break;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesDispatch && matchesDate;
    });
  }, [leads, searchTerm, statusFilter, dispatchFilter, dateFilter]);

  const getStatusBadgeVariant = (status: string, dispatchType?: string) => {
    // For immediate dispatch leads, show neutral variant for N/A status
    if (dispatchType === "immediate") {
      return "secondary";
    }
    
    switch (status) {
      case "sold":
        return "default";
      case "accepted":
      case "in_process":
        return "secondary";
      case "waiting_assignment":
        return "outline";
      case "scheduled":
        return "outline";
      case "no_sale":
      case "canceled":
        return "destructive";
      case "rescheduled":
        return "secondary";
      default:
        return "outline";
    }
  };

  const exportToCSV = () => {
    const leadsToExport = isMultiSelectMode && selectedLeadIds.size > 0 
      ? filteredLeads.filter(lead => selectedLeadIds.has(lead.id))
      : filteredLeads;
      
    const headers = [
      "Customer Name",
      "Phone",
      "Address",
      "Status",
      "Dispatch Type",
      "Assigned Closer",
      "Setter",
      "Created At",
      "Updated At",
      "Scheduled Time"
    ];

    const csvData = leadsToExport.map(lead => [
      lead.customerName,
      lead.customerPhone,
      lead.address || "",
      lead.status,
      lead.dispatchType,
      lead.assignedCloserName || "",
      lead.setterName || "",
      format(lead.createdAt.toDate(), "yyyy-MM-dd HH:mm:ss"),
      format(lead.updatedAt.toDate(), "yyyy-MM-dd HH:mm:ss"),
      lead.scheduledAppointmentTime ? format(lead.scheduledAppointmentTime.toDate(), "yyyy-MM-dd HH:mm:ss") : ""
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    if (typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = isMultiSelectMode && selectedLeadIds.size > 0 
        ? `selected-leads-export-${format(new Date(), "yyyy-MM-dd")}.csv`
        : `${statusFilter !== "all" ? statusFilter + "-" : ""}leads-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Exported ${leadsToExport.length} leads to CSV`,
      });
    }
  };

  // Start editing a lead
  const startEditing = (lead: Lead) => {
    setEditingLead(lead.id);
    setEditValues({
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      address: lead.address || "",
      status: lead.status,
      dispatchType: lead.dispatchType,
    });
  };

  // Bulk operations functions
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedLeadIds(new Set());
  };

  const toggleLeadSelection = (leadId: string) => {
    const newSelection = new Set(selectedLeadIds);
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId);
    } else {
      newSelection.add(leadId);
    }
    setSelectedLeadIds(newSelection);
  };

  const selectAllFiltered = () => {
    const allFilteredIds = new Set(filteredLeads.map(lead => lead.id));
    setSelectedLeadIds(allFilteredIds);
  };

  const clearSelection = () => {
    setSelectedLeadIds(new Set());
  };

  const bulkReassignLeads = async (closerId: string, closerName: string) => {
    if (selectedLeadIds.size === 0) return;
    
    try {
      const batch = writeBatch(db);
      
      selectedLeadIds.forEach(leadId => {
        const leadRef = doc(db, "leads", leadId);
        batch.update(leadRef, {
          assignedCloserId: closerId,
          assignedCloserName: closerName,
          status: "waiting_assignment",
          updatedAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
      
      toast({
        title: "Leads Reassigned",
        description: `${selectedLeadIds.size} leads reassigned to ${closerName}`,
      });
      
      setSelectedLeadIds(new Set());
      setShowReassignModal(false);
      setIsMultiSelectMode(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reassign leads. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getQuickFilterPresets = () => [
    { label: "Canceled Leads", value: "canceled", count: leads.filter(l => l.status === "canceled").length },
    { label: "No Sale Leads", value: "no_sale", count: leads.filter(l => l.status === "no_sale").length },
    { label: "Recovery Targets", value: "recovery", count: leads.filter(l => l.status === "canceled" || l.status === "no_sale").length },
  ];

  // Cancel editing
  const cancelEdit = () => {
    setEditingLead(null);
    setEditValues({});
  };

  // Save changes to Firestore
  const saveEdit = async (leadId: string) => {
    if (!editValues || saving) return;
    
    setSaving(true);
    try {
      const leadRef = doc(db, "leads", leadId);
      await updateDoc(leadRef, {
        ...editValues,
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: "Success",
        description: "Lead information updated successfully.",
      });
      
      setEditingLead(null);
      setEditValues({});
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Error",
        description: "Failed to update lead information.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update edit value
  const updateEditValue = (field: string, value: string | number) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (authLoading || leadsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "manager" && user?.role !== "admin") {
    return (
      <div className="flex min-h-[calc(100vh-var(--header-height,4rem))] items-center justify-center">
        <p className="text-destructive">Access Denied. You must be a manager to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold font-headline flex items-center">
              <Filter className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Team Leads
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {isMultiSelectMode && selectedLeadIds.size > 0 
                  ? `${selectedLeadIds.size} selected` 
                  : `${filteredLeads.length} leads`}
              </Badge>
              {!isMultiSelectMode && (
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
              <Button 
                onClick={toggleMultiSelectMode} 
                variant={isMultiSelectMode ? "default" : "outline"} 
                size="sm"
              >
                {isMultiSelectMode ? "Cancel" : "Select"}
              </Button>
            </div>
          </div>
          
          {/* iOS-style Quick Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {getQuickFilterPresets().map(preset => (
              <Button
                key={preset.value}
                variant={statusFilter === preset.value ? "default" : "outline"}
                size="sm"
                className="h-8 px-3 text-xs font-medium rounded-full transition-all active:scale-95"
                onClick={() => setStatusFilter(statusFilter === preset.value ? "all" : preset.value)}
              >
                {preset.label}
                <Badge variant="secondary" className="ml-1.5 h-5 w-auto min-w-[20px] text-xs px-1.5">
                  {preset.count}
                </Badge>
              </Button>
            ))}
          </div>
          
          {/* Search and Traditional Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="recovery">🎯 Recovery Targets</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="no_sale">No Sale</SelectItem>
                <SelectItem value="waiting_assignment">Waiting Assignment</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="in_process">In Process</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dispatchFilter} onValueChange={setDispatchFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by dispatch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Multi-select Actions Bar */}
          {isMultiSelectMode && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg mt-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiltered}
                  disabled={selectedLeadIds.size === filteredLeads.length}
                >
                  Select All ({filteredLeads.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedLeadIds.size === 0}
                >
                  Clear
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedLeadIds.size > 0 && (
                  <>
                    <Button
                      onClick={() => setShowReassignModal(true)}
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Reassign ({selectedLeadIds.size})
                    </Button>
                    <Button
                      onClick={exportToCSV}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Selected
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6">
          {filteredLeads.length === 0 && !leadsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || dispatchFilter !== "all" || dateFilter !== "all"
                  ? "No leads match your current filters."
                  : "No leads found for your team."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-var(--header-height)-var(--bottom-nav-height)-2rem)] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isMultiSelectMode && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                          onChange={() => selectedLeadIds.size === filteredLeads.length ? clearSelection() : selectAllFiltered()}
                          className="rounded"
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-48">Customer</TableHead>
                    <TableHead className="w-32">Phone</TableHead>
                    <TableHead className="w-64">Address</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-32">Verified</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead className="w-48">Assigned Closer</TableHead>
                    <TableHead className="w-48">Setter</TableHead>
                    <TableHead className="w-48">Created</TableHead>
                    <TableHead className="w-48">Scheduled</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/50">
                      {isMultiSelectMode && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.has(lead.id)}
                            onChange={() => toggleLeadSelection(lead.id)}
                            className="rounded"
                          />
                        </TableCell>
                      )}
                      {/* Customer Name */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {editingLead === lead.id ? (
                            <Input
                              value={editValues.customerName || ""}
                              onChange={(e) => updateEditValue("customerName", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Customer name"
                            />
                          ) : (
                            <span className="font-medium">{lead.customerName}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={editValues.customerPhone || ""}
                              onChange={(e) => updateEditValue("customerPhone", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Phone number"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{lead.customerPhone}</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Address */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <Input
                              value={editValues.address || ""}
                              onChange={(e) => updateEditValue("address", e.target.value)}
                              className="h-8 text-sm"
                              placeholder="Address"
                            />
                          </div>
                        ) : lead.address ? (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-64" title={lead.address}>
                              {lead.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No address</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <Select 
                            value={String(editValues.status || "")} 
                            onValueChange={(value) => updateEditValue("status", value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="waiting_assignment">Waiting Assignment</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="in_process">In Process</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                              <SelectItem value="no_sale">No Sale</SelectItem>
                              <SelectItem value="canceled">Canceled</SelectItem>
                              <SelectItem value="rescheduled">Rescheduled</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getStatusBadgeVariant(lead.status, lead.dispatchType)}>
                            {lead.dispatchType === "immediate" ? "N/A" : lead.status.replace("_", " ")}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Verification */}
                      <TableCell>
                        <VerifiedCheckbox 
                          leadId={lead.id} 
                          disabled={editingLead === lead.id}
                          variant="standard"
                          className="flex justify-center"
                        />
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <Select 
                            value={String(editValues.dispatchType || "")} 
                            onValueChange={(value) => updateEditValue("dispatchType", value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediate">Immediate</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">
                            {lead.dispatchType}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Assigned Closer (Read-only) */}
                      <TableCell>
                        {lead.assignedCloserName ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                {lead.assignedCloserName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium">{lead.assignedCloserName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Unassigned</span>
                        )}
                      </TableCell>

                      {/* Setter */}
                      <TableCell>
                        <span className="text-sm">{lead.setterName || "Unknown"}</span>
                      </TableCell>

                      {/* Created Date */}
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(lead.createdAt.toDate(), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>

                      {/* Scheduled Time */}
                      <TableCell>
                        {lead.scheduledAppointmentTime ? (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">
                              {format(lead.scheduledAppointmentTime.toDate(), "MMM d, h:mm a")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not scheduled</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        {editingLead === lead.id ? (
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveEdit(lead.id)}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEditing(lead)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Reassignment Modal */}
      {showReassignModal && (
        <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign Selected Leads</DialogTitle>
              <DialogDescription>
                Choose a closer to reassign {selectedLeadIds.size} selected leads to.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {teamClosers.map((closer) => (
                <Button
                  key={closer.id}
                  variant="outline"
                  className="h-auto p-4 justify-start"
                  onClick={() => bulkReassignLeads(closer.uid || closer.id, closer.name || closer.displayName)}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {(closer.name || closer.displayName || "").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{closer.name || closer.displayName}</div>
                    <div className="text-sm text-muted-foreground">{closer.email}</div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
