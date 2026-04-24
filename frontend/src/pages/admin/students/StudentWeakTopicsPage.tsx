import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, TrendingDown, BarChart3 } from 'lucide-react';
import { getWeakTopicsReport } from '../../../api/adminStudentApi';

type WeakTopic = {
  _id: { subject?: string; topic?: string; chapter?: string };
  avgAccuracy: number;
  totalAttempts: number;
  studentCount: number;
};

export default function StudentWeakTopicsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['weak-topics-report'],
    queryFn: getWeakTopicsReport,
  });

  const topics: WeakTopic[] = data?.topics ?? [];

  const getAccuracyColor = (acc: number) => {
    if (acc <= 25) return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
    if (acc <= 40) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
    return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
  };

  const overallAvg = topics.length > 0
    ? (topics.reduce((s, t) => s + t.avgAccuracy, 0) / topics.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Weak Topics Report</h2>
      </div>
      <p className="text-sm text-slate-500">Topics where accuracy is ≤50% across 5+ student attempts.</p>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BookOpen size={16} /> Weak Topics
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{topics.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingDown size={16} /> Avg Accuracy
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600">{overallAvg}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BarChart3 size={16} /> Total Attempts
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {topics.reduce((s, t) => s + t.totalAttempts, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-400">Loading report...</div>
      ) : topics.length === 0 ? (
        <div className="py-16 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No weak topics detected (this is great!)</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Topic / Chapter</th>
                  <th className="px-4 py-3">Avg Accuracy</th>
                  <th className="px-4 py-3">Total Attempts</th>
                  <th className="px-4 py-3">Students Affected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topics.map((topic, i) => (
                  <tr key={i} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{topic._id.subject || '—'}</td>
                    <td className="px-4 py-3">
                      {topic._id.topic || topic._id.chapter || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${getAccuracyColor(topic.avgAccuracy)}`}>
                        {topic.avgAccuracy.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">{topic.totalAttempts.toLocaleString()}</td>
                    <td className="px-4 py-3">{topic.studentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
