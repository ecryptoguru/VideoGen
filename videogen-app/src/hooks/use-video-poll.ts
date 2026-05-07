"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type VideoTaskStatus = "Preparing" | "Queueing" | "Processing" | "Success" | "Fail";

export interface VideoTaskResult {
  status: VideoTaskStatus;
  file_id?: string;
  download_url?: string;
  error?: string;
}

interface PollingState {
  taskId: string;
  sceneId: number;
  status: VideoTaskStatus;
  downloadUrl?: string;
  fileId?: string;
}

const MAX_POLL_ATTEMPTS = 120;
const POLL_INTERVAL_MS = 10000;

export function useVideoPoll() {
  const [tasks, setTasks] = useState<Map<string, PollingState>>(new Map());
  const [isPolling, setIsPolling] = useState(false);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const pollIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollAttempts = useRef<Map<string, number>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const stopPolling = useCallback((taskId: string) => {
    const controller = abortControllers.current.get(taskId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(taskId);
    }
    const interval = pollIntervals.current.get(taskId);
    if (interval) {
      clearInterval(interval);
      pollIntervals.current.delete(taskId);
    }
    pollAttempts.current.delete(taskId);
  }, []);

  const stopAll = useCallback(() => {
    for (const taskId of abortControllers.current.keys()) {
      stopPolling(taskId);
    }
    setTasks(new Map());
    setIsPolling(false);
  }, [stopPolling]);

  const pollTask = useCallback(async (taskId: string): Promise<VideoTaskResult> => {
    try {
      const res = await fetch(`/api/minimax/status?task_id=${encodeURIComponent(taskId)}`);
      if (!res.ok) {
        return { status: "Fail", error: `Status check failed: ${res.status}` };
      }
      const data = await res.json();

      const status = data.status as VideoTaskStatus;
      if (status === "Success") {
        if (data.file_id) {
          const retrieveRes = await fetch(`/api/minimax/file_retrieve?file_id=${encodeURIComponent(data.file_id)}`);
          if (retrieveRes.ok) {
            const retrieveData = await retrieveRes.json();
            return {
              status: "Success",
              file_id: data.file_id,
              download_url: retrieveData.download_url,
            };
          }
        }
        return { status: "Success", file_id: data.file_id };
      }
      if (status === "Fail") {
        return { status: "Fail", error: data.error_msg || "Video generation failed" };
      }
      return { status: status };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { status: "Fail", error: "Polling cancelled" };
      }
      return { status: "Processing" };
    }
  }, []);

  const startPolling = useCallback((
    taskId: string,
    sceneId: number,
    onComplete?: (result: VideoTaskResult) => void,
    onProgress?: (status: VideoTaskStatus) => void
  ) => {
    if (abortControllers.current.has(taskId)) {
      stopPolling(taskId);
    }

    const controller = new AbortController();
    abortControllers.current.set(taskId, controller);
    pollAttempts.current.set(taskId, 0);

    setTasks((prev) => {
      const next = new Map(prev);
      next.set(taskId, { taskId, sceneId, status: "Preparing" });
      return next;
    });

    setIsPolling(true);

    let intervalFired = false;

    const checkTask = async () => {
      if (!mountedRef.current) return;
      if (controller.signal.aborted) return;

      const attempts = pollAttempts.current.get(taskId) || 0;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        stopPolling(taskId);
        if (mountedRef.current) {
          setTasks((prev) => {
            const next = new Map(prev);
            const existing = next.get(taskId);
            if (existing) next.set(taskId, { ...existing, status: "Fail" });
            return next;
          });
        }
        onComplete?.({ status: "Fail", error: "Max poll attempts reached" });
        return;
      }

      if (controller.signal.aborted) return;

      pollAttempts.current.set(taskId, attempts + 1);
      const result = await pollTask(taskId);

      if (controller.signal.aborted) return;
      if (!mountedRef.current) return;

      setTasks((prev) => {
        const next = new Map(prev);
        next.set(taskId, {
          taskId,
          sceneId,
          status: result.status,
          downloadUrl: result.download_url,
          fileId: result.file_id,
        });
        return next;
      });

      onProgress?.(result.status);

      if (result.status === "Success" || result.status === "Fail") {
        stopPolling(taskId);
        onComplete?.(result);
      }
    };

    const interval = setInterval(() => {
      if (intervalFired) return;
      intervalFired = true;
      checkTask();
    }, POLL_INTERVAL_MS);
    pollIntervals.current.set(taskId, interval);
  }, [pollTask, stopPolling]);

  useEffect(() => {
    const controllers = abortControllers.current;
    const intervals = pollIntervals.current;
    return () => {
      for (const taskId of controllers.keys()) {
        const controller = controllers.get(taskId);
        if (controller) controller.abort();
      }
      for (const interval of intervals.values()) {
        clearInterval(interval);
      }
    };
  }, []);

  return {
    tasks,
    isPolling,
    startPolling,
    stopPolling,
    stopAll,
    getTaskBySceneId: (sceneId: number) => {
      for (const task of tasks.values()) {
        if (task.sceneId === sceneId) return task;
      }
      return null;
    },
  };
}