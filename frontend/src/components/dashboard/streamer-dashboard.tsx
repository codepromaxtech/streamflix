'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Users, 
  Eye, 
  Heart, 
  Gift, 
  TrendingUp,
  Calendar,
  Clock,
  Star,
  MessageCircle,
  Share2,
  Download,
  Play,
  Video,
  Settings
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StreamerDashboardProps {
  streamerId: string;
}

const StreamerDashboard: React.FC<StreamerDashboardProps> = ({ streamerId }) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchStreamerData();
  }, [streamerId, timeRange]);

  const fetchStreamerData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      const mockData = {
        earnings: {
          totalEarnings: 12450.75,
          monthlyEarnings: 3250.50,
          donationsReceived: 8500.25,
          giftsReceived: 2150.50,
          privateSessionEarnings: 1800.00,
          pendingPayouts: 450.75,
        },
        audience: {
          totalFollowers: 15420,
          averageViewers: 285,
          peakViewers: 1250,
          viewerGrowth: 18.5,
          topCountries: [
            { country: 'United States', viewers: 6168 },
            { country: 'United Kingdom', viewers: 2313 },
            { country: 'Canada', viewers: 1542 },
            { country: 'Australia', viewers: 1234 },
            { country: 'Germany', viewers: 1089 },
          ],
        },
        content: {
          totalStreams: 145,
          totalStreamTime: 320, // hours
          averageStreamDuration: 2.2, // hours
          mostPopularContent: [
            { title: 'Gaming Marathon Stream', views: 8500 },
            { title: 'Q&A with Fans', views: 6200 },
            { title: 'New Game First Look', views: 5800 },
            { title: 'Cooking Stream', views: 4500 },
            { title: 'Music Performance', views: 4100 },
          ],
        },
        engagement: {
          chatMessages: 45230,
          likes: 12450,
          shares: 890,
          averageEngagement: 8.7,
        },
        schedule: [
          { day: 'Monday', time: '7:00 PM', duration: '2 hours', title: 'Gaming Night' },
          { day: 'Wednesday', time: '8:00 PM', duration: '1.5 hours', title: 'Q&A Session' },
          { day: 'Friday', time: '6:00 PM', duration: '3 hours', title: 'Weekend Kickoff' },
          { day: 'Sunday', time: '3:00 PM', duration: '2 hours', title: 'Chill Stream' },
        ],
        goals: {
          monthlyEarningsGoal: 4000,
          followersGoal: 20000,
          averageViewersGoal: 350,
        },
      };
      
      setReportData(mockData);
    } catch (error) {
      console.error('Error fetching streamer data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const earningsProgress = (reportData.earnings.monthlyEarnings / reportData.goals.monthlyEarningsGoal) * 100;
  const followersProgress = (reportData.audience.totalFollowers / reportData.goals.followersGoal) * 100;
  const viewersProgress = (reportData.audience.averageViewers / reportData.goals.averageViewersGoal) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">
            Track your performance and grow your audience
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button>
            <Video className="mr-2 h-4 w-4" />
            Go Live
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportData.earnings.monthlyEarnings.toFixed(2)}</div>
            <Progress value={earningsProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              ${reportData.goals.monthlyEarningsGoal - reportData.earnings.monthlyEarnings} to goal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.audience.totalFollowers.toLocaleString()}</div>
            <Progress value={followersProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600">+{reportData.audience.viewerGrowth}%</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Viewers</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.audience.averageViewers}</div>
            <Progress value={viewersProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Peak: {reportData.audience.peakViewers} viewers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.engagement.averageEngagement}/10</div>
            <p className="text-xs text-muted-foreground">
              {reportData.engagement.chatMessages.toLocaleString()} chat messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Viewer Growth</CardTitle>
                <CardDescription>Daily average viewers over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={[
                    { date: '2024-01-01', viewers: 180, engagement: 7.2 },
                    { date: '2024-01-08', viewers: 195, engagement: 7.5 },
                    { date: '2024-01-15', viewers: 220, engagement: 8.1 },
                    { date: '2024-01-22', viewers: 245, engagement: 8.3 },
                    { date: '2024-01-29', viewers: 270, engagement: 8.7 },
                    { date: '2024-02-05', viewers: 285, engagement: 8.9 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="viewers" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Your latest milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">15K Followers</p>
                      <p className="text-sm text-muted-foreground">Reached yesterday</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">$3K Monthly Earnings</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Eye className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">1.2K Peak Viewers</p>
                      <p className="text-sm text-muted-foreground">Personal best</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Stream Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Streams</span>
                    <span className="font-medium">{reportData.content.totalStreams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stream Time</span>
                    <span className="font-medium">{reportData.content.totalStreamTime}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Duration</span>
                    <span className="font-medium">{reportData.content.averageStreamDuration}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Chat Messages</span>
                    <span className="font-medium">{reportData.engagement.chatMessages.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Likes</span>
                    <span className="font-medium">{reportData.engagement.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shares</span>
                    <span className="font-medium">{reportData.engagement.shares}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Video className="mr-2 h-4 w-4" />
                    Start Stream
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Stream
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Stream Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Breakdown</CardTitle>
                <CardDescription>Revenue sources this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>Donations</span>
                    </div>
                    <span className="font-medium">${reportData.earnings.donationsReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gift className="h-4 w-4 text-purple-500" />
                      <span>Virtual Gifts</span>
                    </div>
                    <span className="font-medium">${reportData.earnings.giftsReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4 text-blue-500" />
                      <span>Private Sessions</span>
                    </div>
                    <span className="font-medium">${reportData.earnings.privateSessionEarnings.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Earnings</span>
                    <span>${reportData.earnings.totalEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Pending Payouts</span>
                    <span>${reportData.earnings.pendingPayouts.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings Trend</CardTitle>
                <CardDescription>Monthly earnings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { month: 'Oct', earnings: 2100 },
                    { month: 'Nov', earnings: 2450 },
                    { month: 'Dec', earnings: 2800 },
                    { month: 'Jan', earnings: 3250 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="earnings" stroke="#00C49F" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payout Information</CardTitle>
              <CardDescription>Payment details and schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Next Payout</p>
                  <p className="font-medium">February 15, 2024</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payout Amount</p>
                  <p className="font-medium">${reportData.earnings.pendingPayouts.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">Bank Transfer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Audience Geography</CardTitle>
                <CardDescription>Top countries by viewership</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.audience.topCountries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="viewers" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audience Growth</CardTitle>
                <CardDescription>Follower growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={[
                    { month: 'Oct', followers: 12500 },
                    { month: 'Nov', followers: 13200 },
                    { month: 'Dec', followers: 14100 },
                    { month: 'Jan', followers: 15420 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="followers" stroke="#FF8042" fill="#FF8042" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Content</CardTitle>
              <CardDescription>Your top-performing streams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.content.mostPopularContent.map((content: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{content.title}</p>
                        <p className="text-sm text-muted-foreground">{content.views.toLocaleString()} views</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Streaming Schedule</CardTitle>
              <CardDescription>Your upcoming streams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.schedule.map((stream: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{stream.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {stream.day} at {stream.time} • {stream.duration}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4">
                <Calendar className="mr-2 h-4 w-4" />
                Add New Stream
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StreamerDashboard;
