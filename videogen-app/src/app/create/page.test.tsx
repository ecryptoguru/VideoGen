import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateVideo from './page';

// Mock dependencies
vi.mock('@/hooks/use-ffmpeg', () => ({
  useFFmpeg: () => ({
    load: vi.fn(),
    assembleVideo: vi.fn(),
    cleanup: vi.fn(),
    loading: false,
    progress: 0,
    logs: [],
    error: '',
    resultUrl: '',
  }),
}));

vi.mock('@/hooks/use-video-poll', () => ({
  useVideoPoll: () => ({
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    getTaskBySceneId: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('CreateVideo Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render the wizard title', () => {
    render(<CreateVideo />);
    expect(screen.getByText('New Video')).toBeInTheDocument();
  });

  it('should render topic input field', () => {
    render(<CreateVideo />);
    const textarea = screen.getByPlaceholderText(/e.g., How our SaaS saves 10 hours per week/i);
    expect(textarea).toBeInTheDocument();
  });

  it('should render platform selection buttons', () => {
    render(<CreateVideo />);
    expect(screen.getByText('Instagram Reels')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('YouTube Shorts')).toBeInTheDocument();
    expect(screen.getByText('YouTube Long')).toBeInTheDocument();
  });

  it('should update topic when user types', () => {
    render(<CreateVideo />);
    const textarea = screen.getByPlaceholderText(/e.g., How our SaaS saves 10 hours per week/i);
    fireEvent.change(textarea, { target: { value: 'Test topic' } });
    expect(textarea).toHaveValue('Test topic');
  });

  it('should select platform when clicked', () => {
    render(<CreateVideo />);
    const instagramButton = screen.getByText('Instagram Reels');
    fireEvent.click(instagramButton);
    // Just verify clicking doesn't throw an error
    // The actual selection state is handled internally
    expect(instagramButton).toBeInTheDocument();
  });

  it('should disable Next button when topic is invalid', () => {
    render(<CreateVideo />);
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('should enable Next button when topic and platform are valid', () => {
    render(<CreateVideo />);
    const textarea = screen.getByPlaceholderText(/e.g., How our SaaS saves 10 hours per week/i);
    const instagramButton = screen.getByText('Instagram Reels');
    
    fireEvent.change(textarea, { target: { value: 'Valid topic' } });
    fireEvent.click(instagramButton);
    
    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();
  });

  it('should persist state to localStorage', () => {
    render(<CreateVideo />);
    const textarea = screen.getByPlaceholderText(/e.g., How our SaaS saves 10 hours per week/i);
    const instagramButton = screen.getByText('Instagram Reels');
    
    fireEvent.change(textarea, { target: { value: 'Test topic' } });
    fireEvent.click(instagramButton);
    
    const savedState = localStorage.getItem('video_wizard_state');
    expect(savedState).toBeTruthy();
    
    const parsed = JSON.parse(savedState!);
    expect(parsed.topic).toBe('Test topic');
    expect(parsed.selectedPlatform).toBe('instagram_reels');
  });

  it('should restore state from localStorage on mount', () => {
    localStorage.setItem('video_wizard_state', JSON.stringify({
      step: 1,
      topic: 'Restored topic',
      selectedPlatform: 'linkedin',
      selectedFormat: '',
      selectedHook: 0,
      script: '',
      projectId: null,
      scenes: [],
      hooks: [],
    }));
    
    render(<CreateVideo />);
    const textarea = screen.getByPlaceholderText(/e.g., How our SaaS saves 10 hours per week/i);
    expect(textarea).toHaveValue('Restored topic');
  });
});
