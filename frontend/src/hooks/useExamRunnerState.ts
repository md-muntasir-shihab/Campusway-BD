import { useEffect, useMemo, useRef, useState } from "react";
import { useSaveAnswers } from "./useExamQueries";

type Selected = "A" | "B" | "C" | "D" | null;

export const useExamRunnerState = (examId: string, sessionId: string, initial: Array<{ questionId: string; selectedKey: Selected }>) => {
  const [answers, setAnswers] = useState<Record<string, Selected>>(() =>
    initial.reduce((acc, cur) => ({ ...acc, [cur.questionId]: cur.selectedKey }), {})
  );
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [offline, setOffline] = useState(!navigator.onLine);
  const saveMutation = useSaveAnswers(examId, sessionId);
  const queueRef = useRef<Array<{ questionId: string; selectedKey: Selected; clientUpdatedAtUTC: string }>>([]);
  const key = useMemo(() => `cw_exam_${examId}_${sessionId}`, [examId, sessionId]);

  useEffect(() => {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as typeof answers;
      setAnswers((prev) => ({ ...prev, ...parsed }));
    }
  }, [key]);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(answers));
  }, [answers, key]);

  useEffect(() => {
    const onOnline = async () => {
      setOffline(false);
      if (!queueRef.current.length) return;
      const latestByQuestion = Object.values(
        queueRef.current.reduce((acc, cur) => ({ ...acc, [cur.questionId]: cur }), {} as Record<string, any>)
      );
      setSaveStatus("Saving…");
      await saveMutation.mutateAsync({ answers: latestByQuestion });
      queueRef.current = [];
      setSaveStatus("Saved just now");
    };
    const onOffline = () => {
      setOffline(true);
      setSaveStatus("Offline (will sync)");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [saveMutation]);

  const pushAnswer = (questionId: string, selectedKey: Selected) => {
    const row = { questionId, selectedKey, clientUpdatedAtUTC: new Date().toISOString() };
    setAnswers((prev) => ({ ...prev, [questionId]: selectedKey }));
    queueRef.current.push(row);
    if (offline) return;
    setSaveStatus("Saving…");
    window.setTimeout(async () => {
      const batch = [...queueRef.current];
      queueRef.current = [];
      if (!batch.length) return;
      await saveMutation.mutateAsync({ answers: batch });
      setSaveStatus("Saved just now");
    }, 400);
  };

  return {
    answers,
    marked,
    saveStatus,
    offline,
    setMarked,
    pushAnswer
  };
};
