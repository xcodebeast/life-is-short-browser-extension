import { useEffect, useMemo, useState } from 'react';
import {
  MESSAGE_TYPES,
  sendRuntimeMessage,
  type GetDashboardStateResponse,
  type UpdateYoutubeSettingsResponse,
} from '@/src/core/messages';
import {
  clampYoutubeResetWindowHours,
  clampYoutubeThreshold,
  YOUTUBE_RESET_WINDOW_HOURS_MAX,
  YOUTUBE_RESET_WINDOW_HOURS_MIN,
  YOUTUBE_THRESHOLD_MAX,
  YOUTUBE_THRESHOLD_MIN,
} from '@/src/core/policy-engine';

const HOUR_IN_MS = 60 * 60 * 1000;

function formatTimeRemaining(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function App() {
  return (
    <main className="dashboard-root">
      <header className="dashboard-header">
        <h1>Life Is Short Dashboard</h1>
      </header>

      <YoutubeSection/> 
    </main>
  );
}

const YoutubeSection = () => {
  const [count, setCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(3);
  const [thresholdInput, setThresholdInput] = useState<string>('3');
  const [resetWindowHours, setResetWindowHours] = useState<number>(8);
  const [resetWindowInput, setResetWindowInput] = useState<string>('8');
  const [windowStartedAt, setWindowStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const applyDashboardState = (response: GetDashboardStateResponse) => {
    const youtubeUsage = response.dashboard.usage.sites.youtube;
    const youtubePersistentUsage = response.dashboard.persistentUsage.sites.youtube;
    const youtubeSettings = response.dashboard.settings.youtube;

    setCount(youtubeUsage.count);
    setTodayCount(youtubePersistentUsage.todayCount);
    setTotalCount(youtubePersistentUsage.totalCount);
    setThreshold(youtubeSettings.threshold);
    setThresholdInput(String(youtubeSettings.threshold));
    setResetWindowHours(youtubeSettings.resetWindowHours);
    setResetWindowInput(String(youtubeSettings.resetWindowHours));
    setWindowStartedAt(youtubeUsage.windowStartedAt);
    setNowMs(Date.now());
  };

  const loadDashboardState = async () => {
    const response = await sendRuntimeMessage<GetDashboardStateResponse>({
      type: MESSAGE_TYPES.getDashboardState,
    });

    if (!response.ok) {
      throw new Error(response.error);
    }

    applyDashboardState(response);
    setError('');
  };

  const clampedThresholdPreview = useMemo(() => {
    const numeric = Number(thresholdInput);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return clampYoutubeThreshold(numeric);
  }, [thresholdInput]);

  const clampedResetWindowPreview = useMemo(() => {
    const numeric = Number(resetWindowInput);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return clampYoutubeResetWindowHours(numeric);
  }, [resetWindowInput]);

  const resetCountdown = useMemo(() => {
    if (count === 0) {
      return {
        label: 'Reset window',
        value: 'Starts after the first video',
      };
    }

    if (windowStartedAt === null) {
      return {
        label: count >= threshold ? 'Block resets in' : 'Window resets in',
        value: '...',
      };
    }

    const remainingMs = Math.max(
      0,
      windowStartedAt + resetWindowHours * HOUR_IN_MS - nowMs,
    );

    return {
      label: count >= threshold ? 'Block resets in' : 'Window resets in',
      value: formatTimeRemaining(remainingMs),
    };
  }, [count, nowMs, resetWindowHours, threshold, windowStartedAt]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        await loadDashboardState();
      } catch {
        setError('Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();

    const dashboardRefreshIntervalId = window.setInterval(() => {
      void loadDashboardState().catch(() => undefined);
    }, 2_000);
    const countdownIntervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(dashboardRefreshIntervalId);
      window.clearInterval(countdownIntervalId);
    };
  }, []);

  const updateYoutubeSettings = async (updates: {
    threshold?: number;
    resetWindowHours?: number;
  }) => {
    setError('');
    setIsSaving(true);

    try {
      const response = await sendRuntimeMessage<UpdateYoutubeSettingsResponse>({
        type: MESSAGE_TYPES.updateYoutubeSettings,
        siteId: 'youtube',
        ...updates,
      });

      if (!response.ok) {
        throw new Error(response.error);
      }

      await loadDashboardState();
    } catch {
      setError('Failed to update YouTube settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateThreshold = async (rawValue: string) => {
    setThresholdInput(rawValue);

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    await updateYoutubeSettings({
      threshold: clampYoutubeThreshold(parsed),
    });
  };

  const updateResetWindow = async (rawValue: string) => {
    setResetWindowInput(rawValue);

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }

    await updateYoutubeSettings({
      resetWindowHours: clampYoutubeResetWindowHours(parsed),
    });
  };

  return (
    <section className="dashboard-card" aria-label="YouTube">
    <div className="card-overview">
      <div className="card-copy">
        <h2>YouTube</h2>
        <p className="section-copy">
          Reaching the video limit blocks YouTube until the active reset window
          expires.
        </p>
      </div>

      <div className="settings-wrapper">
      <div className="settings-grid">
        <div className="setting-field">
          <label className="field-label" htmlFor="youtube-threshold">
            Threshold ({YOUTUBE_THRESHOLD_MIN}-{YOUTUBE_THRESHOLD_MAX})
          </label>
          <input
            id="youtube-threshold"
            name="youtube-threshold"
            className="threshold-input"
            type="number"
            min={YOUTUBE_THRESHOLD_MIN}
            max={YOUTUBE_THRESHOLD_MAX}
            step={1}
            value={thresholdInput}
            onChange={(event) => void updateThreshold(event.currentTarget.value)}
          />
          <p className="field-help">Block after this many completed videos.</p>
        </div>

        <div className="setting-field">
          <label className="field-label" htmlFor="youtube-reset-window">
            Reset window (hours)
          </label>
          <input
            id="youtube-reset-window"
            name="youtube-reset-window"
            className="threshold-input"
            type="number"
            min={YOUTUBE_RESET_WINDOW_HOURS_MIN}
            max={YOUTUBE_RESET_WINDOW_HOURS_MAX}
            step={1}
            value={resetWindowInput}
            onChange={(event) =>
              void updateResetWindow(event.currentTarget.value)
            }
          />
          <p className="field-help">Reset the counter after this many hours.</p>
        </div>
      </div>

      <div className="metric-panel">
          <div className="metric-grid">
            <div className="metric-item">
              <p className="metric-label">Videos watched this window</p>
              <p className="metric-value">{isLoading ? '...' : count}</p>
            </div>
            <div className="metric-item">
              <p className="metric-label">Videos watched today</p>
              <p className="metric-value metric-value-secondary">
                {isLoading ? '...' : todayCount}
              </p>
            </div>
            <div className="metric-item">
              <p className="metric-label">Videos watched total</p>
              <p className="metric-value metric-value-secondary">
                {isLoading ? '...' : totalCount}
              </p>
            </div>
          </div>
          <p className="metric-timer-label">{resetCountdown.label}</p>
          <p className="metric-timer-value">{resetCountdown.value}</p>
        </div>
      </div>
    </div>

    {clampedThresholdPreview !== null &&
    clampedThresholdPreview !== Number(thresholdInput) ? (
      <p className="hint-text">
        Threshold will be clamped to: {clampedThresholdPreview}
      </p>
    ) : null}
    {clampedResetWindowPreview !== null &&
    clampedResetWindowPreview !== Number(resetWindowInput) ? (
      <p className="hint-text">
        Reset window will be clamped to: {clampedResetWindowPreview}
      </p>
    ) : null}
    {isSaving ? <p className="status-text">Saving...</p> : null}
    {error ? <p className="error-text">{error}</p> : null}
  </section>
  )
}

export default App;
