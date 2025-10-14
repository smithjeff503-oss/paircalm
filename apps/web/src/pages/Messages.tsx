import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Heart,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  BookOpen,
  Zap,
  Activity,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  messagingService,
  CoupleMessage,
  ToneAnalysis,
  MessageTemplate,
  PartnerStatus,
} from '../lib/messaging';
import { biometricService } from '../lib/biometric';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoupleMessage[]>([]);
  const [input, setInput] = useState('');
  const [toneAnalysis, setToneAnalysis] = useState<ToneAnalysis | null>(null);
  const [partnerStatus, setPartnerStatus] = useState<PartnerStatus | null>(null);
  const [myZone, setMyZone] = useState<'green' | 'yellow' | 'red' | undefined>();
  const [myHeartRate, setMyHeartRate] = useState<number | undefined>();
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    initialize();

    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (coupleId) {
      const channel = messagingService.subscribeToMessages(coupleId, handleNewMessage);
      return () => {
        messagingService.unsubscribeFromMessages(channel);
      };
    }
  }, [coupleId]);

  useEffect(() => {
    if (input.trim() && input.length > 10) {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }

      analyzeTimeoutRef.current = setTimeout(() => {
        analyzeTone();
      }, 1000);
    } else {
      setToneAnalysis(null);
      setShowWarning(false);
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initialize = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const couple = await messagingService.getCouple(user.id);

      if (!couple || !couple.partner_2_id) {
        navigate('/invite-partner');
        return;
      }

      setCoupleId(couple.id);

      const partner = couple.partner_1_id === user.id ? couple.partner_2_id : couple.partner_1_id;
      setPartnerId(partner);

      const [messagesData, partnerStatusData, templatesData, myCheckIn] = await Promise.all([
        messagingService.getMessages(couple.id),
        messagingService.getPartnerStatus(user.id, partner),
        messagingService.getTemplates(),
        messagingService.getPartnerStatus(partner, user.id),
      ]);

      setMessages(messagesData);
      setPartnerStatus(partnerStatusData);
      setTemplates(templatesData);

      if (myCheckIn) {
        setMyZone(myCheckIn.zone);
      }

      const unreadMessages = messagesData.filter(
        (m) => m.receiver_id === user.id && m.status === 'sent'
      );
      for (const msg of unreadMessages) {
        await messagingService.markAsRead(msg.id);
      }

      if (biometricService.isConnected()) {
        const latestReading = biometricService.getLatestReading();
        if (latestReading?.heartRate) {
          setMyHeartRate(latestReading.heartRate);
        }
      }
    } catch (error) {
      console.error('Error initializing messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message: CoupleMessage) => {
    setMessages((prev) => {
      const exists = prev.find((m) => m.id === message.id);
      if (exists) {
        return prev.map((m) => (m.id === message.id ? message : m));
      }
      return [...prev, message];
    });

    if (message.receiver_id === user?.id && message.status === 'sent') {
      messagingService.markAsRead(message.id);
    }
  };

  const analyzeTone = async () => {
    if (!input.trim() || analyzing) return;

    setAnalyzing(true);

    try {
      const analysis = await messagingService.analyzeTone(input, {
        senderZone: myZone,
        receiverZone: partnerStatus?.zone,
        senderHeartRate: myHeartRate,
      });

      if (analysis) {
        setToneAnalysis(analysis);
        setShowWarning(analysis.riskLevel !== 'low' || analysis.shouldDelay);
      }
    } catch (error) {
      console.error('Error analyzing tone:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !coupleId || !partnerId || sending) return;

    if (showWarning && toneAnalysis?.shouldDelay) {
      return;
    }

    setSending(true);

    try {
      await messagingService.sendMessage(coupleId, user!.id, partnerId, input, {
        senderZone: myZone,
        senderHeartRate: myHeartRate,
        receiverZone: partnerStatus?.zone,
        toneAnalysis: toneAnalysis || undefined,
      });

      setInput('');
      setToneAnalysis(null);
      setShowWarning(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleUseTemplate = (template: MessageTemplate) => {
    setInput(template.content);
    setShowTemplates(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!showWarning || !toneAnalysis?.shouldDelay) {
        handleSendMessage();
      }
    }
  };

  const getZoneColor = (zone?: 'green' | 'yellow' | 'red') => {
    switch (zone) {
      case 'green':
        return 'text-emerald-600 bg-emerald-50';
      case 'yellow':
        return 'text-amber-600 bg-amber-50';
      case 'red':
        return 'text-rose-600 bg-rose-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getRiskColor = (level?: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return 'border-rose-300 bg-rose-50';
      case 'medium':
        return 'border-amber-300 bg-amber-50';
      default:
        return 'border-emerald-300 bg-emerald-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-rose-500" />
              <span className="font-semibold text-slate-900">
                {partnerStatus?.name || 'Partner'}
              </span>
            </div>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center space-x-1 text-slate-600 hover:text-slate-900"
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-sm">Templates</span>
            </button>
          </div>
        </div>
      </nav>

      {partnerStatus && (
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-center space-x-6 text-sm">
            {partnerStatus.zone && (
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${getZoneColor(partnerStatus.zone)}`}>
                <Activity className="w-4 h-4" />
                <span className="font-medium capitalize">{partnerStatus.zone} Zone</span>
              </div>
            )}
            {partnerStatus.readinessScore !== undefined && (
              <div className="flex items-center space-x-1 text-slate-600">
                <Zap className="w-4 h-4" />
                <span>{partnerStatus.readinessScore}% ready</span>
              </div>
            )}
            {partnerStatus.lastCheckIn && (
              <div className="flex items-center space-x-1 text-slate-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>
                  {new Date(partnerStatus.lastCheckIn).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 ${
                    message.sender_id === user?.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-slate-200 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.sent_at && (
                    <div
                      className={`text-xs mt-1 ${
                        message.sender_id === user?.id ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {new Date(message.sent_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {message.status === 'read' && message.sender_id === user?.id && ' • Read'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {toneAnalysis && showWarning && (
        <div className={`border-t-2 px-4 py-3 ${getRiskColor(toneAnalysis.riskLevel)}`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 space-y-2">
                <p className="font-medium text-slate-900">
                  {toneAnalysis.shouldDelay ? 'Consider waiting to send' : 'Message needs revision'}
                </p>
                {toneAnalysis.delayReason && (
                  <p className="text-sm text-slate-700">{toneAnalysis.delayReason}</p>
                )}
                {toneAnalysis.gottmanWarnings.length > 0 && (
                  <p className="text-sm text-slate-700">
                    Detected: {toneAnalysis.gottmanWarnings.join(', ')}
                  </p>
                )}
                {toneAnalysis.rewriteSuggestion && (
                  <div className="bg-white rounded-lg p-3 border border-slate-300">
                    <p className="text-xs font-medium text-slate-600 mb-1">Try this instead:</p>
                    <p className="text-sm text-slate-900">{toneAnalysis.rewriteSuggestion}</p>
                    <button
                      onClick={() => setInput(toneAnalysis.rewriteSuggestion || '')}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                    >
                      Use this version
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 bg-white px-4 py-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex items-end space-x-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            disabled={sending || (showWarning && toneAnalysis?.shouldDelay)}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {analyzing && (
            <div className="flex items-center space-x-1 text-slate-500 text-xs">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Analyzing...</span>
            </div>
          )}
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || sending || (showWarning && toneAnalysis?.shouldDelay)}
            className="bg-blue-500 text-white rounded-xl p-3 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        {myZone && (
          <div className="max-w-4xl mx-auto mt-2 text-xs text-slate-500 flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full ${getZoneColor(myZone)}`}>
              Your zone: {myZone}
            </span>
            {myHeartRate && (
              <span className="flex items-center space-x-1">
                <Heart className="w-3 h-3" />
                <span>{myHeartRate} bpm</span>
              </span>
            )}
          </div>
        )}
      </div>

      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Message Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 rounded-lg p-4 border border-slate-200 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-slate-900">{template.title}</div>
                    <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {template.category}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 mb-2">{template.description}</div>
                  <div className="text-sm text-slate-700 italic">{template.content}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
