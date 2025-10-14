import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Heart, Sparkles, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { communityService, CommunityPost } from '../lib/subscription';

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadPosts();
  }, [user, filter]);

  const loadPosts = async () => {
    setLoading(true);
    const data = await communityService.getPosts(filter === 'all' ? undefined : filter);
    setPosts(data);
    setLoading(false);
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case 'success_story': return <Heart className="w-5 h-5 text-rose-500" />;
      case 'celebration': return <Sparkles className="w-5 h-5 text-amber-500" />;
      default: return <MessageCircle className="w-5 h-5 text-blue-500" />;
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate('/dashboard')} className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Community</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-6 h-6" />
            <h2 className="text-xl font-bold">Community Support</h2>
          </div>
          <p className="text-blue-50">Share your story and learn from others on the same journey</p>
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2">
          {['all', 'success_story', 'support_request', 'celebration'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                filter === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-slate-700 border border-slate-300'
              }`}
            >
              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start space-x-3 mb-3">
                {getPostIcon(post.post_type)}
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{post.title}</h3>
                  <p className="text-sm text-slate-600">by {post.anonymous_name} • {new Date(post.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-slate-700 mb-4">{post.content}</p>
              <div className="flex items-center space-x-4 text-sm text-slate-500">
                <span className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span>{post.like_count}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comment_count}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
