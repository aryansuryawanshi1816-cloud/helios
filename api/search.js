export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const q = (req.query.q || '').trim();
  const max = Math.min(parseInt(req.query.max) || 12, 25);

  if (!q) return res.status(400).json({ error: 'Missing query param: q' });

  const YT_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YT_API_KEY) return res.status(500).json({ error: 'YOUTUBE_API_KEY not set' });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet` +
      `&q=${encodeURIComponent(q)}` +
      `&maxResults=${max}` +
      `&type=video` +
      `&videoCategoryId=10` +
      `&key=${YT_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error.message);
      return res.status(502).json({ error: data.error.message });
    }

    if (!data.items || !data.items.length) {
      return res.json({ songs: [] });
    }

    const songs = data.items.map(item => ({
      id:     item.id.videoId,
      title:  item.snippet.title,
      artist: item.snippet.channelTitle,
      thumb:  item.snippet.thumbnails?.medium?.url ||
              `https://i.ytimg.com/vi/${item.id.videoId}/mqdefault.jpg`
    }));

    // Cache for 1 hour on Vercel edge
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ songs });

  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
}
