'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Video, 
  Clock, 
  DollarSign, 
  Calendar as CalendarIcon,
  MessageCircle,
  VideoOff,
  Users,
  Lock,
  Star,
  Crown,
  Zap,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface PrivateSessionModalProps {
  streamerId: string;
  streamerName: string;
  streamerAvatar?: string;
  streamerRating?: number;
  pricePerMinute: number;
  isAvailable: boolean;
  children: React.ReactNode;
}

interface SessionPackage {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  originalPrice: number;
  discount: number;
  features: string[];
  popular?: boolean;
}

const PrivateSessionModal: React.FC<PrivateSessionModalProps> = ({
  streamerId,
  streamerName,
  streamerAvatar,
  streamerRating = 4.8,
  pricePerMinute,
  isAvailable,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'packages' | 'details' | 'confirmation'>('packages');
  const [selectedPackage, setSelectedPackage] = useState<SessionPackage | null>(null);
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [sessionDescription, setSessionDescription] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [chatEnabled, setChatEnabled] = useState<boolean>(true);
  const [recordingEnabled, setRecordingEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const sessionPackages: SessionPackage[] = [
    {
      id: 'quick_15',
      name: 'Quick Chat',
      duration: 15,
      price: Math.round(15 * pricePerMinute * 0.9), // 10% discount
      originalPrice: 15 * pricePerMinute,
      discount: 10,
      features: [
        '15 minutes private session',
        'HD video quality',
        'Real-time chat',
        'Screen sharing'
      ],
    },
    {
      id: 'standard_30',
      name: 'Standard Session',
      duration: 30,
      price: Math.round(30 * pricePerMinute * 0.85), // 15% discount
      originalPrice: 30 * pricePerMinute,
      discount: 15,
      features: [
        '30 minutes private session',
        'HD video quality',
        'Real-time chat',
        'Screen sharing',
        'Recording available'
      ],
      popular: true,
    },
    {
      id: 'extended_60',
      name: 'Extended Session',
      duration: 60,
      price: Math.round(60 * pricePerMinute * 0.8), // 20% discount
      originalPrice: 60 * pricePerMinute,
      discount: 20,
      features: [
        '60 minutes private session',
        'HD video quality',
        'Real-time chat',
        'Screen sharing',
        'Recording included',
        'Priority support'
      ],
    },
    {
      id: 'premium_120',
      name: 'Premium Experience',
      duration: 120,
      price: Math.round(120 * pricePerMinute * 0.75), // 25% discount
      originalPrice: 120 * pricePerMinute,
      discount: 25,
      features: [
        '2 hours private session',
        '4K video quality',
        'Real-time chat',
        'Screen sharing',
        'Recording included',
        'Priority support',
        'Custom requests'
      ],
    },
  ];

  const handlePackageSelect = (pkg: SessionPackage) => {
    setSelectedPackage(pkg);
    setCustomDuration(pkg.duration);
    setStep('details');
  };

  const handleCustomSession = () => {
    setSelectedPackage(null);
    setStep('details');
  };

  const handleScheduleSession = async () => {
    try {
      setLoading(true);

      if (!sessionTitle.trim()) {
        toast({
          title: 'Missing Information',
          description: 'Please provide a session title',
          variant: 'destructive',
        });
        return;
      }

      const sessionData = {
        streamerId,
        title: sessionTitle,
        description: sessionDescription,
        duration: customDuration,
        pricePerMinute,
        totalCost: customDuration * pricePerMinute,
        scheduledAt: scheduledDate && scheduledTime 
          ? new Date(`${format(scheduledDate, 'yyyy-MM-dd')}T${scheduledTime}`)
          : new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now if immediate
        chatEnabled,
        recordingEnabled,
        packageId: selectedPackage?.id,
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'Session Scheduled!',
        description: `Your private session with ${streamerName} has been scheduled`,
      });

      setStep('confirmation');
    } catch (error) {
      toast({
        title: 'Scheduling Failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep('packages');
    setSelectedPackage(null);
    setSessionTitle('');
    setSessionDescription('');
    setScheduledDate(undefined);
    setScheduledTime('');
    setChatEnabled(true);
    setRecordingEnabled(false);
    setCustomDuration(30);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetModal, 300); // Reset after modal closes
  };

  if (!isAvailable) {
    return (
      <div className="opacity-50 cursor-not-allowed">
        {children}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="relative">
              <img
                src={streamerAvatar || '/default-avatar.png'}
                alt={streamerName}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                Private Session with {streamerName}
                <Badge className="bg-purple-500">
                  <Crown className="h-3 w-3 mr-1" />
                  VIP
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {streamerRating} • ${pricePerMinute}/min
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Book a private one-on-one session with exclusive access and personalized attention
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'packages' && (
            <motion.div
              key="packages"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-semibold mb-4">Choose Your Package</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessionPackages.map((pkg) => (
                    <motion.div
                      key={pkg.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          pkg.popular ? 'ring-2 ring-purple-500 relative' : ''
                        }`}
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        {pkg.popular && (
                          <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-500">
                            <Zap className="h-3 w-3 mr-1" />
                            Most Popular
                          </Badge>
                        )}
                        
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{pkg.name}</CardTitle>
                              <CardDescription className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {pkg.duration} minutes
                              </CardDescription>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">${pkg.price}</div>
                              {pkg.discount > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="line-through">${pkg.originalPrice}</span>
                                  <Badge className="ml-1 bg-green-500 text-xs">
                                    {pkg.discount}% OFF
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <ul className="space-y-2">
                            {pkg.features.map((feature, index) => (
                              <li key={index} className="flex items-center gap-2 text-sm">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={handleCustomSession}
                  className="flex items-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  Create Custom Session
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Session Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('packages')}
                >
                  ← Back to Packages
                </Button>
              </div>

              {selectedPackage && (
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{selectedPackage.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedPackage.duration} minutes • ${selectedPackage.price}
                        </div>
                      </div>
                      {selectedPackage.discount > 0 && (
                        <Badge className="bg-green-500">
                          {selectedPackage.discount}% OFF
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="session-title">Session Title *</Label>
                    <Input
                      id="session-title"
                      placeholder="What would you like to discuss?"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="session-description">Description (Optional)</Label>
                    <Textarea
                      id="session-description"
                      placeholder="Provide more details about what you'd like to cover..."
                      value={sessionDescription}
                      onChange={(e) => setSessionDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {!selectedPackage && (
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="15"
                        max="180"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(parseInt(e.target.value) || 30)}
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        Total cost: ${(customDuration * pricePerMinute).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Schedule</Label>
                    <div className="space-y-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, 'PPP') : 'Select date (optional)'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      
                      {scheduledDate && (
                        <Input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                        />
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Leave empty to start immediately
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Session Options</Label>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="chat-enabled"
                        checked={chatEnabled}
                        onCheckedChange={setChatEnabled}
                      />
                      <Label htmlFor="chat-enabled" className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Enable chat
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recording-enabled"
                        checked={recordingEnabled}
                        onCheckedChange={setRecordingEnabled}
                      />
                      <Label htmlFor="recording-enabled" className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Record session (+$5)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total Cost</span>
                  <span className="text-2xl font-bold">
                    ${((selectedPackage?.price || (customDuration * pricePerMinute)) + (recordingEnabled ? 5 : 0)).toFixed(2)}
                  </span>
                </div>
                
                <Button
                  onClick={handleScheduleSession}
                  disabled={loading || !sessionTitle.trim()}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mr-2"
                    >
                      <Video className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {scheduledDate ? 'Schedule Private Session' : 'Start Private Session'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'confirmation' && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Session Confirmed!</h3>
                <p className="text-muted-foreground">
                  Your private session with {streamerName} has been scheduled successfully.
                  You'll receive a notification when it's time to join.
                </p>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Session:</span>
                      <span className="font-medium">{sessionTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium">{customDuration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Cost:</span>
                      <span className="font-medium">
                        ${((selectedPackage?.price || (customDuration * pricePerMinute)) + (recordingEnabled ? 5 : 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Close
                </Button>
                <Button onClick={() => {/* Navigate to sessions */}} className="flex-1">
                  View My Sessions
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default PrivateSessionModal;
