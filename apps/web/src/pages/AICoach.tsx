import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Loader2,
  Heart,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  MessageCircle,
  Star,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  coachingService,
  CoachingSession,
  ChatMessage,
  CoachingTechnique,
  CoachingContext,
} from '../lib/coaching';

export default function AICoach() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<CoachingSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState<CoachingContext>({});
  const [selectedTechnique, setSelectedTechnique] = useState<CoachingTechnique | null>(null);
  const [showEndSession, setShowEndSession] = useState(false);
  const [rating, setRating] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    initializeSession();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
        .maybeSingle();

      if (coupleData) {
        setCoupleId(coupleData.id);
      }

      const ctx = await coachingService.buildContext(user.id, coupleData?.id || undefined);
      setContext(ctx);

      const newSession = await coachingService.createSession(user.id, 'general', {
        coupleId: coupleData?.id,
        heartRate: ctx.heartRate,
        readinessScore: ctx.readinessScore,
        nervousSystemZone: ctx.nervousSystemZone,
      });

      if (newSession) {
        setSession(newSession);

        const welcomeMessage: ChatMessage = {
          role: 'assistant',
          content: getWelcomeMessage(ctx),
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWelcomeMessage = (ctx: CoachingContext): string => {
    let message = "Hi, I'm your relationship coach. I'm here to help you navigate conflicts and strengthen your connection.";

    if (ctx.nervousSystemZone === 'red') {
      message += " I notice you're in the red zone right now. Let's focus on calming your nervous system first.";
    } else if (ctx.nervousSystemZone === 'yellow') {
      message += " I see you're feeling activated. Let's work together to help you regulate.";
    } else if (ctx.readinessScore && ctx.readinessScore < 60) {
      message += ` Your readiness is ${ctx.readinessScore}% - you're running on low capacity today.`;
    }

    message += " What brings you here today?";
    return message;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !session || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    await coachingService.saveMessage(session.id, 'user', userMessage.content);

    try {
      const updatedContext = { ...context, sessionId: session.id };
      const response = await coachingService.sendMessage(
        [...messages, userMessage],
        updatedContext
      );

      if (response) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          techniques: response.techniques,
          context: response.context,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error('No response from AI coach');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    setLoading(true);
    await coachingService.endSession(session.id, 'User ended session', rating || undefined);
    setLoading(false);
    navigate('/dashboard');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getZoneColor = (zone?: string) => {
    switch (zone) {
      case 'green':
        return 'text-emerald-600';
      case 'yellow':
        return 'text-amber-600';
      case 'red':
        return 'text-rose-600';
      default:
        return 'text-slate-600';
    }
  };

  const getZoneIcon = (zone?: string) => {
    switch (zone) {
      case 'green':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'yellow':
        return <AlertCircle className="w-4 h-4" />;
      case 'red':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => setShowEndSession(true)}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>End Session</span>
            </button>
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <span className="font-semibold text-slate-900">AI Coach</span>
            </div>
            <div className="w-24"></div>
          </div>
        </div>
      </nav>

      {context && (
        <div className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-center space-x-6 text-sm">
            {context.nervousSystemZone && (
              <div className={`flex items-center space-x-1 ${getZoneColor(context.nervousSystemZone)}`}>
                {getZoneIcon(context.nervousSystemZone)}
                <span className="font-medium capitalize">{context.nervousSystemZone} Zone</span>
              </div>
            )}
            {context.heartRate && (
              <div className="flex items-center space-x-1 text-slate-600">
                <Heart className="w-4 h-4" />
                <span>{context.heartRate} bpm</span>
              </div>
            )}
            {context.readinessScore !== undefined && (
              <div className="flex items-center space-x-1 text-slate-600">
                <Zap className="w-4 h-4" />
                <span>{context.readinessScore}% ready</span>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message, index) => (
            <div key={index}>
              <div
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-slate-200 text-slate-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>

              {message.techniques && message.techniques.length > 0 && (
                <div className="ml-0 mt-3 space-y-2">
                  <div className="text-xs font-medium text-slate-600 flex items-center space-x-1">
                    <BookOpen className="w-3 h-3" />
                    <span>Suggested Techniques:</span>
                  </div>
                  <div className="space-y-2">
                    {message.techniques.map((technique) => (
                      <button
                        key={technique.id}
                        onClick={() => setSelectedTechnique(technique)}
                        className="w-full text-left bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors"
                      >
                        <div className="font-medium text-sm text-blue-900">{technique.name}</div>
                        <div className="text-xs text-blue-700 mt-1">{technique.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="border-t border-slate-200 bg-white px-4 py-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex items-end space-x-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="bg-blue-500 text-white rounded-xl p-3 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {selectedTechnique && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {selectedTechnique.name}
            </h3>
            <div className="text-sm text-slate-600 mb-4">{selectedTechnique.description}</div>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium text-slate-900 mb-2">Instructions:</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {selectedTechnique.instructions}
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (session) {
                    coachingService.recordTechniqueUsage(
                      session.id,
                      selectedTechnique.id,
                      true
                    );
                  }
                  setSelectedTechnique(null);
                }}
                className="flex-1 bg-emerald-500 text-white rounded-lg py-3 font-medium hover:bg-emerald-600 transition-colors"
              >
                This Helped
              </button>
              <button
                onClick={() => setSelectedTechnique(null)}
                className="flex-1 bg-slate-200 text-slate-700 rounded-lg py-3 font-medium hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">End Session</h3>
            <p className="text-slate-600 mb-4">
              How helpful was this coaching session?
            </p>
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleEndSession}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white rounded-lg py-3 font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'End Session'}
              </button>
              <button
                onClick={() => setShowEndSession(false)}
                disabled={loading}
                className="flex-1 bg-slate-200 text-slate-700 rounded-lg py-3 font-medium hover:bg-slate-300 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
