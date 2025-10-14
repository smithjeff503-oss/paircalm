import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, ArrowLeft, Sparkles, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const rewriteStyles = [
  {
    value: 'i_statement',
    label: 'I-Statement',
    description: 'Focus on your feelings without blame',
    example: '"I feel hurt when..." instead of "You always..."',
  },
  {
    value: 'validation',
    label: 'Validation',
    description: 'Acknowledge their perspective',
    example: '"I understand you\'re frustrated..." before sharing your view',
  },
  {
    value: 'boundary',
    label: 'Boundary',
    description: 'Assert needs without attacking',
    example: '"I need some space right now" instead of "Leave me alone"',
  },
  {
    value: 'repair',
    label: 'Repair',
    description: 'Take accountability and reconnect',
    example: '"I was reactive earlier. Can we try again?"',
  },
];

export default function MessageRewrite() {
  const [originalMessage, setOriginalMessage] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('i_statement');
  const [rewrittenMessage, setRewrittenMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const conflictId = location.state?.conflictId;

  const handleRewrite = async () => {
    if (!originalMessage.trim()) return;

    setLoading(true);

    const rewritePrompts: Record<string, string> = {
      i_statement: `Rewrite this message using "I" statements that express feelings without blame: "${originalMessage}"`,
      validation: `Rewrite this to first validate the other person's perspective, then share your view: "${originalMessage}"`,
      boundary: `Rewrite this as a clear boundary statement without aggression: "${originalMessage}"`,
      repair: `Rewrite this as a repair attempt that takes accountability: "${originalMessage}"`,
    };

    const mockRewrites: Record<string, string> = {
      i_statement: `I feel ${originalMessage.includes('angry') ? 'frustrated' : 'hurt'} when this happens, and I'd like us to find a way to work through it together.`,
      validation: `I hear that you're feeling overwhelmed. I'm also feeling stressed, and I think we both need support right now.`,
      boundary: `I need to take a break right now to regulate. Can we revisit this conversation in 20 minutes?`,
      repair: `I realize I was reactive earlier. That wasn't fair to you. Can we start over?`,
    };

    setTimeout(() => {
      setRewrittenMessage(mockRewrites[selectedStyle] || mockRewrites.i_statement);
      setLoading(false);
    }, 1500);
  };

  const handleSaveRewrite = async () => {
    if (!user || !rewrittenMessage) return;

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`partner_1_id.eq.${user.id},partner_2_id.eq.${user.id}`)
      .maybeSingle();

    if (!coupleData) return;

    await supabase.from('message_rewrites').insert({
      user_id: user.id,
      couple_id: coupleData.id,
      conflict_id: conflictId || null,
      original_message: originalMessage,
      rewritten_message: rewrittenMessage,
      rewrite_style: selectedStyle,
      was_sent: true,
    });

    navigate('/conflict-tracker');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rewrittenMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-violet-500" />
              <span className="font-semibold text-slate-900">Message Rewrite</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Communicate Safely</h1>
          <p className="text-slate-600">
            AI will help rewrite your message to reduce defensiveness and increase connection
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What do you want to say?
            </label>
            <textarea
              value={originalMessage}
              onChange={(e) => setOriginalMessage(e.target.value)}
              rows={4}
              placeholder="Type what you're thinking..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Rewrite Style
            </label>
            <div className="space-y-2">
              {rewriteStyles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setSelectedStyle(style.value)}
                  className={`w-full text-left px-4 py-3 border-2 rounded-lg transition-all ${
                    selectedStyle === style.value
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="font-medium text-slate-900">{style.label}</div>
                  <div className="text-sm text-slate-600 mt-0.5">{style.description}</div>
                </button>
              ))}
            </div>
          </div>

          {!rewrittenMessage ? (
            <button
              onClick={handleRewrite}
              disabled={!originalMessage.trim() || loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              <span>{loading ? 'Rewriting...' : 'Rewrite Message'}</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    <span className="font-medium text-violet-900">Rewritten Message</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-slate-800 leading-relaxed">{rewrittenMessage}</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setRewrittenMessage('');
                    setOriginalMessage('');
                  }}
                  className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleSaveRewrite}
                  className="flex-1 py-3 px-4 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                >
                  Use This Message
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> These rewrites help activate your partner's social engagement system instead of their
            threat response. Even small changes in phrasing can dramatically shift conflict dynamics.
          </p>
        </div>
      </main>
    </div>
  );
}
