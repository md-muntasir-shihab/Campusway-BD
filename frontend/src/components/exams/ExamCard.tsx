import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ExamListItem } from "../../types/exam";

const reasonRoute: Record<string, string> = {
  LOGIN_REQUIRED: "/login",
  SUBSCRIPTION_REQUIRED: "/subscription-plans",
  PAYMENT_PENDING: "/payments",
  PROFILE_BELOW_70: "/profile"
};

export const ExamCard = ({ item, blockedReasons = [] }: { item: ExamListItem; blockedReasons?: string[] }) => {
  const isBlocked = blockedReasons.length > 0;
  const cta = isBlocked ? "Locked" : item.status === "live" ? "Start" : "View";

  return (
    <motion.article whileHover={{ y: -2 }} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <img src={item.bannerImageUrl || "/placeholder-exam.jpg"} className="h-40 w-full object-cover" />
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.subject} • {item.examCategory}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(item.examWindowStartUTC).toLocaleString()} - {new Date(item.examWindowEndUTC).toLocaleString()}</p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-indigo-600 dark:text-indigo-300">{item.paymentRequired ? `Paid ৳${item.priceBDT || 0}` : "Free"}</span>
          {item.subscriptionRequired && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">Subscription Required</span>}
          {item.paymentRequired && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-rose-700 dark:text-rose-300">Payment Required</span>}
        </div>
        {isBlocked && (
          <div className="rounded-lg bg-zinc-100 p-2 text-xs dark:bg-zinc-800">
            {blockedReasons.map((reason) => (
              <Link key={reason} className="mr-2 underline" to={reasonRoute[reason] || "/profile"}>{reason}</Link>
            ))}
          </div>
        )}
        <Link to={`/exam/${item.id}`} className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{cta}</Link>
      </div>
    </motion.article>
  );
};
