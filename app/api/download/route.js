import { Innertube, ClientType } from 'youtubei.js';

// Allow longer-running downloads. Hobby plans cap this lower than Pro;
// lower this number if your Vercel plan rejects the deployment.
export const maxDuration = 60;

// Try the default (WEB) client first. If a video is age/sign-in gated,
// retry with client types that don't enforce that gate as strictly.
const CLIENT_FALLBACKS = [undefined, ClientType.TV_EMBEDDED, ClientType.IOS, ClientType.ANDROID];

const clientCache = new Map();

async function getClient(clientType) {
  const key = clientType ?? 'default';
  if (!clientCache.has(key)) {
    const options = { lang: 'en', location: 'US' };
    if (clientType) options.client_type = clientType;
    clientCache.set(key, Innertube.create(options));
  }
  return clientCache.get(key);
}

function isAccessError(err) {
  const msg = String(err?.message ?? '').toLowerCase();
  return msg.includes('login') || msg.includes('age') || msg.includes('sign in');
}

function safeFilename(title) {
  const cleaned = (title || 'video')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || 'video';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json(
      { error: 'Missing required query parameter "id"' },
      { status: 400 }
    );
  }

  let lastErr;

  for (const clientType of CLIENT_FALLBACKS) {
    try {
      const yt = await getClient(clientType);
      const info = await yt.getBasicInfo(id);
      const filename = safeFilename(info.basic_info?.title) + '.mp4';

      // "video+audio" picks a format that already has both tracks muxed
      // together (no ffmpeg needed). This typically caps out around
      // 360p-720p depending on what YouTube has available for the video.
      const stream = await yt.download(id, {
        type: 'video+audio',
        quality: 'best',
        format: 'mp4',
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      lastErr = err;
      // Only keep trying other clients if this looks like an
      // age/sign-in gate. Other errors (not found, etc.) won't be
      // fixed by switching client type.
      if (!isAccessError(err)) break;
      console.warn(
        `Download via ${clientType ?? 'default'} client failed (${err.message}), trying next client...`
      );
    }
  }

  console.error('Download error:', lastErr);
  return Response.json(
    { error: 'Download failed', details: String(lastErr?.message ?? lastErr) },
    { status: 500 }
  );
}
