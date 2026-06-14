import { Innertube } from 'youtubei.js';

let clientPromise;
function getClient() {
  if (!clientPromise) {
    clientPromise = Innertube.create({ lang: 'en', location: 'US' });
  }
  return clientPromise;
}

// Allow longer-running downloads. Hobby plans cap this lower than Pro;
// lower this number if your Vercel plan rejects the deployment.
export const maxDuration = 60;

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

  try {
    const yt = await getClient();
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
    console.error('Download error:', err);
    return Response.json(
      { error: 'Download failed', details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
