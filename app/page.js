'use client';

import { useState } from 'react';

export default function Page() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('video'); // 'video' | 'channel'
  const [results, setResults] = useState([]);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const [savingId, setSavingId] = useState(null);
  const [doneId, setDoneId] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setChannel(null);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&type=${mode}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results || []);
      setChannel(data.channel || null);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(video) {
    setSavingId(video.id);
    setError(null);

    try {
      const res = await fetch(`/api/download?id=${video.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Download failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(video.title || 'video').replace(/[\\/:*?"<>|]/g, '')}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDoneId(video.id);
      setTimeout(() => setDoneId((cur) => (cur === video.id ? null : cur)), 2500);
    } catch (err) {
      setError(`Couldn't save "${video.title}" — ${err.message}`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <h1 className="header__title">
          <span className="rec-dot" aria-hidden="true" />
          Grab
        </h1>
        <p className="header__subtitle">
          search youtube · save to this device
        </p>
      </header>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="mode-toggle" role="tablist" aria-label="Search mode">
          <button
            type="button"
            className={mode === 'video' ? 'active' : ''}
            onClick={() => setMode('video')}
          >
            Video
          </button>
          <button
            type="button"
            className={mode === 'channel' ? 'active' : ''}
            onClick={() => setMode('channel')}
          >
            Channel
          </button>
        </div>

        <div className="search-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'channel' ? 'Channel name…' : 'Search query…'}
          />
          <button type="submit" disabled={loading}>
            {loading ? '…' : 'Search'}
          </button>
        </div>
      </form>

      {error && <p className="status error">{error}</p>}

      {channel && (
        <p className="channel-banner">
          Showing latest uploads from {channel.name}
        </p>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <p className="empty-state">No results found.</p>
      )}

      <div className="results">
        {results.map((video) => {
          const isSaving = savingId === video.id;
          const isDone = doneId === video.id;

          return (
            <div className="result-card" key={video.id}>
              {video.thumbnail ? (
                <img
                  className="result-card__thumb"
                  src={video.thumbnail}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="result-card__thumb" />
              )}

              <div className="result-card__info">
                <p className="result-card__title">{video.title}</p>
                <p className="result-card__meta">
                  {video.channel}
                  {video.duration ? ` · ${video.duration}` : ''}
                  {video.views ? ` · ${video.views}` : ''}
                </p>
              </div>

              <button
                className={`save-btn ${isSaving ? 'is-loading' : ''} ${
                  isDone ? 'is-done' : ''
                }`}
                onClick={() => handleSave(video)}
                disabled={isSaving}
                aria-label={`Save ${video.title}`}
                title="Save video"
              >
                {isDone ? <CheckIcon /> : <DownloadIcon />}
              </button>
            </div>
          );
        })}
      </div>

      <details className="api-docs">
        <summary>API · for Apple Shortcuts</summary>
        <p>
          This page calls the same two endpoints a Shortcut can call
          directly. Point a &quot;Get Contents of URL&quot; action at these
          URLs (replace <code>your-app</code> with your Vercel domain):
        </p>
        <pre>{`GET /api/search?q=<query>&type=video
GET /api/search?q=<channel name>&type=channel
GET /api/download?id=<video id>`}</pre>
        <p>
          <strong>Search</strong> returns JSON: a <code>results</code> array
          of objects with <code>id</code>, <code>title</code>,{' '}
          <code>channel</code>, <code>thumbnail</code>,{' '}
          <code>duration</code>, and <code>views</code>. Use &quot;Choose from
          List&quot; on the titles, then look up the matching <code>id</code>.
        </p>
        <p>
          <strong>Download</strong> returns the raw MP4 file with headers set
          for &quot;Save to Photos&quot;. Pass the file from &quot;Get
          Contents of URL&quot; straight into a &quot;Save to Photos&quot;
          action to land it in the camera roll.
        </p>
        <p>
          On the web, the save button downloads the file to your device. On
          iOS Safari that lands in the Files app — use the share sheet&apos;s
          &quot;Save Video&quot; option to move it into Photos, or use the
          Shortcut for a one-tap flow straight to the camera roll.
        </p>
      </details>
    </main>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
