'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Trophy, TrendingUp, Users, Target, RefreshCw, Award, Medal, ChevronDown, Calendar } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { photoService } from '@/lib/photo-service'

interface CloserData {
  name: string
  sales: number
  revenue: number
  totalKW: number
  avgDealSize: number
  matchedProfile?: {
    displayName: string
    photoURL?: string
    email: string
  }
}

interface SetterData {
  name: string
  totalLeads: number
  grossKW: number
  matchedProfile?: {
    displayName: string
    photoURL?: string
    email: string
  }
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  const [closers, setClosers] = useState<CloserData[]>([])
  const [setters, setSetters] = useState<SetterData[]>([])
  const [selfGen, setSelfGen] = useState<CloserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])

  const [dateFilter, setDateFilter] = useState('ytd')

  // Date filter options
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  
  const startOfYTD = new Date(today.getFullYear() - (today.getMonth() < 9 ? 1 : 0), 9, 1)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfWeek.getDate() - 7)
  
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const dateFilters = [
    { label: 'Today', value: 'today', start: startOfToday },
    { label: 'Yesterday', value: 'yesterday', start: yesterday, end: yesterday },
    { label: 'LW (Last Week)', value: 'lw', start: startOfLastWeek, end: new Date(startOfWeek.getTime() - 1) },
    { label: 'WTD', value: 'wtd', start: startOfWeek },
    { label: 'MTD', value: 'mtd', start: startOfMonth },
    { label: 'YTD', value: 'ytd', start: startOfYTD },  ]

  // Fetch users for photo matching
  useEffect(() => {
    async function fetchUsers() {
      try {
        console.log('🔄 Fetching users from simple-users API...')
        const response = await fetch('/api/simple-users')
        const data = await response.json()
        console.log('✅ Users fetched:', data.users)
        setAllUsers(data.users || [])
      } catch (e) {
        console.error('❌ Error fetching users:', e)
        setAllUsers([])
      }
    }
    fetchUsers()
  }, [])

  // Memoize dateFilters to prevent unnecessary re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedDateFilters = useMemo(() => dateFilters, [])

  // Simple name matching - find user photo by matching names
  const findUserPhoto = useCallback(async (leaderboardName: string): Promise<{ displayName: string; photoURL?: string } | undefined> => {
    if (!leaderboardName) return undefined
    
    const name = leaderboardName.trim()
    console.log(`🔍 Trying to match: "${name}"`)
    
    if (allUsers.length > 0) {
      console.log(`📋 Available users:`, allUsers.map(u => u.displayName))
      
      // Try exact match first
      let user = allUsers.find(u => u.displayName?.trim().toLowerCase() === name.toLowerCase())
      if (user && user.photoURL) {
        console.log(`✅ Exact match found: "${name}" -> "${user.displayName}" with photo: ${user.photoURL}`)
        return user
      }
      
      // Try matching without middle names/initials
      const nameParts = name.split(' ').filter((p: string) => p.length > 1) // ignore initials
      if (nameParts.length >= 2) {
        const firstName = nameParts[0]
        const lastName = nameParts[nameParts.length - 1]
        
        user = allUsers.find(u => {
          if (!u.displayName) return false
          const userParts = u.displayName.trim().split(' ').filter((p: string) => p.length > 1)
          if (userParts.length < 2) return false
          
          return firstName.toLowerCase() === userParts[0].toLowerCase() && 
                 lastName.toLowerCase() === userParts[userParts.length - 1].toLowerCase()
        })
        if (user && user.photoURL) {
          console.log(`✅ Fuzzy match found: "${name}" -> "${user.displayName}" with photo: ${user.photoURL}`)
          return user
        }
      }
    }
    
    // If no user found or user has no photo, try the photo CSV service
    const photoUrl = await photoService.findPhotoUrl(name)
    if (photoUrl) {
      console.log(`✅ Photo found in CSV for: "${name}" -> ${photoUrl}`)
      return {
        displayName: name,
        photoURL: photoUrl
      }
    }
    
    console.log(`❌ No match or photo found for: "${name}"`)
    return undefined
  }, [allUsers])

  // Check if a date is in the selected range
  const isInDateRange = useCallback((dateStr: string): boolean => {
    const filter = memoizedDateFilters.find(f => f.value === dateFilter)
    if (!filter) return true
    
    const [month, day, year] = dateStr.split('/')
    if (!month || !day || !year) return false
    
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    // Handle specific date ranges with end dates
    if (filter.end) {
      return date >= filter.start && date <= filter.end
    }
    
    // Handle ranges that go until today
    return date >= filter.start
  }, [dateFilter, memoizedDateFilters])

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/leaderboard-data')
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const { data } = await response.json()
      
      // Process closers - group by name and aggregate
      const closerStats = new Map<string, CloserData>()
      const setterStats = new Map<string, SetterData>()
      const selfGenStats = new Map<string, CloserData>()
      
      data.forEach((row: any) => {
        const closer = row.closer_name?.trim()
        const setter = row.setter_name?.trim()
        const isRealized = row.realization === '1'
        const kw = parseFloat(row.kw || '0')
        const ppw = parseFloat(row.net_ppw || '0')
        const revenue = kw * ppw
        const date = row.date_submitted
        
        // Apply date filter
        if (date && !isInDateRange(date)) return
        
        // Process closer data (only Net Deals where realization = 1)
        if (closer && isRealized) {
          if (!closerStats.has(closer)) {
            const userMatch = findUserPhoto(closer)
            
            closerStats.set(closer, {
              name: closer,
              sales: 0,
              revenue: 0, // Keep for interface compatibility but not displayed
              totalKW: 0,
              avgDealSize: 0, // Keep for interface compatibility but not displayed
              matchedProfile: userMatch ? {
                displayName: userMatch.displayName,
                photoURL: userMatch.photoURL,
                email: userMatch.displayName + '@company.com' // Placeholder email
              } : undefined
            })
          }
          const stats = closerStats.get(closer)!
          stats.sales += 1  // Count of Net Deals
          stats.totalKW += kw  // Sum of kW for Net Deals
        }
        
        // Process setter data (all leads - gross deals and gross kW)
        if (setter) {
          if (!setterStats.has(setter)) {
            const userMatch = findUserPhoto(setter)
            
            setterStats.set(setter, {
              name: setter,
              totalLeads: 0,
              grossKW: 0,
              matchedProfile: userMatch ? {
                displayName: userMatch.displayName,
                photoURL: userMatch.photoURL,
                email: userMatch.displayName + '@company.com' // Placeholder email
              } : undefined
            })
          }
          const stats = setterStats.get(setter)!
          stats.totalLeads += 1
          stats.grossKW += kw  // Add all kW regardless of realization
        }
        
        // Process self-gen data (setter === closer and net account)
        if (setter && closer && setter === closer && isRealized) {
          if (!selfGenStats.has(setter)) {
            const userMatch = findUserPhoto(setter)
            
            selfGenStats.set(setter, {
              name: setter,
              sales: 0,
              revenue: 0,
              totalKW: 0,
              avgDealSize: 0,
              matchedProfile: userMatch ? {
                displayName: userMatch.displayName,
                photoURL: userMatch.photoURL,
                email: userMatch.displayName + '@company.com'
              } : undefined
            })
          }
          const stats = selfGenStats.get(setter)!
          stats.sales += 1
          stats.totalKW += kw
        }
      })
      
      // Convert to arrays and sort
      const closersArray = Array.from(closerStats.values())
        .sort((a, b) => b.totalKW - a.totalKW)  // Rank by total kW (highest first)
      
      const settersArray = Array.from(setterStats.values())
        .sort((a, b) => b.grossKW - a.grossKW)  // Rank by gross kW (highest first)
      
      const selfGenArray = Array.from(selfGenStats.values())
        .sort((a, b) => b.totalKW - a.totalKW)
      
      setClosers(closersArray)
      setSetters(settersArray)
      setSelfGen(selfGenArray)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [findUserPhoto, isInDateRange]) // Dependencies: functions used

  // Load leaderboard data initially and whenever users change
  useEffect(() => {
    loadData()
  }, [loadData]) // Re-run when loadData changes

  // Check if a date is in the selected range (formatting functions)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatKW = (kw: number) => {
    return kw.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return (
      <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 font-bold border-yellow-500 shadow-lg px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-lg">
        <Trophy className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2 text-yellow-800" />
        <span className="hidden sm:inline">1st</span>
        <span className="sm:hidden">1</span>
      </Badge>
    )
    if (rank === 2) return (
      <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-gray-800 font-bold border-gray-400 shadow-lg px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-lg">
        <Medal className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2 text-gray-600" />
        <span className="hidden sm:inline">2nd</span>
        <span className="sm:hidden">2</span>
      </Badge>
    )
    if (rank === 3) return (
      <Badge className="bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 font-bold border-amber-500 shadow-lg px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-lg">
        <Medal className="w-4 h-4 sm:w-6 sm:h-6 mr-1 sm:mr-2 text-amber-200" />
        <span className="hidden sm:inline">3rd</span>
        <span className="sm:hidden">3</span>
      </Badge>
    )
    return <Badge variant="outline" className="font-semibold px-2 py-1 sm:px-3 sm:py-2 text-sm sm:text-lg">#{rank}</Badge>
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--accent-light)]" />
            <span className="text-lg text-[var(--text-primary)]">Loading leaderboard...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-2 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-1 tracking-tight text-[var(--text-primary)]">
            <Trophy className="inline-block mr-3 h-8 w-8 text-[var(--accent-light)]" />
            Performance Leaderboard
          </h1>
          <p className="text-base text-[var(--text-secondary)]">Track top performers across setters and closers</p>
          {error && (
            <p className="text-sm text-red-600 mt-1">{error}</p>
          )}
        </div>
        <Button
          onClick={loadData}
          variant="default"
          className="font-semibold shadow-md px-6 py-2 rounded-lg transition-all bg-gradient-to-r from-[var(--accent-primary)] to-[#0056CC] hover:opacity-90 text-white border-0"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''} mr-2`} />
          Refresh
        </Button>
      </div>

      {/* Date Filter */}
      <div className="frosted-glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="h-5 w-5 text-[var(--accent-light)]" />
            <span className="text-base font-medium text-[var(--text-primary)]">Date Range:</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[140px] font-medium bg-transparent border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-white/10">
                <span className="truncate">{dateFilters.find(f => f.value === dateFilter)?.label || 'Select Range'}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              {dateFilters.map(filter => (
                <DropdownMenuItem
                  key={filter.value}
                  onClick={() => setDateFilter(filter.value)}
                  className={dateFilter === filter.value ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-slate-800 dark:text-blue-400' : ''}
                >
                  {filter.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6">
        <div className="frosted-glass-card p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Total Setters</h3>
            <Users className="h-5 w-5 text-[var(--accent-light)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{setters.length}</div>
        </div>
        <div className="frosted-glass-card p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Total Closers</h3>
            <Target className="h-5 w-5 text-[var(--accent-light)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{closers.length}</div>
        </div>
        <div className="frosted-glass-card p-4 col-span-2 lg:col-span-1">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Total kW (Net)</h3>
            <TrendingUp className="h-5 w-5 text-[var(--accent-light)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{formatKW(closers.reduce((sum, c) => sum + c.totalKW, 0))} kW</div>
        </div>
      </div>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="closers" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto rounded-lg mb-4 bg-[var(--bg-color)] border border-[var(--glass-border)]">
          <TabsTrigger value="closers" className="text-base font-semibold py-2 rounded-lg data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white">Top Closers</TabsTrigger>
          <TabsTrigger value="setters" className="text-base font-semibold py-2 rounded-lg data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white">Top Setters</TabsTrigger>
          <TabsTrigger value="selfgen" className="text-base font-semibold py-2 rounded-lg data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-white">Top Self-Gen</TabsTrigger>
        </TabsList>

        {/* Top Closers Tab Content */}
        <TabsContent value="closers" className="space-y-4">
          <div className="frosted-glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-6 w-6 text-[var(--accent-light)]" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Top Closers</h2>
            </div>
            <div className="space-y-4">
              {closers.slice(0, 10).map((closer, index) => {
                const displayName = closer.matchedProfile?.displayName || closer.name;
                const avatarUrl = closer.matchedProfile?.photoURL;
                const isFirstPlace = index === 0;
                
                return (
                  <div
                    key={closer.name}
                    className={`
                      flex items-center justify-between p-4 sm:p-6 border rounded-xl relative overflow-hidden
                      ${isFirstPlace 
                        ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 shadow-lg' 
                        : 'bg-white/5 border-[var(--glass-border)]'
                      } 
                      hover:bg-white/10 transition-all duration-200 cursor-pointer
                    `}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="shrink-0">
                        {getRankBadge(index + 1)}
                      </div>
                      <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-[var(--accent-light)]/30 bg-white shadow-lg">
                        <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                        <AvatarFallback className="text-lg font-bold text-[var(--accent-primary)] bg-white/90">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg sm:text-2xl mb-1 truncate text-[var(--text-primary)]">{displayName}</p>
                        <div className="hidden sm:block">
                          <p className="text-sm font-medium mb-1 text-[var(--text-secondary)]">Net Deals</p>
                          <p className="font-bold text-xl text-[var(--accent-light)]">{closer.sales}</p>
                        </div>
                        <div className="sm:hidden">
                          <p className="text-xs text-[var(--text-secondary)]">Net Deals: <span className="font-bold text-[var(--accent-light)]">{closer.sales}</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs sm:text-sm font-medium mb-1 text-[var(--text-secondary)]">Total kW</p>
                      <p className="font-bold text-lg sm:text-2xl text-[var(--accent-light)]">{formatKW(closer.totalKW)}</p>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] opacity-70">kW</p>
                    </div>
                  </div>
                )
              })}
              {closers.length === 0 && (
                <div className="text-center p-8 text-[var(--text-secondary)]">
                  No closer data available for the selected date range.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Top Setters Tab Content */}
        <TabsContent value="setters" className="space-y-4">
          <div className="frosted-glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-6 w-6 text-[var(--accent-light)]" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Top Setters</h2>
            </div>
            <div className="space-y-4">
              {setters.slice(0, 10).map((setter, index) => {
                const displayName = setter.matchedProfile?.displayName || setter.name;
                const avatarUrl = setter.matchedProfile?.photoURL;
                const isFirstPlace = index === 0;
                
                return (
                  <div
                    key={setter.name}
                    className={`
                      flex items-center justify-between p-4 sm:p-6 border rounded-xl relative overflow-hidden
                      ${isFirstPlace 
                        ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 shadow-lg' 
                        : 'bg-white/5 border-[var(--glass-border)]'
                      } 
                      hover:bg-white/10 transition-all duration-200 cursor-pointer
                    `}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="shrink-0">
                        {getRankBadge(index + 1)}
                      </div>
                      <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-[var(--accent-light)]/30 bg-white shadow-lg">
                        <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                        <AvatarFallback className="text-lg font-bold text-[var(--accent-primary)] bg-white/90">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg sm:text-2xl mb-1 truncate text-[var(--text-primary)]">{displayName}</p>
                        <div className="hidden sm:block">
                          <p className="text-sm font-medium mb-1 text-[var(--text-secondary)]">Gross Deals</p>
                          <p className="font-bold text-xl text-[var(--accent-light)]">{setter.totalLeads}</p>
                        </div>
                        <div className="sm:hidden">
                          <p className="text-xs text-[var(--text-secondary)]">Gross Deals: <span className="font-bold text-[var(--accent-light)]">{setter.totalLeads}</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs sm:text-sm font-medium mb-1 text-[var(--text-secondary)]">Gross kW</p>
                      <p className="font-bold text-lg sm:text-2xl text-[var(--accent-light)]">{formatKW(setter.grossKW)}</p>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] opacity-70">kW</p>
                    </div>
                  </div>
                )
              })}
              {setters.length === 0 && (
                <div className="text-center p-8 text-[var(--text-secondary)]">
                  No setter data available for the selected date range.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Top Self-Gen Tab Content */}
        <TabsContent value="selfgen" className="space-y-4">
          <div className="frosted-glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-6 w-6 text-[var(--accent-light)]" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Top Self-Gen</h2>
            </div>
            <div className="space-y-4">
              {selfGen.slice(0, 10).map((person, index) => {
                const displayName = person.matchedProfile?.displayName || person.name;
                const avatarUrl = person.matchedProfile?.photoURL;
                const isFirstPlace = index === 0;
                
                return (
                  <div
                    key={person.name}
                    className={`
                      flex items-center justify-between p-4 sm:p-6 border rounded-xl relative overflow-hidden
                      ${isFirstPlace 
                        ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 shadow-lg' 
                        : 'bg-white/5 border-[var(--glass-border)]'
                      } 
                      hover:bg-white/10 transition-all duration-200 cursor-pointer
                    `}
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="shrink-0">
                        {getRankBadge(index + 1)}
                      </div>
                      <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-[var(--accent-light)]/30 bg-white shadow-lg">
                        <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                        <AvatarFallback className="text-lg font-bold text-[var(--accent-primary)] bg-white/90">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg sm:text-2xl mb-1 truncate text-[var(--text-primary)]">{displayName}</p>
                        <div className="hidden sm:block">
                          <p className="text-sm font-medium mb-1 text-[var(--text-secondary)]">Net Self-Gen Deals</p>
                          <p className="font-bold text-xl text-[var(--accent-light)]">{person.sales}</p>
                        </div>
                        <div className="sm:hidden">
                          <p className="text-xs text-[var(--text-secondary)]">Net Self-Gen Deals: <span className="font-bold text-[var(--accent-light)]">{person.sales}</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs sm:text-sm font-medium mb-1 text-[var(--text-secondary)]">Total kW</p>
                      <p className="font-bold text-lg sm:text-2xl text-[var(--accent-light)]">{formatKW(person.totalKW)}</p>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] opacity-70">kW</p>
                    </div>
                  </div>
                )
              })}
              {selfGen.length === 0 && (
                <div className="text-center p-8 text-[var(--text-secondary)]">
                  No self-gen data available for the selected date range.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}