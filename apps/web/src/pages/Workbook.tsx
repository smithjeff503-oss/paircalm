import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2, Play, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { workbookService, WorkbookExercise, ExerciseCompletion } from '../lib/analytics';
import { messagingService } from '../lib/messaging';

export default function Workbook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<WorkbookExercise[]>([]);
  const [completions, setCompletions] = useState<ExerciseCompletion[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<WorkbookExercise | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    initialize();
  }, [user]);

  const initialize = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const couple = await messagingService.getCouple(user.id);
      if (couple) {
        setCoupleId(couple.id);
        const [exercisesData, completionsData] = await Promise.all([
          workbookService.getExercises(),
          workbookService.getCompletions(couple.id),
        ]);
        setExercises(exercisesData);
        setCompletions(completionsData);
      }
    } catch (error) {
      console.error('Error initializing workbook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (exercise: WorkbookExercise) => {
    if (!coupleId) return;

    const completion = await workbookService.startExercise(exercise.id, coupleId);
    if (completion) {
      const updated = await workbookService.getCompletions(coupleId);
      setCompletions(updated);
      setSelectedExercise(null);
    }
  };

  const isCompleted = (exerciseId: string) => {
    return completions.some(c => c.exercise_id === exerciseId && c.status === 'completed');
  };

  const isInProgress = (exerciseId: string) => {
    return completions.some(c => c.exercise_id === exerciseId && c.status === 'in_progress');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dreams_within_conflict':
        return 'bg-purple-100 text-purple-700';
      case 'perpetual_problems':
        return 'bg-blue-100 text-blue-700';
      case 'solvable_problems':
        return 'bg-emerald-100 text-emerald-700';
      case 'compromise':
        return 'bg-amber-100 text-amber-700';
      case 'gridlock':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
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
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Relationship Workbook</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-xl font-bold">Gottman Method Exercises</h2>
          </div>
          <p className="text-indigo-50">
            Research-backed exercises to heal conflicts and deepen understanding
          </p>
        </div>

        <div className="space-y-4">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="bg-white rounded-xl border-2 border-slate-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-bold text-lg text-slate-900">{exercise.title}</h3>
                    {isCompleted(exercise.id) && (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{exercise.description}</p>
                  <div className="flex items-center space-x-3 text-xs text-slate-600">
                    <span className={`px-3 py-1 rounded-full ${getCategoryColor(exercise.category)}`}>
                      {exercise.category.replace('_', ' ')}
                    </span>
                    <span>{exercise.estimated_duration_minutes} min</span>
                    <span className="capitalize">{exercise.difficulty}</span>
                    {exercise.requires_both_partners && (
                      <span className="text-rose-600">👥 Both partners</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4 italic">{exercise.instructions}</p>

              <button
                onClick={() => setSelectedExercise(exercise)}
                disabled={isCompleted(exercise.id)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCompleted(exercise.id) ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Completed</span>
                  </>
                ) : isInProgress(exercise.id) ? (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Continue</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Start Exercise</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </main>

      {selectedExercise && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">{selectedExercise.title}</h3>
              <button
                onClick={() => setSelectedExercise(null)}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-700 mb-4">{selectedExercise.instructions}</p>

            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Prompts to explore:</h4>
              <ul className="space-y-2">
                {selectedExercise.prompts.map((prompt, index) => (
                  <li key={index} className="text-sm text-blue-800">
                    {index + 1}. {prompt}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedExercise(null)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStart(selectedExercise)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Start Exercise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
