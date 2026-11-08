/**
 * [BTV-VIDEO] FILE MỚI: Nhận URL YouTube an toàn và tải IFrame Player API (một lần).
 * YouTube IFrame Player API — phát video NGAY TRONG website Bàn Tay Vàng.
 * Không dùng window.open / location.href để mở YouTube.
 * Tài liệu: https://developers.google.com/youtube/iframe_api_reference
 */
let apiPromise;

/** Chỉ chấp nhận ID hoặc URL video thuộc đúng domain YouTube. */
export function youtubeId(value) {
  const raw = String(value || '').trim();
  const valid = (id) => /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
  if (valid(raw)) return raw;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol)) return null;
  const host = url.hostname.toLowerCase();
  const path = url.pathname.split('/').filter(Boolean);
  if (host === 'youtu.be' || host === 'www.youtu.be') return valid(path[0]);
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(host)) return null;
  if (path[0] === 'watch') return valid(url.searchParams.get('v'));
  if (['embed', 'shorts', 'live', 'v'].includes(path[0])) return valid(path[1]);
  return null;
}

/** Tải SDK đúng một lần, gồm cả trường hợp các phần khác cũng đang dùng nó. */
export function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const oldReady = window.onYouTubeIframeAPIReady;
    let complete = false;
    const timeout = setTimeout(() => finish(new Error('YouTube tải quá lâu. Hãy kiểm tra mạng hoặc trình chặn quảng cáo.')), 20000);
    function finish(error) {
      if (complete) return;
      complete = true;
      clearTimeout(timeout);
      if (error) { apiPromise = null; reject(error); }
      else resolve(window.YT);
    }
    window.onYouTubeIframeAPIReady = () => {
      if (typeof oldReady === 'function') oldReady();
      finish();
    };
    let script = document.querySelector('script[data-btv-youtube-api]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.btvYoutubeApi = '1';
      document.head.append(script);
    }
    script.addEventListener('error', () => finish(new Error('Không thể tải YouTube Player.')), { once: true });
  });
  return apiPromise;
}
