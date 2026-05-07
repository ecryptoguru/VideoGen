import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVideoPoll } from './use-video-poll';

// Mock fetch
global.fetch = vi.fn();

describe('useVideoPoll hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty tasks and isPolling false', () => {
    const { result } = renderHook(() => useVideoPoll());
    
    expect(result.current.tasks.size).toBe(0);
    expect(result.current.isPolling).toBe(false);
  });

  it('should start polling when startPolling is called', () => {
    const { result } = renderHook(() => useVideoPoll());
    const onComplete = vi.fn();
    const onProgress = vi.fn();
    
    act(() => {
      result.current.startPolling('task-123', 1, onComplete, onProgress);
    });
    
    expect(result.current.isPolling).toBe(true);
    expect(result.current.tasks.has('task-123')).toBe(true);
    expect(result.current.tasks.get('task-123')?.status).toBe('Preparing');
  });


  it('should stop all polling when stopAll is called', () => {
    const { result } = renderHook(() => useVideoPoll());
    
    act(() => {
      result.current.startPolling('task-1', 1);
      result.current.startPolling('task-2', 2);
      result.current.startPolling('task-3', 3);
      result.current.stopAll();
    });
    
    expect(result.current.tasks.size).toBe(0);
    expect(result.current.isPolling).toBe(false);
  });

  it('should get task by scene ID', () => {
    const { result } = renderHook(() => useVideoPoll());
    
    act(() => {
      result.current.startPolling('task-123', 5);
    });
    
    const task = result.current.getTaskBySceneId(5);
    expect(task).toBeDefined();
    expect(task?.taskId).toBe('task-123');
    expect(task?.sceneId).toBe(5);
  });

  it('should return null when task not found by scene ID', () => {
    const { result } = renderHook(() => useVideoPoll());
    
    act(() => {
      result.current.startPolling('task-123', 1);
    });
    
    const task = result.current.getTaskBySceneId(999);
    expect(task).toBeNull();
  });

  it('should handle multiple concurrent polls', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'Processing' }),
    });

    const { result } = renderHook(() => useVideoPoll());
    
    act(() => {
      result.current.startPolling('task-1', 1);
      result.current.startPolling('task-2', 2);
      result.current.startPolling('task-3', 3);
    });
    
    expect(result.current.tasks.size).toBe(3);
    expect(result.current.isPolling).toBe(true);
  });

  it('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useVideoPoll());
    
    act(() => {
      result.current.startPolling('task-123', 1);
    });
    
    unmount();
    
    // Intervals should be cleared - no errors thrown
  });

  it('should replace existing poll when starting same task ID', () => {
    const { result } = renderHook(() => useVideoPoll());
    
    act(() => {
      result.current.startPolling('task-123', 1);
      result.current.startPolling('task-123', 2); // Same task ID, different scene
    });
    
    const task = result.current.getTaskBySceneId(2);
    expect(task).toBeDefined();
    expect(task?.sceneId).toBe(2);
  });
});
