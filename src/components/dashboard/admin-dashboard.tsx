'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  DollarSign, 
  Play, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Server,
  Globe,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AdminDashboardProps {
  tenantId?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ tenantId }) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchReportData();
  }, [timeRange, tenantId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      const mockData = {
        overview: {
          totalUsers: 45230,
          activeUsers: 32150,
          totalStreamers: 1250,
          activeStreamers: 890,
          totalRevenue: 485000,
          monthlyRevenue: 125000,
          totalContent: 8500,
          totalViews: 2340000,
        },
        userMetrics: {
          newRegistrations: 2340,
          userGrowthRate: 12.5,
          churnRate: 3.2,
          averageSessionTime: 28.5,
          topCountries: [
            { country: 'United States', users: 18092 },
            { country: 'United Kingdom', users: 6785 },
            { country: 'Canada', users: 4523 },
            { country: 'Australia', users: 3615 },
            { country: 'Germany', users: 3210 },
          ],
        },
        contentMetrics: {
          uploadsThisMonth: 450,
          totalWatchTime: 156000,
          topCategories: [
            { category: 'Gaming', views: 580000 },
            { category: 'Entertainment', views: 420000 },
            { category: 'Education', views: 380000 },
            { category: 'Music', views: 320000 },
            { category: 'Sports', views: 280000 },
          ],
          contentEngagement: 8.2,
        },
        revenueMetrics: {
          subscriptionRevenue: 320000,
          donationRevenue: 125000,
          adRevenue: 40000,
          revenueByCountry: [
            { country: 'United States', revenue: 194000 },
            { country: 'United Kingdom', revenue: 72750 },
            { country: 'Canada', revenue: 48500 },
            { country: 'Australia', revenue: 38800 },
            { country: 'Germany', revenue: 34425 },
          ],
        },
        systemMetrics: {
          serverUptime: 99.95,
          averageLoadTime: 1.2,
          errorRate: 0.008,
          bandwidthUsage: 1024 * 1024 * 1024 * 500,
        },
      };
      
      setReportData(mockData);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    console.log('Exporting admin report...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and management console
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={fetchReportData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.overview.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" />
                +{reportData.userMetrics.userGrowthRate}%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${reportData.overview.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" />
                +18.5%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streamers</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.overview.activeStreamers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {reportData.overview.totalStreamers.toLocaleString()} total streamers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {reportData.systemMetrics.serverUptime}%
              <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Server uptime
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={[
                    { month: 'Jan', revenue: 85000, users: 28000 },
                    { month: 'Feb', revenue: 92000, users: 31000 },
                    { month: 'Mar', revenue: 98000, users: 34000 },
                    { month: 'Apr', revenue: 105000, users: 37000 },
                    { month: 'May', revenue: 115000, users: 41000 },
                    { month: 'Jun', revenue: 125000, users: 45000 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Revenue Sources</CardTitle>
                <CardDescription>
                  Revenue breakdown by source
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Subscriptions', value: reportData.revenueMetrics.subscriptionRevenue },
                        { name: 'Donations', value: reportData.revenueMetrics.donationRevenue },
                        { name: 'Ads', value: reportData.revenueMetrics.adRevenue },
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
                        { name: 'Subscriptions', value: reportData.revenueMetrics.subscriptionRevenue },
                        { name: 'Donations', value: reportData.revenueMetrics.donationRevenue },
                        { name: 'Ads', value: reportData.revenueMetrics.adRevenue },
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>Users by country</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.userMetrics.topCountries.slice(0, 5).map((country: any, index: number) => (
                    <div key={country.country} className="flex items-center">
                      <Badge variant="secondary" className="mr-2">{index + 1}</Badge>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{country.country}</span>
                          <span className="text-sm text-muted-foreground">
                            {country.users.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Server Uptime</span>
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      {reportData.systemMetrics.serverUptime}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Load Time</span>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-blue-500" />
                      {reportData.systemMetrics.averageLoadTime}s
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Error Rate</span>
                    <div className="flex items-center">
                      {reportData.systemMetrics.errorRate < 0.01 ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                      )}
                      {(reportData.systemMetrics.errorRate * 100).toFixed(3)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common admin tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Play className="mr-2 h-4 w-4" />
                    Content Moderation
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Payment Settings
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Server className="mr-2 h-4 w-4" />
                    System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New user registrations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { month: 'Jan', users: 1200 },
                    { month: 'Feb', users: 1450 },
                    { month: 'Mar', users: 1680 },
                    { month: 'Apr', users: 1920 },
                    { month: 'May', users: 2150 },
                    { month: 'Jun', users: 2340 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>Activity metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Session Time</span>
                    <span className="font-medium">{reportData.userMetrics.averageSessionTime} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User Growth Rate</span>
                    <span className="font-medium text-green-600">+{reportData.userMetrics.userGrowthRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Churn Rate</span>
                    <span className="font-medium text-red-600">{reportData.userMetrics.churnRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Users</span>
                    <span className="font-medium">{reportData.overview.activeUsers.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Content Categories</CardTitle>
                <CardDescription>Views by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.contentMetrics.topCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Stats</CardTitle>
                <CardDescription>Platform content overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Content</span>
                    <span className="font-medium">{reportData.overview.totalContent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploads This Month</span>
                    <span className="font-medium">{reportData.contentMetrics.uploadsThisMonth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Views</span>
                    <span className="font-medium">{reportData.overview.totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engagement Score</span>
                    <span className="font-medium">{reportData.contentMetrics.contentEngagement}/10</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Country</CardTitle>
                <CardDescription>Top revenue generating countries</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.revenueMetrics.revenueByCountry}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
                <CardDescription>Financial overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Revenue</span>
                    <span className="font-medium">${reportData.overview.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subscription Revenue</span>
                    <span className="font-medium">${reportData.revenueMetrics.subscriptionRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Donation Revenue</span>
                    <span className="font-medium">${reportData.revenueMetrics.donationRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ad Revenue</span>
                    <span className="font-medium">${reportData.revenueMetrics.adRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Server Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Uptime</span>
                    <Badge className="bg-green-500">{reportData.systemMetrics.serverUptime}%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Load Time</span>
                    <Badge variant="secondary">{reportData.systemMetrics.averageLoadTime}s</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Error Rate</span>
                    <Badge className="bg-green-500">{(reportData.systemMetrics.errorRate * 100).toFixed(3)}%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Bandwidth</span>
                    <span className="font-medium">500 GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Storage</span>
                    <span className="font-medium">2.5 TB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>CDN Hits</span>
                    <span className="font-medium">94.5%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Server className="mr-2 h-4 w-4" />
                    Server Status
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="mr-2 h-4 w-4" />
                    Performance Logs
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Globe className="mr-2 h-4 w-4" />
                    CDN Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
