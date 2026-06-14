import { Innertube } from 'youtubei.js';

// Reuse one Innertube client across invocations (warm lambdas)
let clientPromise;
function getClient() {
  if (!clientPromise) {
    clientPromise = Innertube.create({ lang: 'en', location: 'US' });
  }
  return clientPromise;
}

function formatVideo(v) {
  return {
    id: v.id,
    title: v.title?.text ?? String(v.title ?? '(untitled)'),
    channel: v.author?.name ?? '',
    thumbnail:
      v.thumbnails?.[v.thumbnails.length - 1]?.url ??
      v.best_thumbnail?.url ??
      null,
    duration: v.duration?.text ?? '',
    views: v.short_view_count?.text ?? v.view_count?.text ?? '',
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type') === 'channel' ? 'channel' : 'video';

  if (!q) {
    return Response.json(
      { error: 'Missing required query parameter "q"' },
      { status: 400 }
    );
  }

  try {
    const yt = await getClient();

    if (type === 'channel') {
      // Step 1: find the channel itself
      const channelSearch = await yt.search(q, { type: 'channel' });
      const match = channelSearch.results?.find((r) => r.type === 'Channel');

      if (!match) {
        return Response.json(
          { error: `No channel found matching "${q}"` },
          { status: 404 }
        );
      }

      // Step 2: pull that channel's videos
      const channel = await yt.getChannel(match.id);
      const videosTab = await channel.getVideos();

      const results = (videosTab.videos ?? [])
        .filter((v) => v.type === 'Video')
        .map(formatVideo);

      return Response.json({
        mode: 'channel',
        channel: {
          id: match.id,
          name: match.author?.name ?? match.name?.text ?? q,
        },
        results,
      });
    }

    // Plain video search
    const search = await yt.search(q, { type: 'video' });
    const results = (search.results ?? [])
      .filter((item) => item.type === 'Video')
      .map(formatVideo);

    return Response.json({ mode: 'video', results });
  } catch (err) {
    console.error('Search error:', err);
    return Response.json(
      { error: 'Search failed', details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
