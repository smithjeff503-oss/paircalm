import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Crown, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { achievementService, subscriptionService, Achievement, UserAchievement, SubscriptionTier } from '../lib/subscription';

export default function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    const [achvs, userAchvs, sub, tiersList] = await Promise.all([
      achievementService.getAchievements(),
      achievementService.getUserAchievements(user.id),
      subscriptionService.getCurrentSubscription(user.id),
      subscriptionService.getTiers(),
    ]);

    setAchievements(achvs);
    setUserAchievements(userAchvs);
    setSubscription(sub);
    setTiers(tiersList);
    setLoading(false);
  };

  const hasAchievement = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Profile</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{profile?.full_name}</h2>
          <p className="text-slate-600">{profile?.email}</p>
          {subscription && (
            <div className="mt-4 inline-flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-lg">
              <Crown className="w-5 h-5" />
              <span className="font-medium">Premium Member</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
            <Award className="w-6 h-6 text-amber-500" />
            <span>Achievements ({userAchievements.length}/{achievements.length})</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map((achievement) => {
              const unlocked = hasAchievement(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 ${
                    unlocked
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-slate-200 bg-slate-50 opacity-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{unlocked ? '🏆' : '🔒'}</div>
                  <h4 className="font-bold text-sm text-slate-900">{achievement.name}</h4>
                  <p className="text-xs text-slate-600 mt-1">{achievement.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {!subscription && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Zap className="w-6 h-6 text-blue-500" />
              <span>Upgrade to Premium</span>
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {tiers.filter(t => t.name !== 'free').map((tier) => (
                <div key={tier.id} className="border-2 border-blue-500 rounded-lg p-4">
                  <h4 className="font-bold text-lg text-slate-900">{tier.display_name}</h4>
                  <div className="text-3xl font-bold text-blue-600 my-2">
                    ${(tier.price_monthly_usd / 100).toFixed(2)}
                    <span className="text-sm text-slate-600">/mo</span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700 mb-4">
                    {Object.keys(tier.features).map((feature) => (
                      <li key={feature} className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>{feature.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg">
                    Upgrade Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
