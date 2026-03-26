import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, CalendarDays, Lock, LogIn, CreditCard, Headphones } from 'lucide-react';
import type { HomeExamWidgetItem } from '../../../services/api';

interface OnlineExamCardProps {
  exam: HomeExamWidgetItem;
  loginText?: string;
  subscribeText?: string;
  contactText?: string;
}

export default function OnlineExamCard({
  exam,
  loginText = 'Login',
  subscribeText = 'Subscribe',
  contactText = 'Contact',
}: OnlineExamCardProps) {
  const isLive = exam.status === 'live';
  const isLocked = exam.isLocked;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`snap-start shrink-0 w-[280px] sm:w-[300px] md:w-[320px] rounded-2xl border transition-shadow flex flex-col overflow-hidden ${
        isLive
          ? 'border-green-300 dark:border-green-700/50 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-gray-900 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-card hover:shadow-card-hover'
      }`}
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug">
              {exam.title}
            </h3>
            {exam.subject && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exam.subject}</p>
            )}
          </div>
          <span
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              isLive
                ? 'bg-green-500 text-white animate-pulse'
                : 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
            }`}
          >
            {isLive ? 'LIVE' : exam.status}
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {exam.durationMinutes}m
          </span>
          {exam.startDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {new Date(exam.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {/* Free/Paid badge */}
          <span
            className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              exam.lockReason === 'subscription_required'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {exam.lockReason === 'subscription_required' ? 'Paid' : 'Free'}
          </span>
        </div>

        {/* Bottom action */}
        <div className="mt-auto">
          {isLocked ? (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {exam.lockReason === 'login_required' ? 'Login to access this exam' : 'Subscription required'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {exam.lockReason === 'login_required' ? (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold transition-colors"
                  >
                    <LogIn className="w-3 h-3" />
                    {loginText}
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/subscription-plans"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold transition-colors"
                    >
                      <CreditCard className="w-3 h-3" />
                      {subscribeText}
                    </Link>
                    <Link
                      to="/contact"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Headphones className="w-3 h-3" />
                      {contactText}
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : exam.canJoin ? (
            <Link
              to={exam.joinUrl || `/exams/${exam.id}`}
              className={`block w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                isLive
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {isLive ? 'Join Now' : 'Attend Exam'}
            </Link>
          ) : (
            <span className="block text-center text-xs text-gray-400 dark:text-gray-500 py-2.5">
              Not available yet
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
