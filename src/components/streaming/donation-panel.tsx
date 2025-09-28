'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Heart, 
  Gift, 
  DollarSign, 
  Star, 
  Crown, 
  Sparkles, 
  MessageCircle,
  Eye,
  EyeOff,
  CreditCard,
  Wallet,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface VirtualGift {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl?: string;
  price: number;
  currency: string;
  category: 'hearts' | 'flowers' | 'animals' | 'food' | 'luxury' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface DonationPanelProps {
  streamerId: string;
  streamerName: string;
  streamId?: string;
  isLive?: boolean;
  onDonationSent?: (donation: any) => void;
  onGiftSent?: (gift: any) => void;
}

const DonationPanel: React.FC<DonationPanelProps> = ({
  streamerId,
  streamerName,
  streamId,
  isLive = false,
  onDonationSent,
  onGiftSent,
}) => {
  const [activeTab, setActiveTab] = useState('donate');
  const [donationAmount, setDonationAmount] = useState<number>(5);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [giftQuantity, setGiftQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card');
  const [virtualGifts, setVirtualGifts] = useState<VirtualGift[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const predefinedAmounts = [1, 5, 10, 25, 50, 100];

  useEffect(() => {
    fetchVirtualGifts();
    fetchUserBalance();
  }, []);

  const fetchVirtualGifts = async () => {
    try {
      // Simulate API call
      const mockGifts: VirtualGift[] = [
        {
          id: 'heart_1',
          name: 'Red Heart',
          description: 'Show some love',
          imageUrl: '/gifts/heart.png',
          price: 1,
          currency: 'USD',
          category: 'hearts',
          rarity: 'common',
        },
        {
          id: 'rose_1',
          name: 'Red Rose',
          description: 'Beautiful red rose',
          imageUrl: '/gifts/rose.png',
          price: 5,
          currency: 'USD',
          category: 'flowers',
          rarity: 'rare',
        },
        {
          id: 'crown_1',
          name: 'Golden Crown',
          description: 'For the king/queen',
          imageUrl: '/gifts/crown.png',
          animationUrl: '/gifts/crown_animation.gif',
          price: 50,
          currency: 'USD',
          category: 'luxury',
          rarity: 'legendary',
        },
        {
          id: 'diamond_1',
          name: 'Diamond Ring',
          description: 'Ultimate luxury gift',
          imageUrl: '/gifts/diamond.png',
          animationUrl: '/gifts/diamond_animation.gif',
          price: 100,
          currency: 'USD',
          category: 'luxury',
          rarity: 'legendary',
        },
      ];
      setVirtualGifts(mockGifts);
    } catch (error) {
      console.error('Error fetching virtual gifts:', error);
    }
  };

  const fetchUserBalance = async () => {
    try {
      // Simulate API call
      setUserBalance(150.50);
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  const handleDonation = async () => {
    try {
      setLoading(true);
      
      const amount = customAmount ? parseFloat(customAmount) : donationAmount;
      
      if (amount < 1) {
        toast({
          title: 'Invalid Amount',
          description: 'Minimum donation amount is $1',
          variant: 'destructive',
        });
        return;
      }

      if (paymentMethod === 'wallet' && amount > userBalance) {
        toast({
          title: 'Insufficient Balance',
          description: 'Please add funds to your wallet or use a different payment method',
          variant: 'destructive',
        });
        return;
      }

      // Simulate API call
      const donation = {
        id: `donation_${Date.now()}`,
        amount,
        currency: 'USD',
        message,
        isAnonymous,
        streamerId,
        streamId,
        paymentMethod,
        timestamp: new Date(),
      };

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'Donation Sent!',
        description: `Successfully donated $${amount} to ${streamerName}`,
      });

      onDonationSent?.(donation);
      
      // Reset form
      setMessage('');
      setCustomAmount('');
      
      // Update balance if paid with wallet
      if (paymentMethod === 'wallet') {
        setUserBalance(prev => prev - amount);
      }
    } catch (error) {
      toast({
        title: 'Donation Failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGiftSend = async () => {
    if (!selectedGift) return;

    try {
      setLoading(true);
      
      const totalCost = selectedGift.price * giftQuantity;
      
      if (paymentMethod === 'wallet' && totalCost > userBalance) {
        toast({
          title: 'Insufficient Balance',
          description: 'Please add funds to your wallet or use a different payment method',
          variant: 'destructive',
        });
        return;
      }

      // Simulate API call
      const giftTransaction = {
        id: `gift_${Date.now()}`,
        giftId: selectedGift.id,
        giftName: selectedGift.name,
        quantity: giftQuantity,
        totalCost,
        message,
        isAnonymous,
        streamerId,
        streamId,
        timestamp: new Date(),
      };

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: 'Gift Sent!',
        description: `Sent ${giftQuantity}x ${selectedGift.name} to ${streamerName}`,
      });

      onGiftSent?.(giftTransaction);
      
      // Reset form
      setMessage('');
      setGiftQuantity(1);
      setSelectedGift(null);
      
      // Update balance if paid with wallet
      if (paymentMethod === 'wallet') {
        setUserBalance(prev => prev - totalCost);
      }
    } catch (error) {
      toast({
        title: 'Gift Failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return <Crown className="h-3 w-3" />;
      case 'epic': return <Sparkles className="h-3 w-3" />;
      case 'rare': return <Star className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Support {streamerName}
        </CardTitle>
        <CardDescription>
          Show your appreciation with donations and virtual gifts
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="donate" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Donate
            </TabsTrigger>
            <TabsTrigger value="gifts" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Gifts
            </TabsTrigger>
          </TabsList>

          {/* Donation Tab */}
          <TabsContent value="donate" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Quick Amounts</Label>
              <div className="grid grid-cols-3 gap-2">
                {predefinedAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={donationAmount === amount ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDonationAmount(amount);
                      setCustomAmount('');
                    }}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom-amount" className="text-sm font-medium mb-2 block">
                Custom Amount
              </Label>
              <Input
                id="custom-amount"
                type="number"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setDonationAmount(0);
                }}
                min="1"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="donation-message" className="text-sm font-medium mb-2 block">
                Message (Optional)
              </Label>
              <Textarea
                id="donation-message"
                placeholder="Say something nice..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {message.length}/200 characters
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous-donation"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="anonymous-donation" className="flex items-center gap-2">
                {isAnonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Donate anonymously
              </Label>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === 'card' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod('card')}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Card
                </Button>
                <Button
                  variant={paymentMethod === 'wallet' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod('wallet')}
                  className="flex items-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  Wallet (${userBalance.toFixed(2)})
                </Button>
              </div>
            </div>

            <Button
              onClick={handleDonation}
              disabled={loading || (!customAmount && !donationAmount)}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Send className="h-4 w-4" />
                </motion.div>
              ) : (
                <Heart className="h-4 w-4 mr-2" />
              )}
              Donate ${customAmount || donationAmount}
            </Button>
          </TabsContent>

          {/* Gifts Tab */}
          <TabsContent value="gifts" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Select a Gift</Label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {virtualGifts.map((gift) => (
                  <motion.div
                    key={gift.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all ${
                        selectedGift?.id === gift.id
                          ? 'ring-2 ring-primary'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedGift(gift)}
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-2">
                            <img
                              src={gift.imageUrl}
                              alt={gift.name}
                              className="w-12 h-12 object-contain"
                            />
                            <Badge
                              className={`absolute -top-1 -right-1 text-xs px-1 ${getRarityColor(gift.rarity)}`}
                            >
                              {getRarityIcon(gift.rarity)}
                            </Badge>
                          </div>
                          <div className="text-xs font-medium">{gift.name}</div>
                          <div className="text-xs text-muted-foreground">${gift.price}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {selectedGift && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedGift.imageUrl}
                      alt={selectedGift.name}
                      className="w-8 h-8 object-contain"
                    />
                    <div>
                      <div className="font-medium">{selectedGift.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedGift.description}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="gift-quantity" className="text-sm font-medium mb-2 block">
                    Quantity
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGiftQuantity(Math.max(1, giftQuantity - 1))}
                    >
                      -
                    </Button>
                    <Input
                      id="gift-quantity"
                      type="number"
                      value={giftQuantity}
                      onChange={(e) => setGiftQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGiftQuantity(giftQuantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Total: ${(selectedGift.price * giftQuantity).toFixed(2)}
                  </div>
                </div>

                <div>
                  <Label htmlFor="gift-message" className="text-sm font-medium mb-2 block">
                    Message (Optional)
                  </Label>
                  <Textarea
                    id="gift-message"
                    placeholder="Say something nice..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={200}
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="anonymous-gift"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                  <Label htmlFor="anonymous-gift" className="flex items-center gap-2">
                    {isAnonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    Send anonymously
                  </Label>
                </div>

                <Button
                  onClick={handleGiftSend}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Gift className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <Gift className="h-4 w-4 mr-2" />
                  )}
                  Send Gift (${(selectedGift.price * giftQuantity).toFixed(2)})
                </Button>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>

        {/* Live indicator */}
        {isLive && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Live donations will appear on stream
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DonationPanel;
