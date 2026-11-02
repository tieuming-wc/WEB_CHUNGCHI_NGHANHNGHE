/**
 * ============================================================
 *  FILE: js/components/captcha.js
 *  MỤC ĐÍCH: Ô xác minh "Tôi không phải robot" (CAPTCHA) cho Đăng ký / Đăng nhập / Quên mật khẩu.
 *
 *  Cách hoạt động: người dùng tích ô → hiện một ảnh chứa 5 ký tự méo → gõ lại đúng thì qua.
 *  Ảnh được vẽ bằng canvas, có nhiễu đường kẻ để robot đọc khó hơn.
 *
 *  ⚠ GIỚI HẠN THẬT THÀ: web đặt trên GitHub Pages là web TĨNH, không có máy chủ riêng để
 *  "kiểm tra lại CAPTCHA phía máy chủ" như đặc tả mong muốn. CAPTCHA ở đây chỉ chặn được
 *  thao tác tự động đơn giản trên giao diện. Để chặn bot thật sự cần bật "Firebase App Check"
 *  (reCAPTCHA) – hướng dẫn ở README, mục "Nâng cấp bảo mật".
 * ============================================================
 */
import { MSG } from '../utils/messages.js';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';        // bỏ ký tự dễ nhầm (O/0, I/1)

/** Vẽ chuỗi ký tự méo lên canvas */
function drawCode(canvas, code) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#f3ead8'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 7; i++) {                              // đường kẻ nhiễu
    ctx.strokeStyle = `hsla(${Math.random() * 360},40%,45%,.5)`;
    ctx.beginPath(); ctx.moveTo(Math.random() * w, Math.random() * h); ctx.lineTo(Math.random() * w, Math.random() * h); ctx.stroke();
  }
  [...code].forEach((ch, i) => {
    ctx.save();
    ctx.translate(18 + i * 28, h / 2 + (Math.random() * 8 - 4));
    ctx.rotate((Math.random() - 0.5) * 0.7);
    ctx.font = `bold ${26 + Math.random() * 6}px Georgia, serif`;
    ctx.fillStyle = `hsl(${Math.random() * 40 + 10},60%,28%)`;
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}

/**
 * Gắn CAPTCHA vào container. Trả về {isPassed(), reset(), onChange(cb), error()}
 */
export function mountCaptcha(container) {
  let code = '', passed = false, listeners = [];
  container.innerHTML = `
    <div class="captcha">
      <label class="captcha-check"><input type="checkbox" id="cap-box"> <span>Tôi không phải robot</span></label>
      <div class="captcha-challenge" hidden>
        <canvas width="170" height="52" aria-label="Ảnh chứa mã xác minh"></canvas>
        <button type="button" class="btn btn-ghost btn-sm" data-act="refresh" aria-label="Đổi mã khác">↻</button>
        <input type="text" class="captcha-input" autocomplete="off" maxlength="5" placeholder="Nhập 5 ký tự" aria-label="Nhập mã xác minh">
        <button type="button" class="btn btn-primary btn-sm" data-act="verify">Xác nhận</button>
      </div>
      <p class="captcha-ok" hidden>✔ Đã xác minh</p>
      <p class="field-error" role="alert"></p>
    </div>`;
  const box = container.querySelector('#cap-box');
  const chal = container.querySelector('.captcha-challenge');
  const canvas = container.querySelector('canvas');
  const input = container.querySelector('.captcha-input');
  const ok = container.querySelector('.captcha-ok');
  const errBox = container.querySelector('.field-error');
  const notify = () => listeners.forEach((cb) => cb(passed));

  const newCode = () => {
    code = Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
    drawCode(canvas, code); input.value = '';
  };
  const setError = (m) => { errBox.textContent = m || ''; container.classList.toggle('has-error', !!m); };

  box.addEventListener('change', () => {
    if (passed) { box.checked = true; return; }
    chal.hidden = !box.checked;
    if (box.checked) { newCode(); input.focus(); } else setError('');
  });
  container.querySelector('[data-act="refresh"]').onclick = newCode;
  const verify = () => {
    if (input.value.trim().toUpperCase() === code) {
      passed = true; chal.hidden = true; ok.hidden = false; box.checked = true; box.disabled = true; setError(''); notify();
    } else { setError('Mã chưa đúng, vui lòng thử lại.'); newCode(); input.focus(); }
  };
  container.querySelector('[data-act="verify"]').onclick = verify;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } });

  return {
    isPassed: () => passed,
    onChange: (cb) => listeners.push(cb),
    /** Hiện lỗi "Vui lòng xác minh bạn không phải robot." nếu chưa qua */
    check() { setError(passed ? '' : MSG.needCaptcha); return passed; },
    /** Làm mới để xác minh lại (sau khi gửi form thất bại) */
    reset() { passed = false; box.checked = false; box.disabled = false; chal.hidden = true; ok.hidden = true; setError(''); notify(); }
  };
}
