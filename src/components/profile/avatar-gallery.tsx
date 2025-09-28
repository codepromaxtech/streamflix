'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Star, 
  Sparkles, 
  Lock, 
  Unlock, 
  ShoppingCart, 
  Trophy, 
  Clock, 
  DollarSign,
  Eye,
  Zap,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface UserAvatar {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  category: 'basic' | 'premium' | 'seasonal' | 'achievement' | 'exclusive';
  unlockRequirement: {
    type: 'spending' | 'watch_time' | 'donations' | 'gifts' | 'level' | 'achievement' | 'purchase';
    value: number;
    currency?: string;
    description: string;
  };
  isUnlocked: boolean;
  isActive: boolean;
  isLimited: boolean;
  availableUntil?: Date;
  unlockedAt?: Date;
}

interface UserProgress {
  totalSpending: number;
  totalWatchTime: number; // in hours
  totalDonations: number;
  totalGifts: number;
  currentLevel: number;
  currentXP: number;
  nextLevelXP: number;
}

interface AvatarGalleryProps {
  userId: string;
  onAvatarSelect?: (avatarId: string) => void;
  currentAvatarId?: string;
}

const AvatarGallery: React.FC<AvatarGalleryProps> = ({
  userId,
  onAvatarSelect,
  currentAvatarId,
}) => {
  const [avatars, setAvatars] = useState<UserAvatar[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All', icon: <Eye className="h-4 w-4" /> },
    { id: 'basic', name: 'Basic', icon: <Star className="h-4 w-4" /> },
    { id: 'premium', name: 'Premium', icon: <Crown className="h-4 w-4" /> },
    { id: 'achievement', name: 'Achievement', icon: <Trophy className="h-4 w-4" /> },
    { id: 'seasonal', name: 'Seasonal', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'exclusive', name: 'Exclusive', icon: <Zap className="h-4 w-4" /> },
  ];

  useEffect(() => {
    fetchAvatars();
    fetchUserProgress();
  }, [userId]);

  const fetchAvatars = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      const mockAvatars: UserAvatar[] = [
        {
          id: 'avatar_default',
          name: 'Default Avatar',
          description: 'Basic starter avatar',
          imageUrl: '/avatars/default.png',
          rarity: 'common',
          category: 'basic',
          unlockRequirement: {
            type: 'level',
            value: 1,
            description: 'Available from start',
          },
          isUnlocked: true,
          isActive: false,
          isLimited: false,
        },
        {
          id: 'avatar_bronze_star',
          name: 'Bronze Star',
          description: 'Earned by reaching level 10',
          imageUrl: '/avatars/bronze_star.png',
          rarity: 'rare',
          category: 'achievement',
          unlockRequirement: {
            type: 'level',
            value: 10,
            description: 'Reach level 10',
          },
          isUnlocked: true,
          isActive: false,
          isLimited: false,
          unlockedAt: new Date('2024-01-15'),
        },
        {
          id: 'avatar_big_spender',
          name: 'Big Spender',
          description: 'For users who spent $100+',
          imageUrl: '/avatars/big_spender.png',
          rarity: 'epic',
          category: 'premium',
          unlockRequirement: {
            type: 'spending',
            value: 100,
            currency: 'USD',
            description: 'Spend $100 or more',
          },
          isUnlocked: false,
          isActive: false,
          isLimited: false,
        },
        {
          id: 'avatar_movie_buff',
          name: 'Movie Buff',
          description: 'Watch 100 hours of content',
          imageUrl: '/avatars/movie_buff.png',
          rarity: 'epic',
          category: 'achievement',
          unlockRequirement: {
            type: 'watch_time',
            value: 100,
            description: 'Watch 100 hours of content',
          },
          isUnlocked: false,
          isActive: false,
          isLimited: false,
        },
        {
          id: 'avatar_golden_crown',
          name: 'Golden Crown',
          description: 'Premium purchasable avatar',
          imageUrl: '/avatars/golden_crown.png',
          animationUrl: '/avatars/golden_crown_anim.gif',
          rarity: 'legendary',
          category: 'premium',
          unlockRequirement: {
            type: 'purchase',
            value: 25,
            currency: 'USD',
            description: 'Purchase for $25',
          },
          isUnlocked: false,
          isActive: false,
          isLimited: false,
        },
        {
          id: 'avatar_winter_special',
          name: 'Winter Special',
          description: 'Limited time winter avatar',
          imageUrl: '/avatars/winter_special.png',
          rarity: 'legendary',
          category: 'seasonal',
          unlockRequirement: {
            type: 'purchase',
            value: 15,
            currency: 'USD',
            description: 'Limited time offer',
          },
          isUnlocked: false,
          isActive: false,
          isLimited: true,
          availableUntil: new Date('2024-03-01'),
        },
        {
          id: 'avatar_diamond_vip',
          name: 'Diamond VIP',
          description: 'Ultimate exclusive avatar',
          imageUrl: '/avatars/diamond_vip.png',
          animationUrl: '/avatars/diamond_vip_anim.gif',
          rarity: 'mythic',
          category: 'exclusive',
          unlockRequirement: {
            type: 'spending',
            value: 1000,
            currency: 'USD',
            description: 'Spend $1000 or more',
          },
          isUnlocked: false,
          isActive: false,
          isLimited: false,
        },
      ];

      setAvatars(mockAvatars);
    } catch (error) {
      console.error('Error fetching avatars:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      // Simulate API call
      const mockProgress: UserProgress = {
        totalSpending: 75.50,
        totalWatchTime: 45.5,
        totalDonations: 12,
        totalGifts: 8,
        currentLevel: 15,
        currentXP: 750,
        nextLevelXP: 1000,
      };

      setUserProgress(mockProgress);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const handleAvatarSelect = async (avatarId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAvatars(prev => prev.map(avatar => ({
        ...avatar,
        isActive: avatar.id === avatarId,
      })));

      onAvatarSelect?.(avatarId);
      
      toast({
        title: 'Avatar Updated',
        description: 'Your avatar has been changed successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update avatar',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarPurchase = async (avatarId: string) => {
    try {
      setPurchasing(avatarId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAvatars(prev => prev.map(avatar => 
        avatar.id === avatarId 
          ? { ...avatar, isUnlocked: true, unlockedAt: new Date() }
          : avatar
      ));

      toast({
        title: 'Avatar Purchased!',
        description: 'Avatar has been added to your collection',
      });
    } catch (error) {
      toast({
        title: 'Purchase Failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-400 bg-gray-50';
      case 'rare': return 'border-blue-400 bg-blue-50';
      case 'epic': return 'border-purple-400 bg-purple-50';
      case 'legendary': return 'border-yellow-400 bg-yellow-50';
      case 'mythic': return 'border-red-400 bg-red-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-yellow-500';
      case 'mythic': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'mythic': return <Zap className="h-3 w-3" />;
      case 'legendary': return <Crown className="h-3 w-3" />;
      case 'epic': return <Sparkles className="h-3 w-3" />;
      case 'rare': return <Star className="h-3 w-3" />;
      default: return null;
    }
  };

  const getProgressForRequirement = (requirement: UserAvatar['unlockRequirement']) => {
    if (!userProgress) return 0;

    switch (requirement.type) {
      case 'spending':
        return Math.min((userProgress.totalSpending / requirement.value) * 100, 100);
      case 'watch_time':
        return Math.min((userProgress.totalWatchTime / requirement.value) * 100, 100);
      case 'level':
        return Math.min((userProgress.currentLevel / requirement.value) * 100, 100);
      case 'donations':
        return Math.min((userProgress.totalDonations / requirement.value) * 100, 100);
      case 'gifts':
        return Math.min((userProgress.totalGifts / requirement.value) * 100, 100);
      default:
        return 0;
    }
  };

  const isRequirementMet = (requirement: UserAvatar['unlockRequirement']) => {
    if (!userProgress) return false;

    switch (requirement.type) {
      case 'spending':
        return userProgress.totalSpending >= requirement.value;
      case 'watch_time':
        return userProgress.totalWatchTime >= requirement.value;
      case 'level':
        return userProgress.currentLevel >= requirement.value;
      case 'donations':
        return userProgress.totalDonations >= requirement.value;
      case 'gifts':
        return userProgress.totalGifts >= requirement.value;
      case 'purchase':
        return false; // Needs to be purchased
      default:
        return false;
    }
  };

  const filteredAvatars = selectedCategory === 'all' 
    ? avatars 
    : avatars.filter(avatar => avatar.category === selectedCategory);

  const unlockedAvatars = filteredAvatars.filter(avatar => avatar.isUnlocked);
  const lockedAvatars = filteredAvatars.filter(avatar => !avatar.isUnlocked);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Avatar Gallery
          </CardTitle>
          <CardDescription>
            Customize your profile with unique avatars. Unlock new ones by spending, watching, and achieving milestones!
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* User Progress */}
          {userProgress && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-3">Your Progress</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Level</div>
                  <div className="font-semibold">{userProgress.currentLevel}</div>
                  <Progress 
                    value={(userProgress.currentXP / userProgress.nextLevelXP) * 100} 
                    className="mt-1 h-2"
                  />
                </div>
                <div>
                  <div className="text-muted-foreground">Spending</div>
                  <div className="font-semibold">${userProgress.totalSpending.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Watch Time</div>
                  <div className="font-semibold">{userProgress.totalWatchTime.toFixed(1)}h</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Donations</div>
                  <div className="font-semibold">{userProgress.totalDonations}</div>
                </div>
              </div>
            </div>
          )}

          {/* Category Filter */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              {categories.map((category) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="flex items-center gap-1 text-xs"
                >
                  {category.icon}
                  <span className="hidden sm:inline">{category.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              {/* Unlocked Avatars */}
              {unlockedAvatars.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Unlock className="h-5 w-5 text-green-500" />
                    Unlocked ({unlockedAvatars.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {unlockedAvatars.map((avatar) => (
                      <motion.div
                        key={avatar.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all ${
                            avatar.isActive 
                              ? 'ring-2 ring-primary shadow-lg' 
                              : 'hover:shadow-md'
                          } ${getRarityColor(avatar.rarity)}`}
                          onClick={() => handleAvatarSelect(avatar.id)}
                        >
                          <CardContent className="p-4">
                            <div className="relative mb-3">
                              <img
                                src={avatar.imageUrl}
                                alt={avatar.name}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                              <Badge 
                                className={`absolute top-2 right-2 text-xs ${getRarityBadgeColor(avatar.rarity)}`}
                              >
                                {getRarityIcon(avatar.rarity)}
                              </Badge>
                              {avatar.isActive && (
                                <div className="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
                                  <Badge variant="default">Active</Badge>
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-sm">{avatar.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {avatar.description}
                              </div>
                              {avatar.unlockedAt && (
                                <div className="text-xs text-green-600 mt-2">
                                  Unlocked {avatar.unlockedAt.toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locked Avatars */}
              {lockedAvatars.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    Locked ({lockedAvatars.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {lockedAvatars.map((avatar) => {
                      const progress = getProgressForRequirement(avatar.unlockRequirement);
                      const canUnlock = isRequirementMet(avatar.unlockRequirement);
                      const isPurchasable = avatar.unlockRequirement.type === 'purchase';
                      
                      return (
                        <motion.div
                          key={avatar.id}
                          whileHover={{ scale: 1.02 }}
                        >
                          <Card className={`${getRarityColor(avatar.rarity)} opacity-75`}>
                            <CardContent className="p-4">
                              <div className="relative mb-3">
                                <img
                                  src={avatar.imageUrl}
                                  alt={avatar.name}
                                  className="w-full aspect-square object-cover rounded-lg filter grayscale"
                                />
                                <Badge 
                                  className={`absolute top-2 right-2 text-xs ${getRarityBadgeColor(avatar.rarity)}`}
                                >
                                  {getRarityIcon(avatar.rarity)}
                                </Badge>
                                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                                  <Lock className="h-8 w-8 text-white" />
                                </div>
                                {avatar.isLimited && avatar.availableUntil && (
                                  <Badge className="absolute bottom-2 left-2 bg-red-500 text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Limited
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-center">
                                <div className="font-medium text-sm">{avatar.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {avatar.description}
                                </div>
                                
                                <div className="mt-3">
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {avatar.unlockRequirement.description}
                                  </div>
                                  
                                  {!isPurchasable && (
                                    <Progress value={progress} className="h-2 mb-2" />
                                  )}
                                  
                                  {isPurchasable ? (
                                    <Button
                                      size="sm"
                                      onClick={() => handleAvatarPurchase(avatar.id)}
                                      disabled={purchasing === avatar.id}
                                      className="w-full"
                                    >
                                      {purchasing === avatar.id ? (
                                        <motion.div
                                          animate={{ rotate: 360 }}
                                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                          <ShoppingCart className="h-3 w-3" />
                                        </motion.div>
                                      ) : (
                                        <>
                                          <ShoppingCart className="h-3 w-3 mr-1" />
                                          ${avatar.unlockRequirement.value}
                                        </>
                                      )}
                                    </Button>
                                  ) : canUnlock ? (
                                    <Badge className="bg-green-500">
                                      <Gift className="h-3 w-3 mr-1" />
                                      Ready to unlock!
                                    </Badge>
                                  ) : (
                                    <div className="text-xs">
                                      {progress.toFixed(0)}% Complete
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredAvatars.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No avatars found in this category
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvatarGallery;
