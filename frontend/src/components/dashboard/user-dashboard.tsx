'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  Heart, 
  Gift, 
  Star, 
  Trophy, 
  Crown, 
  Play, 
  Eye,
  TrendingUp,
  Calendar,
  Bookmark,
  Settings,
  Download,
  Zap,
  Target,
  Award
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AvatarGallery from '../profile/avatar-gallery';

interface UserDashboardProps {
  userId: string;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ userId }) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      const mockData = {
        profile: {
          name: 'John Doe',
          email: 'john.doe@example.com',
          avatar: '/avatars/user-avatar.png',
          joinedDate: '2023-06-15',
          subscription: 'Premium',
          subscriptionExpiry: '2024-06-15',
        },
        activity: {
          totalWatchTime: 156, // hours
          sessionsCount: 245,
          averageSessionTime: 38, // minutes
          favoriteGenres: [
            { genre: 'Gaming', watchTime: 45 },
            { genre: 'Entertainment', watchTime: 38 },
            { genre: 'Education', watchTime: 32 },
            { genre: 'Music', watchTime: 25 },
            { genre: 'Sports', watchTime: 16 },
          ],
        },
        spending: {
          totalSpent: 285.50,
          donationsGiven: 125.75,
          giftsGiven: 89.25,
          subscriptionCost: 70.50,
          privateSessionsCost: 0,
        },
        achievements: {
          level: 15,
          currentXP: 2750,
          nextLevelXP: 3000,
          totalXP: 12750,
          unlockedAvatars: 8,
          completedAchievements: 23,
          recentAchievements: [
            { name: 'Binge Watcher', description: 'Watch 100+ hours', unlockedAt: '2024-01-20', rarity: 'gold' },
            { name: 'Generous Donor', description: 'Donate $100+', unlockedAt: '2024-01-15', rarity: 'silver' },
            { name: 'Social Butterfly', description: 'Follow 50+ streamers', unlockedAt: '2024-01-10', rarity: 'bronze' },
          ],
        },
        social: {
          followingCount: 67,
          followersCount: 12,
          commentsPosted: 156,
          likesGiven: 890,
        },
        watchHistory: [
          { title: 'Epic Gaming Stream', streamer: 'GameMaster', duration: 120, date: '2024-01-25' },
          { title: 'Cooking Tutorial', streamer: 'ChefPro', duration: 45, date: '2024-01-24' },
          { title: 'Music Performance', streamer: 'MusicStar', duration: 90, date: '2024-01-23' },
          { title: 'Tech Review', streamer: 'TechGuru', duration: 60, date: '2024-01-22' },
        ],
        favorites: [
          { name: 'GameMaster', category: 'Gaming', followers: '125K', avatar: '/avatars/gamemaster.png' },
          { name: 'ChefPro', category: 'Cooking', followers: '89K', avatar: '/avatars/chefpro.png' },
          { name: 'MusicStar', category: 'Music', followers: '156K', avatar: '/avatars/musicstar.png' },
        ],
        recommendations: [
          { title: 'New Gaming Stream', streamer: 'ProGamer', category: 'Gaming', viewers: 1250 },
          { title: 'Cooking Masterclass', streamer: 'CulinaryArt', category: 'Cooking', viewers: 890 },
          { title: 'Live Concert', streamer: 'RockBand', category: 'Music', viewers: 2100 },
        ],
        goals: {
          monthlyWatchTime: 40, // hours
          currentMonthWatchTime: 28,
          achievementTarget: 30,
          currentAchievements: 23,
        },
      };
      
      setReportData(mockData);
    } catch (error) {
      console.error('Error fetching user data:', error);
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

  const levelProgress = (reportData.achievements.currentXP / reportData.achievements.nextLevelXP) * 100;
  const watchTimeProgress = (reportData.goals.currentMonthWatchTime / reportData.goals.monthlyWatchTime) * 100;
  const achievementProgress = (reportData.achievements.completedAchievements / reportData.goals.achievementTarget) * 100;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={reportData.profile.avatar} alt={reportData.profile.name} />
            <AvatarFallback>{reportData.profile.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {reportData.profile.name.split(' ')[0]}!</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              Level {reportData.achievements.level} • {reportData.profile.subscription} Member
              <Badge className="bg-purple-500">
                <Crown className="w-3 h-3 mr-1" />
                {reportData.profile.subscription}
              </Badge>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watch Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.activity.totalWatchTime}h</div>
            <Progress value={watchTimeProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {reportData.goals.currentMonthWatchTime}h this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Level Progress</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {reportData.achievements.level}</div>
            <Progress value={levelProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {reportData.achievements.nextLevelXP - reportData.achievements.currentXP} XP to next level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportData.spending.totalSpent}</div>
            <p className="text-xs text-muted-foreground">
              Supporting {reportData.social.followingCount} creators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.achievements.completedAchievements}</div>
            <Progress value={achievementProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {reportData.achievements.unlockedAvatars} avatars unlocked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="avatars">Avatars</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Watch Time Trend</CardTitle>
                <CardDescription>Your viewing activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={[
                    { week: 'Week 1', hours: 8, sessions: 12 },
                    { week: 'Week 2', hours: 12, sessions: 18 },
                    { week: 'Week 3', hours: 15, sessions: 22 },
                    { week: 'Week 4', hours: 18, sessions: 25 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="hours" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Favorite Genres</CardTitle>
                <CardDescription>Your viewing preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={reportData.activity.favoriteGenres}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ genre, percent }) => `${genre} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="watchTime"
                    >
                      {reportData.activity.favoriteGenres.map((entry: any, index: number) => (
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
                <CardTitle>Recent Watch History</CardTitle>
                <CardDescription>Your latest viewing sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.watchHistory.slice(0, 4).map((item: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Play className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.streamer} • {item.duration}min • {item.date}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Favorite Streamers</CardTitle>
                <CardDescription>Creators you follow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.favorites.map((streamer: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={streamer.avatar} alt={streamer.name} />
                        <AvatarFallback>{streamer.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{streamer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {streamer.category} • {streamer.followers}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended for You</CardTitle>
                <CardDescription>Discover new content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {rec.streamer} • {rec.viewers} viewers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Viewing Statistics</CardTitle>
                <CardDescription>Your platform engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Watch Time</span>
                    <span className="font-medium">{reportData.activity.totalWatchTime} hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sessions Count</span>
                    <span className="font-medium">{reportData.activity.sessionsCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Session</span>
                    <span className="font-medium">{reportData.activity.averageSessionTime} minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Member Since</span>
                    <span className="font-medium">{reportData.profile.joinedDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spending Breakdown</CardTitle>
                <CardDescription>How you support creators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>Donations</span>
                    </div>
                    <span className="font-medium">${reportData.spending.donationsGiven}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Gift className="h-4 w-4 text-purple-500" />
                      <span>Virtual Gifts</span>
                    </div>
                    <span className="font-medium">${reportData.spending.giftsGiven}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span>Subscription</span>
                    </div>
                    <span className="font-medium">${reportData.spending.subscriptionCost}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Spent</span>
                    <span>${reportData.spending.totalSpent}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Goals</CardTitle>
              <CardDescription>Track your viewing and engagement goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Watch Time Goal</span>
                    <span className="text-sm text-muted-foreground">
                      {reportData.goals.currentMonthWatchTime}h / {reportData.goals.monthlyWatchTime}h
                    </span>
                  </div>
                  <Progress value={watchTimeProgress} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Achievement Goal</span>
                    <span className="text-sm text-muted-foreground">
                      {reportData.achievements.completedAchievements} / {reportData.goals.achievementTarget}
                    </span>
                  </div>
                  <Progress value={achievementProgress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Your latest unlocked achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.achievements.recentAchievements.map((achievement: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        achievement.rarity === 'gold' ? 'bg-yellow-100' :
                        achievement.rarity === 'silver' ? 'bg-gray-100' : 'bg-orange-100'
                      }`}>
                        <Trophy className={`h-6 w-6 ${
                          achievement.rarity === 'gold' ? 'text-yellow-600' :
                          achievement.rarity === 'silver' ? 'text-gray-600' : 'text-orange-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground">Unlocked {achievement.unlockedAt}</p>
                      </div>
                      <Badge className={
                        achievement.rarity === 'gold' ? 'bg-yellow-500' :
                        achievement.rarity === 'silver' ? 'bg-gray-500' : 'bg-orange-500'
                      }>
                        {achievement.rarity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Achievement Progress</CardTitle>
                <CardDescription>Your overall achievement stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">{reportData.achievements.completedAchievements}</div>
                    <p className="text-muted-foreground">Achievements Unlocked</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Bronze Achievements</span>
                      <Badge className="bg-orange-500">12</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Silver Achievements</span>
                      <Badge className="bg-gray-500">8</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Gold Achievements</span>
                      <Badge className="bg-yellow-500">3</Badge>
                    </div>
                  </div>

                  <Button className="w-full">
                    <Target className="mr-2 h-4 w-4" />
                    View All Achievements
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="avatars" className="space-y-4">
          <AvatarGallery userId={userId} />
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Social Stats</CardTitle>
                <CardDescription>Your community engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Following</span>
                    <span className="font-medium">{reportData.social.followingCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Followers</span>
                    <span className="font-medium">{reportData.social.followersCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Comments Posted</span>
                    <span className="font-medium">{reportData.social.commentsPosted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Likes Given</span>
                    <span className="font-medium">{reportData.social.likesGiven}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
                <CardDescription>Your membership details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">{reportData.profile.subscription} Member</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Expires: {reportData.profile.subscriptionExpiry}</p>
                    <p>Auto-renewal: Enabled</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    Manage Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Bookmark className="mr-2 h-4 w-4" />
                    My Watchlist
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Heart className="mr-2 h-4 w-4" />
                    Favorite Streamers
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    Scheduled Streams
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
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

export default UserDashboard;
