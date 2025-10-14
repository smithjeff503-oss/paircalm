import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Heart, Clock, Star, Lock, Loader2, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { wellnessService, WellnessCategory, WellnessContent } from '../lib/wellness';
import { subscriptionService } from '../lib/subscription';

export default function Wellness() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<WellnessCategory[]>([]);
  const [content, setContent] = useState<WellnessContent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [selectedContent, setSelectedContent] = useState<WellnessContent | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    initialize();
  }, [user]);

  useEffect(() => {
    if (categories.length > 0) {
      loadContent();
    }
  }, [selectedCategory, selectedDifficulty]);

  const initialize = async () => {
    if (!user) return;

    setLoading(true);
    const [categoriesData, sub] = await Promise.all([
      wellnessService.getCategories(),
      subscriptionService.getCurrentSubscription(user.id),
    ]);

    setCategories(categoriesData);
    setSubscription(sub);
    setLoading(false);
  };

  const loadContent = async () => {
    const data = await wellnessService.getContent({
      categoryId: selectedCategory || undefined,
      difficulty: selectedDifficulty || undefined,
    });
    setContent(data);
  };

  const handlePlay = async (item: WellnessContent) => {
    if (!user) return;

    if (item.required_tier !== 'free' && !subscription) {
      navigate('/profile');
      return;
    }

    setSelectedContent(item);
    await wellnessService.trackView(user.id, item.id);
  };

  const handleToggleFavorite = async (contentId: string) => {
    if (!user) return;
    await wellnessService.toggleFavorite(user.id, contentId);
    loadContent();
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'free':
        return <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Free</span>;
      case 'premium':
        return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Premium</span>;
      case 'couples_plus':
        return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Couples+</span>;
      default:
        return null;
    }
  };

  const canAccess = (tier: string) => {
    if (tier === 'free') return true;
    if (!subscription) return false;
    if (tier === 'premium') return true;
    if (tier === 'couples_plus' && subscription) return true;
    return false;
  };

  const filteredContent = content.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Wellness Library</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Regulate Your Nervous System</h2>
          <p className="text-indigo-50 mb-4">
            Breathwork, meditation, qigong, binaural beats, ASMR, and more to support your wellbeing
          </p>
          {!subscription && (
            <button
              onClick={() => navigate('/profile')}
              className="bg-white text-indigo-600 font-medium px-6 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Upgrade for Full Access
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search wellness content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-slate-900"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => setSelectedDifficulty(null)}
              className={`px-4 py-1 rounded-full font-medium whitespace-nowrap text-sm ${
                selectedDifficulty === null ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              All Levels
            </button>
            {['beginner', 'intermediate', 'advanced'].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedDifficulty(level)}
                className={`px-4 py-1 rounded-full font-medium whitespace-nowrap text-sm capitalize ${
                  selectedDifficulty === level ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              selectedCategory === null
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-slate-700 border border-slate-300'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center space-x-2 ${
                selectedCategory === category.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item) => {
            const hasAccess = canAccess(item.required_tier);
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border-2 border-slate-200 overflow-hidden hover:shadow-lg transition-all ${
                  !hasAccess ? 'opacity-75' : ''
                }`}
              >
                <div className="relative h-48 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  <div className="text-6xl">{categories.find(c => c.id === item.category_id)?.icon || '🎵'}</div>
                  {!hasAccess && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Lock className="w-12 h-12 text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getTierBadge(item.required_tier)}
                  </div>
                  {item.is_featured && (
                    <div className="absolute top-2 left-2">
                      <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Featured</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 mb-2">by {item.instructor_name}</p>
                  <p className="text-sm text-slate-700 mb-3 line-clamp-2">{item.description}</p>

                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.duration_minutes} min</span>
                    </span>
                    <span className="capitalize">{item.difficulty}</span>
                  </div>

                  {item.benefits.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-1">Benefits:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.benefits.slice(0, 2).map((benefit, idx) => (
                          <span key={idx} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => hasAccess ? handlePlay(item) : navigate('/profile')}
                      className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                        hasAccess
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {hasAccess ? <Play className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      <span>{hasAccess ? 'Play' : 'Upgrade'}</span>
                    </button>
                    {hasAccess && (
                      <button
                        onClick={() => handleToggleFavorite(item.id)}
                        className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        <Heart className="w-5 h-5 text-rose-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredContent.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">No content found matching your filters</p>
          </div>
        )}
      </main>

      {selectedContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedContent.title}</h3>
                <p className="text-sm text-slate-600">by {selectedContent.instructor_name}</p>
              </div>
              <button
                onClick={() => setSelectedContent(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-700 mb-4">{selectedContent.description}</p>
            <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg p-8 mb-4 text-center">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-sm text-slate-600">Audio player would load here</p>
              <p className="text-xs text-slate-500 mt-2">{selectedContent.duration_minutes} minutes</p>
            </div>
            <button
              onClick={() => setSelectedContent(null)}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
