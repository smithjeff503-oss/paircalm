import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Send, Copy, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function InvitePartner() {
  const [partnerEmail, setPartnerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase.rpc('create_partner_invitation', {
      p_inviter_id: user.id,
      p_invitee_email: partnerEmail,
      p_message: 'Join me on PairCalm so we can support our relationship together!',
    });

    if (error || !data) {
      console.error('Error creating invitation:', error);
      setLoading(false);
      return;
    }

    setInvitationCode(data.invitation_code);
    setInviteSent(true);
    setLoading(false);
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/join/${invitationCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  if (inviteSent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center items-center space-x-2 mb-6">
            <Heart className="w-10 h-10 text-rose-500" />
            <span className="text-3xl font-bold text-slate-900">PairCalm</span>
          </div>

          <div className="bg-white py-8 px-6 shadow-lg rounded-2xl sm:px-10 border border-slate-200">
            <div className="text-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Invitation Sent!</h2>
              <p className="text-slate-600">
                We've sent an invitation to <strong>{partnerEmail}</strong>
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-slate-600 mb-2">Share this link directly:</div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/join/${invitationCode}`}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center space-x-2"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2 mb-6">
          <Heart className="w-10 h-10 text-rose-500" />
          <span className="text-3xl font-bold text-slate-900">PairCalm</span>
        </div>
        <h2 className="text-center text-3xl font-bold text-slate-900 mb-2">Invite Your Partner</h2>
        <p className="text-center text-slate-600">
          PairCalm works best when you're both connected. Send an invitation to get started together.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-lg rounded-2xl sm:px-10 border border-slate-200">
          <form onSubmit={handleSendInvite} className="space-y-6">
            <div>
              <label htmlFor="partnerEmail" className="block text-sm font-medium text-slate-700 mb-2">
                Partner's email address
              </label>
              <input
                id="partnerEmail"
                type="email"
                required
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="partner@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
