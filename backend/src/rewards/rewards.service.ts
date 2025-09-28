import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

interface UserAvatar {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  category: 'basic' | 'premium' | 'seasonal' | 'achievement' | 'exclusive';
  unlockRequirement: AvatarUnlockRequirement;
  isActive: boolean;
  isLimited: boolean;
  availableUntil?: Date;
}

interface AvatarUnlockRequirement {
  type: 'spending' | 'watch_time' | 'donations' | 'gifts' | 'level' | 'achievement' | 'purchase';
  value: number;
  currency?: string;
  description: string;
}

interface UserReward {
  id: string;
  userId: string;
  rewardType: 'avatar' | 'badge' | 'title' | 'gift_item' | 'credits' | 'subscription';
  rewardId: string;
  unlockedAt: Date;
  source: 'spending' | 'watch_time' | 'achievement' | 'purchase' | 'gift' | 'promotion';
  metadata?: any;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: 'viewer' | 'streamer' | 'social' | 'spending' | 'time' | 'special';
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  requirements: AchievementRequirement[];
  rewards: AchievementReward[];
  isActive: boolean;
  isSecret: boolean; // Hidden until unlocked
}

interface AchievementRequirement {
  type: 'watch_time' | 'donations_sent' | 'donations_received' | 'gifts_sent' | 'gifts_received' | 
        'streams_watched' | 'streams_created' | 'followers' | 'following' | 'comments' | 'likes' | 
        'consecutive_days' | 'spending_total' | 'level_reached';
  value: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
}

interface AchievementReward {
  type: 'avatar' | 'badge' | 'title' | 'credits' | 'gift_item' | 'discount';
  itemId?: string;
  amount?: number;
  description: string;
}

interface UserLevel {
  userId: string;
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  nextLevelXP: number;
  title: string;
  benefits: LevelBenefit[];
}

interface LevelBenefit {
  type: 'avatar_unlock' | 'discount' | 'exclusive_content' | 'priority_support' | 'custom_emotes' | 'badge';
  value: string | number;
  description: string;
}

interface WatchTimeReward {
  id: string;
  name: string;
  description: string;
  requiredHours: number;
  rewardType: 'avatar' | 'badge' | 'credits' | 'gift_item';
  rewardValue: string | number;
  isOneTime: boolean;
  category: 'milestone' | 'weekly' | 'monthly';
}

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultRewards();
  }

  private async initializeDefaultRewards(): Promise<void> {
    // Initialize default avatars, achievements, and rewards
    await this.createDefaultAvatars();
    await this.createDefaultAchievements();
    await this.createWatchTimeRewards();
  }

  async getUserLevel(userId: string): Promise<UserLevel> {
    try {
      const userStats = await this.prisma.userStats.findUnique({
        where: { userId },
      });

      if (!userStats) {
        // Create initial stats for new user
        await this.prisma.userStats.create({
          data: {
            userId,
            totalXP: 0,
            currentLevel: 1,
          },
        });

        return {
          userId,
          currentLevel: 1,
          currentXP: 0,
          totalXP: 0,
          nextLevelXP: 100,
          title: 'Newcomer',
          benefits: [],
        };
      }

      const level = this.calculateLevel(userStats.totalXP);
      const nextLevelXP = this.getXPRequiredForLevel(level + 1);
      const currentLevelXP = this.getXPRequiredForLevel(level);
      const currentXP = userStats.totalXP - currentLevelXP;

      return {
        userId,
        currentLevel: level,
        currentXP,
        totalXP: userStats.totalXP,
        nextLevelXP: nextLevelXP - currentLevelXP,
        title: this.getLevelTitle(level),
        benefits: this.getLevelBenefits(level),
      };
    } catch (error) {
      this.logger.error('Error getting user level:', error);
      throw error;
    }
  }

  async awardXP(
    userId: string,
    amount: number,
    source: string,
    description?: string,
  ): Promise<{ levelUp: boolean; newLevel?: number; rewards?: any[] }> {
    try {
      const currentStats = await this.getUserLevel(userId);
      const newTotalXP = currentStats.totalXP + amount;
      const newLevel = this.calculateLevel(newTotalXP);
      const levelUp = newLevel > currentStats.currentLevel;

      // Update user stats
      await this.prisma.userStats.upsert({
        where: { userId },
        update: {
          totalXP: newTotalXP,
          currentLevel: newLevel,
        },
        create: {
          userId,
          totalXP: newTotalXP,
          currentLevel: newLevel,
        },
      });

      // Log XP transaction
      await this.prisma.xpTransaction.create({
        data: {
          userId,
          amount,
          source,
          description: description || `Earned ${amount} XP from ${source}`,
        },
      });

      let rewards: any[] = [];

      if (levelUp) {
        // Award level-up rewards
        rewards = await this.awardLevelUpRewards(userId, newLevel);
        
        // Emit level up event
        this.eventEmitter.emit('user.level_up', {
          userId,
          oldLevel: currentStats.currentLevel,
          newLevel,
          rewards,
        });

        this.logger.log(`User ${userId} leveled up to ${newLevel}`);
      }

      return {
        levelUp,
        newLevel: levelUp ? newLevel : undefined,
        rewards: levelUp ? rewards : undefined,
      };
    } catch (error) {
      this.logger.error('Error awarding XP:', error);
      throw error;
    }
  }

  async checkSpendingMilestones(userId: string, totalSpending: number): Promise<UserReward[]> {
    try {
      const rewards: UserReward[] = [];
      
      // Get spending-based avatars that user hasn't unlocked yet
      const availableAvatars = await this.prisma.userAvatar.findMany({
        where: {
          isActive: true,
          unlockRequirement: {
            path: ['type'],
            equals: 'spending',
          },
          NOT: {
            unlockedBy: {
              some: {
                userId,
              },
            },
          },
        },
      });

      for (const avatar of availableAvatars) {
        const requirement = avatar.unlockRequirement as any;
        if (totalSpending >= requirement.value) {
          const reward = await this.unlockAvatar(userId, avatar.id, 'spending');
          if (reward) {
            rewards.push(reward);
          }
        }
      }

      // Check spending achievements
      const spendingAchievements = await this.checkAchievements(userId, 'spending_total', totalSpending);
      rewards.push(...spendingAchievements);

      return rewards;
    } catch (error) {
      this.logger.error('Error checking spending milestones:', error);
      return [];
    }
  }

  async checkWatchTimeMilestones(userId: string, totalWatchTime: number): Promise<UserReward[]> {
    try {
      const rewards: UserReward[] = [];
      const watchTimeHours = Math.floor(totalWatchTime / 3600); // Convert seconds to hours

      // Get watch time rewards that user hasn't claimed yet
      const availableRewards = await this.prisma.watchTimeReward.findMany({
        where: {
          requiredHours: {
            lte: watchTimeHours,
          },
          NOT: {
            claimedBy: {
              some: {
                userId,
              },
            },
          },
        },
      });

      for (const watchReward of availableRewards) {
        const reward = await this.claimWatchTimeReward(userId, watchReward.id);
        if (reward) {
          rewards.push(reward);
        }
      }

      // Award XP for watch time (1 XP per minute watched)
      const xpToAward = Math.floor(totalWatchTime / 60);
      if (xpToAward > 0) {
        await this.awardXP(userId, xpToAward, 'watch_time', `Watched content for ${watchTimeHours} hours`);
      }

      // Check watch time achievements
      const watchAchievements = await this.checkAchievements(userId, 'watch_time', watchTimeHours);
      rewards.push(...watchAchievements);

      return rewards;
    } catch (error) {
      this.logger.error('Error checking watch time milestones:', error);
      return [];
    }
  }

  async unlockAvatar(userId: string, avatarId: string, source: string): Promise<UserReward | null> {
    try {
      // Check if avatar exists and is available
      const avatar = await this.prisma.userAvatar.findUnique({
        where: { id: avatarId },
      });

      if (!avatar || !avatar.isActive) {
        throw new BadRequestException('Avatar not found or not available');
      }

      // Check if user already has this avatar
      const existingReward = await this.prisma.userReward.findFirst({
        where: {
          userId,
          rewardType: 'avatar',
          rewardId: avatarId,
        },
      });

      if (existingReward) {
        return null; // Already unlocked
      }

      // Create reward record
      const reward: UserReward = {
        id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        rewardType: 'avatar',
        rewardId: avatarId,
        unlockedAt: new Date(),
        source: source as any,
      };

      await this.prisma.userReward.create({
        data: reward,
      });

      // Emit event for real-time notifications
      this.eventEmitter.emit('avatar.unlocked', {
        userId,
        avatar,
        source,
      });

      this.logger.log(`Avatar unlocked: ${avatarId} for user ${userId}`);

      return reward;
    } catch (error) {
      this.logger.error('Error unlocking avatar:', error);
      return null;
    }
  }

  async getUserAvatars(userId: string): Promise<{ unlocked: UserAvatar[]; available: UserAvatar[] }> {
    try {
      // Get all avatars
      const allAvatars = await this.prisma.userAvatar.findMany({
        where: { isActive: true },
      });

      // Get user's unlocked avatars
      const unlockedRewards = await this.prisma.userReward.findMany({
        where: {
          userId,
          rewardType: 'avatar',
        },
      });

      const unlockedAvatarIds = new Set(unlockedRewards.map(r => r.rewardId));

      const unlocked = allAvatars.filter(avatar => unlockedAvatarIds.has(avatar.id));
      const available = allAvatars.filter(avatar => !unlockedAvatarIds.has(avatar.id));

      return { unlocked: unlocked as any, available: available as any };
    } catch (error) {
      this.logger.error('Error getting user avatars:', error);
      throw error;
    }
  }

  async getUserAchievements(userId: string): Promise<{ unlocked: Achievement[]; available: Achievement[] }> {
    try {
      // Get all achievements
      const allAchievements = await this.prisma.achievement.findMany({
        where: { isActive: true },
      });

      // Get user's unlocked achievements
      const unlockedAchievements = await this.prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
      });

      const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievementId));

      const unlocked = allAchievements.filter(achievement => unlockedIds.has(achievement.id));
      const available = allAchievements.filter(achievement => 
        !unlockedIds.has(achievement.id) && !achievement.isSecret
      );

      return { unlocked: unlocked as any, available: available as any };
    } catch (error) {
      this.logger.error('Error getting user achievements:', error);
      throw error;
    }
  }

  async purchaseAvatar(userId: string, avatarId: string): Promise<UserReward> {
    try {
      const avatar = await this.prisma.userAvatar.findUnique({
        where: { id: avatarId },
      });

      if (!avatar || !avatar.isActive) {
        throw new BadRequestException('Avatar not found or not available');
      }

      if (avatar.unlockRequirement.type !== 'purchase') {
        throw new BadRequestException('Avatar cannot be purchased');
      }

      // Check user's balance
      const userWallet = await this.prisma.userWallet.findUnique({
        where: { userId },
      });

      const price = avatar.unlockRequirement.value;
      if (!userWallet || userWallet.balance < price) {
        throw new BadRequestException('Insufficient balance');
      }

      // Deduct from balance
      await this.prisma.userWallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: price,
          },
        },
      });

      // Unlock avatar
      const reward = await this.unlockAvatar(userId, avatarId, 'purchase');
      if (!reward) {
        throw new BadRequestException('Failed to unlock avatar');
      }

      return reward;
    } catch (error) {
      this.logger.error('Error purchasing avatar:', error);
      throw error;
    }
  }

  private async checkAchievements(
    userId: string,
    type: string,
    value: number,
  ): Promise<UserReward[]> {
    try {
      const rewards: UserReward[] = [];
      
      // Get achievements that match the type and haven't been unlocked
      const availableAchievements = await this.prisma.achievement.findMany({
        where: {
          isActive: true,
          requirements: {
            some: {
              type,
              value: {
                lte: value,
              },
            },
          },
          NOT: {
            unlockedBy: {
              some: {
                userId,
              },
            },
          },
        },
      });

      for (const achievement of availableAchievements) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) {
          rewards.push(...unlocked);
        }
      }

      return rewards;
    } catch (error) {
      this.logger.error('Error checking achievements:', error);
      return [];
    }
  }

  private async unlockAchievement(userId: string, achievementId: string): Promise<UserReward[]> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        return [];
      }

      // Create achievement unlock record
      await this.prisma.userAchievement.create({
        data: {
          userId,
          achievementId,
          unlockedAt: new Date(),
        },
      });

      const rewards: UserReward[] = [];

      // Award achievement rewards
      for (const reward of achievement.rewards as any[]) {
        if (reward.type === 'avatar' && reward.itemId) {
          const avatarReward = await this.unlockAvatar(userId, reward.itemId, 'achievement');
          if (avatarReward) {
            rewards.push(avatarReward);
          }
        } else if (reward.type === 'credits' && reward.amount) {
          await this.awardCredits(userId, reward.amount, 'achievement');
        }
      }

      // Emit event
      this.eventEmitter.emit('achievement.unlocked', {
        userId,
        achievement,
        rewards,
      });

      this.logger.log(`Achievement unlocked: ${achievementId} for user ${userId}`);

      return rewards;
    } catch (error) {
      this.logger.error('Error unlocking achievement:', error);
      return [];
    }
  }

  private async claimWatchTimeReward(userId: string, rewardId: string): Promise<UserReward | null> {
    try {
      const watchReward = await this.prisma.watchTimeReward.findUnique({
        where: { id: rewardId },
      });

      if (!watchReward) {
        return null;
      }

      // Create claim record
      await this.prisma.watchTimeRewardClaim.create({
        data: {
          userId,
          rewardId,
          claimedAt: new Date(),
        },
      });

      let reward: UserReward | null = null;

      // Award the reward based on type
      if (watchReward.rewardType === 'avatar' && typeof watchReward.rewardValue === 'string') {
        reward = await this.unlockAvatar(userId, watchReward.rewardValue, 'watch_time');
      } else if (watchReward.rewardType === 'credits' && typeof watchReward.rewardValue === 'number') {
        await this.awardCredits(userId, watchReward.rewardValue, 'watch_time');
        
        reward = {
          id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          rewardType: 'credits',
          rewardId: rewardId,
          unlockedAt: new Date(),
          source: 'watch_time',
          metadata: { amount: watchReward.rewardValue },
        };
      }

      return reward;
    } catch (error) {
      this.logger.error('Error claiming watch time reward:', error);
      return null;
    }
  }

  private async awardCredits(userId: string, amount: number, source: string): Promise<void> {
    await this.prisma.userWallet.upsert({
      where: { userId },
      update: {
        balance: {
          increment: amount,
        },
      },
      create: {
        userId,
        balance: amount,
        currency: 'USD',
      },
    });

    // Log transaction
    await this.prisma.walletTransaction.create({
      data: {
        userId,
        amount,
        type: 'credit',
        source,
        description: `Earned ${amount} credits from ${source}`,
      },
    });
  }

  private async awardLevelUpRewards(userId: string, level: number): Promise<any[]> {
    const rewards: any[] = [];
    
    // Award level-specific rewards
    const levelRewards = this.getLevelRewards(level);
    
    for (const reward of levelRewards) {
      if (reward.type === 'avatar' && reward.itemId) {
        const avatarReward = await this.unlockAvatar(userId, reward.itemId, 'level');
        if (avatarReward) {
          rewards.push(avatarReward);
        }
      } else if (reward.type === 'credits' && reward.amount) {
        await this.awardCredits(userId, reward.amount, 'level');
        rewards.push({
          type: 'credits',
          amount: reward.amount,
        });
      }
    }

    return rewards;
  }

  // Helper methods for level calculation
  private calculateLevel(totalXP: number): number {
    // Level formula: level = floor(sqrt(totalXP / 100)) + 1
    return Math.floor(Math.sqrt(totalXP / 100)) + 1;
  }

  private getXPRequiredForLevel(level: number): number {
    // XP required = (level - 1)^2 * 100
    return Math.pow(level - 1, 2) * 100;
  }

  private getLevelTitle(level: number): string {
    if (level >= 100) return 'Legendary Viewer';
    if (level >= 75) return 'Master Viewer';
    if (level >= 50) return 'Expert Viewer';
    if (level >= 25) return 'Advanced Viewer';
    if (level >= 10) return 'Regular Viewer';
    if (level >= 5) return 'Active Viewer';
    return 'Newcomer';
  }

  private getLevelBenefits(level: number): LevelBenefit[] {
    const benefits: LevelBenefit[] = [];
    
    if (level >= 5) {
      benefits.push({
        type: 'avatar_unlock',
        value: 'basic_avatars',
        description: 'Access to basic avatar collection',
      });
    }
    
    if (level >= 10) {
      benefits.push({
        type: 'discount',
        value: 5,
        description: '5% discount on all purchases',
      });
    }
    
    if (level >= 25) {
      benefits.push({
        type: 'avatar_unlock',
        value: 'premium_avatars',
        description: 'Access to premium avatar collection',
      });
    }
    
    if (level >= 50) {
      benefits.push({
        type: 'priority_support',
        value: 'enabled',
        description: 'Priority customer support',
      });
    }

    return benefits;
  }

  private getLevelRewards(level: number): any[] {
    const rewards: any[] = [];
    
    // Every 5 levels, award credits
    if (level % 5 === 0) {
      rewards.push({
        type: 'credits',
        amount: level * 10,
      });
    }
    
    // Special level rewards
    if (level === 10) {
      rewards.push({
        type: 'avatar',
        itemId: 'avatar_bronze_star',
      });
    }
    
    if (level === 25) {
      rewards.push({
        type: 'avatar',
        itemId: 'avatar_silver_crown',
      });
    }
    
    if (level === 50) {
      rewards.push({
        type: 'avatar',
        itemId: 'avatar_gold_diamond',
      });
    }

    return rewards;
  }

  // Initialize default data
  private async createDefaultAvatars(): Promise<void> {
    const defaultAvatars = [
      {
        id: 'avatar_default',
        name: 'Default Avatar',
        description: 'Basic default avatar',
        imageUrl: '/avatars/default.png',
        rarity: 'common',
        category: 'basic',
        unlockRequirement: {
          type: 'level',
          value: 1,
          description: 'Available from start',
        },
        isActive: true,
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
        isActive: true,
        isLimited: false,
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
        isActive: true,
        isLimited: false,
      },
    ];

    for (const avatar of defaultAvatars) {
      await this.prisma.userAvatar.upsert({
        where: { id: avatar.id },
        update: avatar,
        create: avatar,
      });
    }
  }

  private async createDefaultAchievements(): Promise<void> {
    const defaultAchievements = [
      {
        id: 'achievement_first_donation',
        name: 'First Donation',
        description: 'Make your first donation to a streamer',
        iconUrl: '/achievements/first_donation.png',
        category: 'spending',
        rarity: 'bronze',
        requirements: [
          {
            type: 'donations_sent',
            value: 1,
            timeframe: 'all_time',
          },
        ],
        rewards: [
          {
            type: 'credits',
            amount: 50,
            description: '50 free credits',
          },
        ],
        isActive: true,
        isSecret: false,
      },
      {
        id: 'achievement_binge_watcher',
        name: 'Binge Watcher',
        description: 'Watch content for 24 hours total',
        iconUrl: '/achievements/binge_watcher.png',
        category: 'time',
        rarity: 'silver',
        requirements: [
          {
            type: 'watch_time',
            value: 24,
            timeframe: 'all_time',
          },
        ],
        rewards: [
          {
            type: 'avatar',
            itemId: 'avatar_movie_buff',
            description: 'Movie Buff avatar',
          },
        ],
        isActive: true,
        isSecret: false,
      },
    ];

    for (const achievement of defaultAchievements) {
      await this.prisma.achievement.upsert({
        where: { id: achievement.id },
        update: achievement,
        create: achievement,
      });
    }
  }

  private async createWatchTimeRewards(): Promise<void> {
    const watchTimeRewards = [
      {
        id: 'watch_1_hour',
        name: '1 Hour Milestone',
        description: 'Watch content for 1 hour',
        requiredHours: 1,
        rewardType: 'credits',
        rewardValue: 10,
        isOneTime: true,
        category: 'milestone',
      },
      {
        id: 'watch_10_hours',
        name: '10 Hours Milestone',
        description: 'Watch content for 10 hours',
        requiredHours: 10,
        rewardType: 'avatar',
        rewardValue: 'avatar_dedicated_viewer',
        isOneTime: true,
        category: 'milestone',
      },
      {
        id: 'watch_100_hours',
        name: '100 Hours Milestone',
        description: 'Watch content for 100 hours',
        requiredHours: 100,
        rewardType: 'avatar',
        rewardValue: 'avatar_super_fan',
        isOneTime: true,
        category: 'milestone',
      },
    ];

    for (const reward of watchTimeRewards) {
      await this.prisma.watchTimeReward.upsert({
        where: { id: reward.id },
        update: reward,
        create: reward,
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processDailyRewards(): Promise<void> {
    try {
      this.logger.log('Processing daily rewards...');
      
      // Process daily login rewards
      const activeUsers = await this.prisma.user.findMany({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      for (const user of activeUsers) {
        await this.awardXP(user.id, 10, 'daily_login', 'Daily login bonus');
      }

      this.logger.log(`Processed daily rewards for ${activeUsers.length} users`);
    } catch (error) {
      this.logger.error('Error processing daily rewards:', error);
    }
  }
}
