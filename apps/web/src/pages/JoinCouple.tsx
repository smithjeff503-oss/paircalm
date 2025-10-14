import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function JoinCouple() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate(`/signup?invite=${code}`);
      return;
    }

    loadInvitation();
  }, [user, code]);

  const loadInvitation = async () => {
    if (!code) return;

    const { data, error } = await supabase.rpc('get_invitation_by_code', {
      p_code: code,
    });

    if (error || !data?.valid) {
      setError('This invitation is invalid or has expired');
      setLoading(false);
      return;
    }

    setInvitationData(data);
    setLoading(false);
  };

  const handleAccept = async () => {
    if (!user || !code) return;

    setAccepting(true);

    const { data, error } = await supabase.rpc('accept_partner_invitation', {
      p_invitation_code: code,
      p_user_id: user.id,
    });

    if (error || !data?.success) {
      setError(data?.error || 'Failed to accept invitation');
      setAccepting(false);
      return;
    }

    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center items-center space-x-2 mb-6">
            <Heart className="w-10 h-10 text-rose-500" />
            <span className="text-3xl font-bold text-slate-900">PairCalm</span>
          </div>

          <div className="bg-white py-8 px-6 shadow-lg rounded-2xl sm:px-10 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 text-center">Invalid Invitation</h2>
            <p className="text-slate-600 mb-6 text-center">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors"
            >
              Go to Home
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

        <div className="bg-white py-8 px-6 shadow-lg rounded-2xl sm:px-10 border border-slate-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You're Invited!</h2>
            <p className="text-slate-600">
              <strong>{invitationData?.inviter_name}</strong> invited you to join them on PairCalm
            </p>
          </div>

          {invitationData?.message && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 italic">"{invitationData.message}"</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Accepting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Accept Invitation</span>
                </>
              )}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium rounded-lg transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
