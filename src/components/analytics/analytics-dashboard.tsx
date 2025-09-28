'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Play, 
  DollarSign, 
  Activity, 
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Clock,
  Star,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsData {
  users: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    churnRate: number;
    userGrowthRate: number;
    averageSessionDuration: number;
    userRetention: {
      day1: number;
      day7: number;
      day30: number;
    };
    demographics: {
      ageGroups: Record<string, number>;
      countries: Record<string, number>;
      devices: Record<string, number>;
    };
  };
  content: {
    totalContent: number;
    publishedContent: number;
    totalViews: number;
    totalWatchTime: number;
    averageRating: number;
    topContent: Array<{
      id: string;
      title: string;
      views: number;
      rating: number;
      watchTime: number;
    }>;
    contentPerformance: {
      completionRate: number;
      dropOffPoints: number[];
      engagementScore: number;
    };
    genrePopularity: Record<string, number>;
  };
  engagement: {
    totalSessions: number;
    averageSessionLength: number;
    bounceRate: number;
    pageViews: number;
    searchQueries: number;
    socialShares: number;
    comments: number;
    likes: number;
    watchlistAdditions: number;
    downloadCount: number;
  };
  revenue: {
    totalRevenue: number;
    subscriptionRevenue: number;
    adRevenue: number;
    transactionRevenue: number;
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    customerLifetimeValue: number;
    churnRevenue: number;
    revenueGrowth: number;
    conversionRate: number;
  };
  performance: {
    averageLoadTime: number;
    errorRate: number;
    uptime: number;
    bandwidthUsage: number;
    cdnHitRate: number;
    apiResponseTime: number;
    videoStartTime: number;
    bufferingRatio: number;
    qualityDistribution: Record<string, number>;
  };
  streaming: {
    totalStreams: number;
    liveStreams: number;
    concurrentViewers: number;
    peakConcurrentViewers: number;
    averageViewDuration: number;
    streamQuality: Record<string, number>;
    deviceTypes: Record<string, number>;
    geographicDistribution: Record<string, number>;
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  description, 
  format = 'number' 
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'duration':
        return `${val.toFixed(1)}min`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground">
            {change >= 0 ? (
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
            )}
            <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="ml-1">from last period</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, reportType]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setData(mockAnalyticsData);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  const exportReport = () => {
    // Implement report export functionality
    console.log('Exporting report...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your streaming platform performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-64">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.start, to: dateRange.end }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ start: range.from, end: range.to });
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          
          <Button onClick={fetchAnalyticsData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="streaming">Streaming</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={data.users.totalUsers}
              change={data.users.userGrowthRate}
              icon={<Users />}
              description="Active registered users"
            />
            <MetricCard
              title="Total Revenue"
              value={data.revenue.totalRevenue}
              change={data.revenue.revenueGrowth}
              icon={<DollarSign />}
              format="currency"
              description="Revenue this period"
            />
            <MetricCard
              title="Content Views"
              value={data.content.totalViews}
              icon={<Eye />}
              description="Total content views"
            />
            <MetricCard
              title="Watch Time"
              value={data.content.totalWatchTime / 60}
              icon={<Clock />}
              format="duration"
              description="Total hours watched"
            />
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trend</CardTitle>
                <CardDescription>Daily active users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockTimeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue sources distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Subscriptions', value: data.revenue.subscriptionRevenue },
                        { name: 'Advertisements', value: data.revenue.adRevenue },
                        { name: 'Transactions', value: data.revenue.transactionRevenue },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Subscriptions', value: data.revenue.subscriptionRevenue },
                        { name: 'Advertisements', value: data.revenue.adRevenue },
                        { name: 'Transactions', value: data.revenue.transactionRevenue },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Content */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Most watched content this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.content.topContent.slice(0, 5).map((content, index) => (
                  <div key={content.id} className="flex items-center space-x-4">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <div className="flex-1">
                      <p className="font-medium">{content.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {content.views.toLocaleString()} views • {content.rating.toFixed(1)} ★
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{(content.watchTime / 60).toFixed(1)}h</p>
                      <p className="text-sm text-muted-foreground">watch time</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Active Users"
              value={data.users.activeUsers}
              change={data.users.userGrowthRate}
              icon={<Users />}
              description="Users active in the last 30 days"
            />
            <MetricCard
              title="New Users"
              value={data.users.newUsers}
              icon={<Users />}
              description="New registrations this period"
            />
            <MetricCard
              title="Churn Rate"
              value={data.users.churnRate}
              icon={<TrendingDown />}
              format="percentage"
              description="Users who stopped using the platform"
            />
            <MetricCard
              title="Session Duration"
              value={data.users.averageSessionDuration}
              icon={<Clock />}
              format="duration"
              description="Average time per session"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Retention</CardTitle>
                <CardDescription>Percentage of users returning</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { period: 'Day 1', retention: data.users.userRetention.day1 },
                    { period: 'Day 7', retention: data.users.userRetention.day7 },
                    { period: 'Day 30', retention: data.users.userRetention.day30 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="retention" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
                <CardDescription>User devices breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(data.users.demographics.devices).map(([device, count]) => ({
                        name: device,
                        value: count,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.entries(data.users.demographics.devices).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Content"
              value={data.content.totalContent}
              icon={<Play />}
              description="Total content items"
            />
            <MetricCard
              title="Published Content"
              value={data.content.publishedContent}
              icon={<Eye />}
              description="Publicly available content"
            />
            <MetricCard
              title="Average Rating"
              value={data.content.averageRating}
              icon={<Star />}
              format="number"
              description="Out of 5 stars"
            />
            <MetricCard
              title="Completion Rate"
              value={data.content.contentPerformance.completionRate}
              icon={<Activity />}
              format="percentage"
              description="Content completion rate"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Genre Popularity</CardTitle>
              <CardDescription>Most popular content genres</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(data.content.genrePopularity).map(([genre, popularity]) => ({
                  genre,
                  popularity,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="genre" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="popularity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Monthly Recurring Revenue"
              value={data.revenue.monthlyRecurringRevenue}
              change={data.revenue.revenueGrowth}
              icon={<DollarSign />}
              format="currency"
              description="Predictable monthly revenue"
            />
            <MetricCard
              title="Average Revenue Per User"
              value={data.revenue.averageRevenuePerUser}
              icon={<DollarSign />}
              format="currency"
              description="Revenue per active user"
            />
            <MetricCard
              title="Customer Lifetime Value"
              value={data.revenue.customerLifetimeValue}
              icon={<TrendingUp />}
              format="currency"
              description="Expected revenue per customer"
            />
            <MetricCard
              title="Conversion Rate"
              value={data.revenue.conversionRate}
              icon={<Activity />}
              format="percentage"
              description="Free to paid conversion"
            />
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Average Load Time"
              value={data.performance.averageLoadTime}
              icon={<Zap />}
              format="number"
              description="Page load time in seconds"
            />
            <MetricCard
              title="Uptime"
              value={data.performance.uptime}
              icon={<Activity />}
              format="percentage"
              description="System availability"
            />
            <MetricCard
              title="Error Rate"
              value={data.performance.errorRate * 100}
              icon={<TrendingDown />}
              format="percentage"
              description="Application error rate"
            />
            <MetricCard
              title="CDN Hit Rate"
              value={data.performance.cdnHitRate}
              icon={<Zap />}
              format="percentage"
              description="Content delivery efficiency"
            />
          </div>
        </TabsContent>

        {/* Streaming Tab */}
        <TabsContent value="streaming" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Live Streams"
              value={data.streaming.liveStreams}
              icon={<Play />}
              description="Currently live streams"
            />
            <MetricCard
              title="Concurrent Viewers"
              value={data.streaming.concurrentViewers}
              icon={<Users />}
              description="Current viewers across all streams"
            />
            <MetricCard
              title="Peak Viewers"
              value={data.streaming.peakConcurrentViewers}
              icon={<TrendingUp />}
              description="Highest concurrent viewers"
            />
            <MetricCard
              title="Average View Duration"
              value={data.streaming.averageViewDuration}
              icon={<Clock />}
              format="duration"
              description="Average time spent watching"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Mock data and constants
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const mockTimeSeriesData = [
  { date: '2024-01-01', users: 1200, revenue: 15000 },
  { date: '2024-01-02', users: 1350, revenue: 16200 },
  { date: '2024-01-03', users: 1180, revenue: 14800 },
  { date: '2024-01-04', users: 1420, revenue: 17500 },
  { date: '2024-01-05', users: 1600, revenue: 19200 },
  { date: '2024-01-06', users: 1750, revenue: 21000 },
  { date: '2024-01-07', users: 1890, revenue: 22800 },
];

const mockAnalyticsData: AnalyticsData = {
  users: {
    totalUsers: 45230,
    activeUsers: 32150,
    newUsers: 2340,
    churnRate: 3.2,
    userGrowthRate: 12.5,
    averageSessionDuration: 28.5,
    userRetention: {
      day1: 85,
      day7: 65,
      day30: 45,
    },
    demographics: {
      ageGroups: {
        '18-24': 25,
        '25-34': 35,
        '35-44': 20,
        '45-54': 15,
        '55+': 5,
      },
      countries: {
        'US': 40,
        'UK': 15,
        'Canada': 10,
        'Australia': 8,
        'Other': 27,
      },
      devices: {
        'Desktop': 45,
        'Mobile': 40,
        'Tablet': 10,
        'Smart TV': 5,
      },
    },
  },
  content: {
    totalContent: 1250,
    publishedContent: 980,
    totalViews: 2340000,
    totalWatchTime: 156000,
    averageRating: 4.2,
    topContent: [
      { id: '1', title: 'Popular Movie 1', views: 125000, rating: 4.8, watchTime: 8500 },
      { id: '2', title: 'Trending Series 1', views: 98000, rating: 4.6, watchTime: 12000 },
      { id: '3', title: 'Documentary Special', views: 76000, rating: 4.4, watchTime: 5200 },
      { id: '4', title: 'Comedy Show', views: 65000, rating: 4.3, watchTime: 3800 },
      { id: '5', title: 'Action Thriller', views: 54000, rating: 4.5, watchTime: 6200 },
    ],
    contentPerformance: {
      completionRate: 72.5,
      dropOffPoints: [15, 45, 75],
      engagementScore: 8.2,
    },
    genrePopularity: {
      'Action': 25,
      'Drama': 20,
      'Comedy': 18,
      'Thriller': 15,
      'Documentary': 12,
      'Other': 10,
    },
  },
  engagement: {
    totalSessions: 156000,
    averageSessionLength: 28.5,
    bounceRate: 15.2,
    pageViews: 890000,
    searchQueries: 45000,
    socialShares: 12000,
    comments: 8500,
    likes: 156000,
    watchlistAdditions: 23000,
    downloadCount: 5600,
  },
  revenue: {
    totalRevenue: 485000,
    subscriptionRevenue: 320000,
    adRevenue: 125000,
    transactionRevenue: 40000,
    monthlyRecurringRevenue: 280000,
    averageRevenuePerUser: 15.08,
    customerLifetimeValue: 180,
    churnRevenue: 12000,
    revenueGrowth: 18.5,
    conversionRate: 7.2,
  },
  performance: {
    averageLoadTime: 1.2,
    errorRate: 0.008,
    uptime: 99.95,
    bandwidthUsage: 1024 * 1024 * 1024 * 500,
    cdnHitRate: 94.5,
    apiResponseTime: 145,
    videoStartTime: 2.1,
    bufferingRatio: 0.015,
    qualityDistribution: {
      '240p': 8,
      '480p': 22,
      '720p': 45,
      '1080p': 20,
      '4K': 5,
    },
  },
  streaming: {
    totalStreams: 2340,
    liveStreams: 45,
    concurrentViewers: 8500,
    peakConcurrentViewers: 12500,
    averageViewDuration: 18.5,
    streamQuality: {
      '720p': 60,
      '1080p': 35,
      '4K': 5,
    },
    deviceTypes: {
      'Desktop': 45,
      'Mobile': 40,
      'Tablet': 10,
      'Smart TV': 5,
    },
    geographicDistribution: {
      'North America': 40,
      'Europe': 30,
      'Asia': 20,
      'Other': 10,
    },
  },
};

export default AnalyticsDashboard;
