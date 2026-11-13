// Prop ikonları — tamamı canvas path'leri ile çizilir (dış görsel yok, telif yok)
const GOLD = '#F4C430', GREEN = '#2BB673', RED = '#E5484D', YEL = '#FFD54A', ORANGE = '#FF8A3D', BLUE = '#3B82F6', PINK = '#F59BB8', BROWN = '#8B5A2B';

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function circ(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}
function fs(c, fill, stroke) {
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function line(c, pts) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.stroke();
}
function heartPath(c, s) {
  c.beginPath();
  c.moveTo(0, s * 0.35);
  c.bezierCurveTo(-s * 0.55, -s * 0.05, -s * 0.45, -s * 0.5, 0, -s * 0.22);
  c.bezierCurveTo(s * 0.45, -s * 0.5, s * 0.55, -s * 0.05, 0, s * 0.35);
  c.closePath();
}
function starPath(c, r, n = 5, inner = 0.45) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n - Math.PI / 2;
    const rad = i % 2 ? r * inner : r;
    c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  c.closePath();
}
function text(c, str, size, fill, stroke, font) {
  c.font = `900 ${size}px ${font}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (stroke) {
    c.lineWidth = size * 0.12;
    c.strokeStyle = stroke;
    c.strokeText(str, 0, 0);
  }
  c.fillStyle = fill;
  c.fillText(str, 0, 0);
}

/**
 * @param c   CanvasRenderingContext2D (orijin ikon merkezine taşınmış olmalı)
 * @param s   ikon boyutu (px)
 * @param th  tema
 * @param t   zaman (sn) — animasyonlu ikonlar için
 */
export function drawIcon(c, name, s, th, t = 0) {
  const ink = th.stroke;
  const bg = th.bg;
  c.save();
  c.lineWidth = Math.max(2, s * 0.055);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = ink;
  const h = s / 2;
  switch (name) {
    case 'lightbulb': {
      const glow = 0.5 + 0.5 * Math.sin(t * 6);
      c.save();
      c.strokeStyle = YEL;
      c.globalAlpha = 0.6 + glow * 0.4;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        if (Math.sin(a) > 0.5) continue;
        line(c, [Math.cos(a) * s * 0.42, -s * 0.12 + Math.sin(a) * s * 0.42, Math.cos(a) * s * 0.55, -s * 0.12 + Math.sin(a) * s * 0.55]);
      }
      c.restore();
      circ(c, 0, -s * 0.12, s * 0.28);
      fs(c, YEL, ink);
      rr(c, -s * 0.13, s * 0.14, s * 0.26, s * 0.2, s * 0.04);
      fs(c, '#BDBDBD', ink);
      line(c, [-s * 0.06, -s * 0.05, 0, -s * 0.15, s * 0.06, -s * 0.05]);
      break;
    }
    case 'question':
      text(c, '?', s * 1.0, th.accent, ink, th.fontFamily);
      break;
    case 'exclamation':
      text(c, '!', s * 1.0, th.accent, ink, th.fontFamily);
      break;
    case 'money': {
      c.rotate(-0.12);
      rr(c, -h, -s * 0.28, s, s * 0.56, s * 0.05);
      fs(c, '#7BC67E', ink);
      circ(c, 0, 0, s * 0.17);
      fs(c, '#DFF3D8', ink);
      text(c, '$', s * 0.26, '#2E7D32', null, th.fontFamily);
      break;
    }
    case 'coin':
    case 'hand-coins': {
      const n = name === 'coin' ? 1 : 3;
      for (let i = n - 1; i >= 0; i--) {
        c.save();
        c.translate(name === 'coin' ? 0 : (i - 1) * s * 0.18, name === 'coin' ? 0 : -i * s * 0.12 + s * 0.12);
        circ(c, 0, 0, s * (name === 'coin' ? 0.4 : 0.28));
        fs(c, GOLD, ink);
        text(c, '$', s * (name === 'coin' ? 0.45 : 0.3), '#8D6E00', null, th.fontFamily);
        c.restore();
      }
      break;
    }
    case 'heart': {
      const b = 1 + Math.sin(t * 7) * 0.06;
      c.scale(b, b);
      heartPath(c, s);
      fs(c, RED, ink);
      break;
    }
    case 'broken-heart':
      heartPath(c, s);
      fs(c, RED, ink);
      line(c, [0, -s * 0.22, -s * 0.08, -s * 0.05, s * 0.06, s * 0.05, -s * 0.03, s * 0.3]);
      break;
    case 'clock': {
      circ(c, 0, 0, s * 0.42);
      fs(c, bg, ink);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        line(c, [Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.34, Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.38]);
      }
      const am = t * 2, ah = t * 0.25;
      line(c, [0, 0, Math.sin(am) * s * 0.3, -Math.cos(am) * s * 0.3]);
      c.strokeStyle = th.accent;
      line(c, [0, 0, Math.sin(ah) * s * 0.2, -Math.cos(ah) * s * 0.2]);
      break;
    }
    case 'hourglass': {
      c.rotate(Math.sin(t * 1.5) * 0.08);
      line(c, [-s * 0.28, -s * 0.42, s * 0.28, -s * 0.42]);
      line(c, [-s * 0.28, s * 0.42, s * 0.28, s * 0.42]);
      c.beginPath();
      c.moveTo(-s * 0.22, -s * 0.42);
      c.lineTo(s * 0.22, -s * 0.42);
      c.lineTo(s * 0.02, 0);
      c.lineTo(s * 0.22, s * 0.42);
      c.lineTo(-s * 0.22, s * 0.42);
      c.lineTo(-s * 0.02, 0);
      c.closePath();
      fs(c, th.dark ? '#ffffff22' : '#00000008', ink);
      const k = (t * 0.2) % 1;
      c.beginPath();
      c.moveTo(-s * 0.18 * (1 - k), s * 0.4 - s * 0.25 * k);
      c.lineTo(s * 0.18 * (1 - k) + s * 0.04, s * 0.4 - s * 0.25 * k);
      c.lineTo(s * 0.2, s * 0.4);
      c.lineTo(-s * 0.2, s * 0.4);
      c.fillStyle = GOLD;
      c.fill();
      break;
    }
    case 'phone':
      rr(c, -s * 0.24, -s * 0.42, s * 0.48, s * 0.84, s * 0.07);
      fs(c, '#333', ink);
      rr(c, -s * 0.19, -s * 0.34, s * 0.38, s * 0.62, s * 0.03);
      fs(c, th.accent2);
      circ(c, 0, s * 0.35, s * 0.03);
      fs(c, '#999');
      break;
    case 'laptop':
      rr(c, -s * 0.38, -s * 0.34, s * 0.76, s * 0.5, s * 0.04);
      fs(c, '#333', ink);
      rr(c, -s * 0.32, -s * 0.29, s * 0.64, s * 0.4, s * 0.02);
      fs(c, th.accent2);
      c.beginPath();
      c.moveTo(-s * 0.48, s * 0.26);
      c.lineTo(s * 0.48, s * 0.26);
      c.lineTo(s * 0.4, s * 0.16);
      c.lineTo(-s * 0.4, s * 0.16);
      c.closePath();
      fs(c, '#BDBDBD', ink);
      break;
    case 'book':
      c.beginPath();
      c.moveTo(0, -s * 0.26);
      c.quadraticCurveTo(-s * 0.22, -s * 0.36, -s * 0.46, -s * 0.28);
      c.lineTo(-s * 0.46, s * 0.3);
      c.quadraticCurveTo(-s * 0.22, s * 0.22, 0, s * 0.32);
      c.quadraticCurveTo(s * 0.22, s * 0.22, s * 0.46, s * 0.3);
      c.lineTo(s * 0.46, -s * 0.28);
      c.quadraticCurveTo(s * 0.22, -s * 0.36, 0, -s * 0.26);
      c.closePath();
      fs(c, bg, ink);
      line(c, [0, -s * 0.26, 0, s * 0.32]);
      c.lineWidth *= 0.6;
      for (let i = 0; i < 4; i++) {
        line(c, [-s * 0.38, -s * 0.15 + i * s * 0.11, -s * 0.08, -s * 0.13 + i * s * 0.11]);
        line(c, [s * 0.08, -s * 0.13 + i * s * 0.11, s * 0.38, -s * 0.15 + i * s * 0.11]);
      }
      break;
    case 'globe': {
      circ(c, 0, 0, s * 0.42);
      fs(c, '#6EC6FF', ink);
      c.save();
      circ(c, 0, 0, s * 0.42);
      c.clip();
      c.fillStyle = '#4CAF50';
      const o = ((t * 0.15) % 1) * s * 0.84 - s * 0.42;
      for (const dx of [o, o - s * 0.84, o + s * 0.84]) {
        c.beginPath();
        c.ellipse(dx - s * 0.1, -s * 0.12, s * 0.16, s * 0.12, 0.4, 0, 7);
        c.ellipse(dx + s * 0.15, s * 0.15, s * 0.12, s * 0.16, -0.2, 0, 7);
        c.fill();
      }
      c.restore();
      c.lineWidth *= 0.6;
      c.beginPath();
      c.ellipse(0, 0, s * 0.18, s * 0.42, 0, 0, 7);
      c.stroke();
      line(c, [-s * 0.42, 0, s * 0.42, 0]);
      break;
    }
    case 'chart-up':
    case 'chart-down': {
      const up = name === 'chart-up';
      line(c, [-s * 0.42, -s * 0.42, -s * 0.42, s * 0.42, s * 0.45, s * 0.42]);
      c.strokeStyle = up ? GREEN : RED;
      c.lineWidth *= 1.4;
      const pts = up ? [-0.32, 0.25, -0.1, 0.05, 0.05, 0.15, 0.32, -0.25] : [-0.32, -0.25, -0.1, -0.05, 0.05, -0.15, 0.32, 0.25];
      line(c, pts.map((v) => v * s));
      const [x1, y1, x2, y2] = pts.slice(-4).map((v) => v * s);
      const a = Math.atan2(y2 - y1, x2 - x1);
      c.beginPath();
      c.moveTo(x2 + Math.cos(a) * s * 0.08, y2 + Math.sin(a) * s * 0.08);
      c.lineTo(x2 + Math.cos(a + 2.4) * s * 0.14, y2 + Math.sin(a + 2.4) * s * 0.14);
      c.lineTo(x2 + Math.cos(a - 2.4) * s * 0.14, y2 + Math.sin(a - 2.4) * s * 0.14);
      c.closePath();
      c.fillStyle = up ? GREEN : RED;
      c.fill();
      break;
    }
    case 'pie-chart': {
      circ(c, 0, 0, s * 0.4);
      fs(c, th.accent2, ink);
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, s * 0.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 0.7);
      c.closePath();
      fs(c, th.accent, ink);
      break;
    }
    case 'rocket': {
      c.rotate(0.6);
      c.save();
      const f = 0.8 + Math.sin(t * 25) * 0.2;
      c.beginPath();
      c.moveTo(-s * 0.1, s * 0.3);
      c.quadraticCurveTo(0, s * (0.3 + 0.35 * f), s * 0.1, s * 0.3);
      c.fillStyle = ORANGE;
      c.fill();
      c.restore();
      c.beginPath();
      c.moveTo(0, -s * 0.48);
      c.quadraticCurveTo(s * 0.2, -s * 0.2, s * 0.14, s * 0.3);
      c.lineTo(-s * 0.14, s * 0.3);
      c.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s * 0.48);
      fs(c, '#ECEFF1', ink);
      circ(c, 0, -s * 0.12, s * 0.07);
      fs(c, th.accent2, ink);
      c.beginPath();
      c.moveTo(-s * 0.14, s * 0.1);
      c.lineTo(-s * 0.28, s * 0.32);
      c.lineTo(-s * 0.14, s * 0.3);
      c.moveTo(s * 0.14, s * 0.1);
      c.lineTo(s * 0.28, s * 0.32);
      c.lineTo(s * 0.14, s * 0.3);
      fs(c, th.accent, ink);
      break;
    }
    case 'tree':
      rr(c, -s * 0.06, 0, s * 0.12, s * 0.45, s * 0.02);
      fs(c, BROWN, ink);
      c.beginPath();
      c.arc(0, -s * 0.15, s * 0.26, 0, 7);
      c.arc(-s * 0.2, s * 0.02, s * 0.18, 0, 7);
      c.arc(s * 0.2, s * 0.02, s * 0.18, 0, 7);
      fs(c, '#57B05A');
      c.beginPath();
      c.arc(0, -s * 0.15, s * 0.26, 0, 7);
      c.stroke();
      break;
    case 'house':
      rr(c, -s * 0.34, -s * 0.05, s * 0.68, s * 0.47, s * 0.02);
      fs(c, bg, ink);
      c.beginPath();
      c.moveTo(-s * 0.44, -s * 0.03);
      c.lineTo(0, -s * 0.42);
      c.lineTo(s * 0.44, -s * 0.03);
      c.closePath();
      fs(c, th.accent, ink);
      rr(c, -s * 0.08, s * 0.16, s * 0.16, s * 0.26, s * 0.02);
      fs(c, th.accent2, ink);
      break;
    case 'sun': {
      c.save();
      c.rotate(t * 0.5);
      c.strokeStyle = '#FFB300';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        line(c, [Math.cos(a) * s * 0.32, Math.sin(a) * s * 0.32, Math.cos(a) * s * 0.47, Math.sin(a) * s * 0.47]);
      }
      c.restore();
      circ(c, 0, 0, s * 0.25);
      fs(c, YEL, '#FFB300');
      break;
    }
    case 'moon':
      c.beginPath();
      c.arc(0, 0, s * 0.38, 0.6, Math.PI * 2 - 0.6, false);
      c.arc(s * 0.18, -s * 0.05, s * 0.3, Math.PI * 2 - 0.9, 0.9, true);
      c.closePath();
      fs(c, '#FFF3B0', ink);
      break;
    case 'cloud':
    case 'rain':
    case 'lightning': {
      const dy = name === 'cloud' ? 0 : -s * 0.15;
      c.beginPath();
      c.arc(-s * 0.18, dy + s * 0.02, s * 0.17, 0, 7);
      c.arc(s * 0.02, dy - s * 0.1, s * 0.22, 0, 7);
      c.arc(s * 0.22, dy + s * 0.03, s * 0.16, 0, 7);
      fs(c, name === 'cloud' ? '#F1F5F9' : '#B0BEC5');
      c.beginPath();
      c.arc(-s * 0.18, dy + s * 0.02, s * 0.17, Math.PI * 0.5, Math.PI * 1.6);
      c.arc(s * 0.02, dy - s * 0.1, s * 0.22, Math.PI * 1.1, Math.PI * 1.95);
      c.arc(s * 0.22, dy + s * 0.03, s * 0.16, Math.PI * 1.4, Math.PI * 0.5);
      c.closePath();
      c.stroke();
      if (name === 'rain') {
        c.strokeStyle = BLUE;
        for (let i = 0; i < 4; i++) {
          const k = (t * 1.6 + i * 0.27) % 1;
          const x = -s * 0.24 + i * s * 0.16;
          line(c, [x, s * 0.08 + k * s * 0.35, x - s * 0.03, s * 0.16 + k * s * 0.35]);
        }
      }
      if (name === 'lightning') {
        c.globalAlpha = Math.sin(t * 9) > -0.3 ? 1 : 0.3;
        c.beginPath();
        c.moveTo(s * 0.04, s * 0.05);
        c.lineTo(-s * 0.1, s * 0.28);
        c.lineTo(0, s * 0.28);
        c.lineTo(-s * 0.08, s * 0.5);
        c.lineTo(s * 0.14, s * 0.2);
        c.lineTo(s * 0.03, s * 0.2);
        c.lineTo(s * 0.12, s * 0.05);
        c.closePath();
        fs(c, YEL, ink);
      }
      break;
    }
    case 'fire': {
      const f = Math.sin(t * 14) * 0.04;
      c.beginPath();
      c.moveTo(0, s * 0.42);
      c.bezierCurveTo(-s * 0.4, s * 0.4, -s * 0.36, -s * 0.05, -s * (0.05 + f), -s * 0.45);
      c.bezierCurveTo(-s * 0.02, -s * 0.15, s * 0.12, -s * 0.2, s * (0.12 - f), -s * 0.32);
      c.bezierCurveTo(s * 0.4, -s * 0.05, s * 0.38, s * 0.4, 0, s * 0.42);
      fs(c, ORANGE, ink);
      c.beginPath();
      c.moveTo(0, s * 0.38);
      c.bezierCurveTo(-s * 0.18, s * 0.36, -s * 0.16, s * 0.1, 0, -s * (0.05 + f));
      c.bezierCurveTo(s * 0.16, s * 0.1, s * 0.18, s * 0.36, 0, s * 0.38);
      fs(c, YEL);
      break;
    }
    case 'star':
      c.rotate(Math.sin(t * 2) * 0.12);
      starPath(c, s * 0.45);
      fs(c, YEL, ink);
      break;
    case 'warning':
      c.beginPath();
      c.moveTo(0, -s * 0.42);
      c.lineTo(s * 0.46, s * 0.38);
      c.lineTo(-s * 0.46, s * 0.38);
      c.closePath();
      fs(c, YEL, ink);
      c.translate(0, s * 0.06);
      text(c, '!', s * 0.5, '#222', null, th.fontFamily);
      break;
    case 'check':
    case 'cross': {
      circ(c, 0, 0, s * 0.42);
      fs(c, name === 'check' ? GREEN : RED, ink);
      c.strokeStyle = '#fff';
      c.lineWidth *= 1.8;
      if (name === 'check') line(c, [-s * 0.2, 0, -s * 0.05, s * 0.16, s * 0.22, -s * 0.16]);
      else {
        line(c, [-s * 0.17, -s * 0.17, s * 0.17, s * 0.17]);
        line(c, [s * 0.17, -s * 0.17, -s * 0.17, s * 0.17]);
      }
      break;
    }
    case 'brain': {
      c.beginPath();
      c.ellipse(-s * 0.15, 0, s * 0.25, s * 0.32, 0, 0, 7);
      c.ellipse(s * 0.15, 0, s * 0.25, s * 0.32, 0, 0, 7);
      fs(c, PINK);
      c.beginPath();
      c.ellipse(-s * 0.15, 0, s * 0.25, s * 0.32, 0, Math.PI * 0.5, Math.PI * 1.5);
      c.stroke();
      c.beginPath();
      c.ellipse(s * 0.15, 0, s * 0.25, s * 0.32, 0, -Math.PI * 0.5, Math.PI * 0.5);
      c.stroke();
      line(c, [0, -s * 0.3, 0, s * 0.3]);
      c.lineWidth *= 0.7;
      for (const [x, y] of [[-0.2, -0.12], [0.18, -0.15], [-0.18, 0.12], [0.2, 0.1]]) {
        c.beginPath();
        c.arc(x * s, y * s, s * 0.08, 0.3, 2.8);
        c.stroke();
      }
      break;
    }
    case 'gear': {
      c.rotate(t * 1.2);
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? s * 0.32 : s * 0.42;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        c.lineTo(Math.cos(a + 0.39) * r, Math.sin(a + 0.39) * r);
      }
      c.closePath();
      fs(c, '#B0BEC5', ink);
      circ(c, 0, 0, s * 0.12);
      fs(c, bg, ink);
      break;
    }
    case 'trophy':
      c.beginPath();
      c.moveTo(-s * 0.26, -s * 0.4);
      c.lineTo(s * 0.26, -s * 0.4);
      c.quadraticCurveTo(s * 0.26, s * 0.05, 0, s * 0.08);
      c.quadraticCurveTo(-s * 0.26, s * 0.05, -s * 0.26, -s * 0.4);
      fs(c, GOLD, ink);
      c.beginPath();
      c.arc(-s * 0.3, -s * 0.25, s * 0.1, Math.PI * 0.5, Math.PI * 1.5);
      c.stroke();
      c.beginPath();
      c.arc(s * 0.3, -s * 0.25, s * 0.1, -Math.PI * 0.5, Math.PI * 0.5);
      c.stroke();
      line(c, [0, s * 0.08, 0, s * 0.25]);
      rr(c, -s * 0.2, s * 0.25, s * 0.4, s * 0.14, s * 0.02);
      fs(c, BROWN, ink);
      c.save();
      c.translate(0, -s * 0.2);
      starPath(c, s * 0.09);
      fs(c, '#FFF7C2');
      c.restore();
      break;
    case 'magnifier':
      c.rotate(Math.sin(t * 2) * 0.15);
      c.lineWidth *= 1.8;
      line(c, [s * 0.12, s * 0.12, s * 0.4, s * 0.4]);
      c.lineWidth /= 1.8;
      circ(c, -s * 0.08, -s * 0.08, s * 0.28);
      fs(c, '#E3F2FD', ink);
      break;
    case 'lock':
      c.beginPath();
      c.arc(0, -s * 0.1, s * 0.2, Math.PI, 0);
      c.lineWidth *= 1.6;
      c.stroke();
      c.lineWidth /= 1.6;
      rr(c, -s * 0.3, -s * 0.1, s * 0.6, s * 0.48, s * 0.06);
      fs(c, GOLD, ink);
      circ(c, 0, s * 0.1, s * 0.06);
      fs(c, ink);
      break;
    case 'key':
      c.rotate(-0.6);
      circ(c, -s * 0.25, 0, s * 0.16);
      fs(c, GOLD, ink);
      circ(c, -s * 0.25, 0, s * 0.05);
      fs(c, bg, ink);
      c.lineWidth *= 1.6;
      line(c, [-s * 0.09, 0, s * 0.42, 0]);
      line(c, [s * 0.3, 0, s * 0.3, s * 0.12]);
      line(c, [s * 0.4, 0, s * 0.4, s * 0.1]);
      break;
    case 'gift':
      rr(c, -s * 0.36, -s * 0.12, s * 0.72, s * 0.52, s * 0.03);
      fs(c, th.accent, ink);
      rr(c, -s * 0.42, -s * 0.26, s * 0.84, s * 0.16, s * 0.03);
      fs(c, th.accent, ink);
      c.fillStyle = YEL;
      c.fillRect(-s * 0.06, -s * 0.26, s * 0.12, s * 0.66);
      c.beginPath();
      c.ellipse(-s * 0.12, -s * 0.34, s * 0.12, s * 0.07, 0.4, 0, 7);
      c.ellipse(s * 0.12, -s * 0.34, s * 0.12, s * 0.07, -0.4, 0, 7);
      fs(c, YEL, ink);
      break;
    case 'coffee': {
      c.save();
      c.strokeStyle = th.dark ? '#ffffff88' : '#00000055';
      for (let i = 0; i < 3; i++) {
        const o = Math.sin(t * 3 + i) * s * 0.04;
        c.beginPath();
        c.moveTo(-s * 0.12 + i * s * 0.12, -s * 0.15);
        c.quadraticCurveTo(-s * 0.18 + i * s * 0.12 + o, -s * 0.3, -s * 0.12 + i * s * 0.12, -s * 0.44);
        c.stroke();
      }
      c.restore();
      c.beginPath();
      c.arc(s * 0.27, s * 0.05, s * 0.1, -Math.PI / 2, Math.PI / 2);
      c.stroke();
      rr(c, -s * 0.27, -s * 0.1, s * 0.52, s * 0.45, s * 0.07);
      fs(c, '#FFFFFF', ink);
      c.fillStyle = '#6D4C41';
      c.fillRect(-s * 0.22, -s * 0.06, s * 0.42, s * 0.06);
      break;
    }
    case 'car': {
      const b = Math.abs(Math.sin(t * 10)) * s * 0.01;
      c.translate(0, -b);
      c.beginPath();
      c.moveTo(-s * 0.46, s * 0.15);
      c.lineTo(-s * 0.46, -s * 0.02);
      c.lineTo(-s * 0.25, -s * 0.05);
      c.lineTo(-s * 0.13, -s * 0.24);
      c.lineTo(s * 0.18, -s * 0.24);
      c.lineTo(s * 0.32, -s * 0.05);
      c.lineTo(s * 0.46, -s * 0.02);
      c.lineTo(s * 0.46, s * 0.15);
      c.closePath();
      fs(c, th.accent, ink);
      for (const x of [-0.26, 0.26]) {
        circ(c, x * s, s * 0.16, s * 0.1);
        fs(c, '#333', ink);
      }
      break;
    }
    case 'mountain':
      c.beginPath();
      c.moveTo(-s * 0.48, s * 0.36);
      c.lineTo(-s * 0.1, -s * 0.36);
      c.lineTo(s * 0.12, s * 0.02);
      c.lineTo(s * 0.24, -s * 0.14);
      c.lineTo(s * 0.48, s * 0.36);
      c.closePath();
      fs(c, '#90A4AE', ink);
      c.beginPath();
      c.moveTo(-s * 0.22, -s * 0.13);
      c.lineTo(-s * 0.1, -s * 0.36);
      c.lineTo(s * 0.02, -s * 0.15);
      c.lineTo(-s * 0.06, -s * 0.18);
      c.closePath();
      fs(c, '#FFFFFF', ink);
      break;
    case 'flag': {
      line(c, [-s * 0.3, -s * 0.45, -s * 0.3, s * 0.45]);
      c.beginPath();
      c.moveTo(-s * 0.3, -s * 0.42);
      for (let i = 0; i <= 10; i++) {
        const x = -s * 0.3 + (i / 10) * s * 0.65;
        c.lineTo(x, -s * 0.42 + Math.sin(t * 6 + i * 0.6) * s * 0.04);
      }
      for (let i = 10; i >= 0; i--) {
        const x = -s * 0.3 + (i / 10) * s * 0.65;
        c.lineTo(x, -s * 0.08 + Math.sin(t * 6 + i * 0.6) * s * 0.04);
      }
      c.closePath();
      fs(c, th.accent, ink);
      break;
    }
    case 'target': {
      for (const [r, col] of [[0.42, RED], [0.3, '#fff'], [0.18, RED], [0.07, '#fff']]) {
        circ(c, 0, 0, r * s);
        fs(c, col, ink);
      }
      c.lineWidth *= 1.2;
      line(c, [s * 0.02, -s * 0.02, s * 0.42, -s * 0.42]);
      break;
    }
    case 'battery-low':
    case 'battery-full': {
      rr(c, -s * 0.42, -s * 0.2, s * 0.8, s * 0.4, s * 0.06);
      fs(c, bg, ink);
      rr(c, s * 0.38, -s * 0.08, s * 0.07, s * 0.16, s * 0.02);
      fs(c, ink);
      const full = name === 'battery-full';
      const lvl = full ? 0.7 + 0.3 * Math.min(1, (t % 2) / 1.2) : 0.18 + (Math.sin(t * 6) > 0 ? 0 : 0);
      c.globalAlpha = full || Math.sin(t * 6) > -0.5 ? 1 : 0.3;
      rr(c, -s * 0.36, -s * 0.14, s * 0.68 * lvl, s * 0.28, s * 0.03);
      fs(c, full ? GREEN : RED);
      break;
    }
    case 'calendar':
      rr(c, -s * 0.38, -s * 0.32, s * 0.76, s * 0.72, s * 0.05);
      fs(c, '#fff', ink);
      c.fillStyle = th.accent;
      c.fillRect(-s * 0.36, -s * 0.3, s * 0.72, s * 0.15);
      c.fillStyle = ink;
      for (let i = 0; i < 12; i++) c.fillRect(-s * 0.28 + (i % 4) * s * 0.16, -s * 0.06 + Math.floor(i / 4) * s * 0.14, s * 0.08, s * 0.07);
      line(c, [-s * 0.18, -s * 0.4, -s * 0.18, -s * 0.24]);
      line(c, [s * 0.18, -s * 0.4, s * 0.18, -s * 0.24]);
      break;
    case 'mail':
      rr(c, -s * 0.44, -s * 0.28, s * 0.88, s * 0.56, s * 0.04);
      fs(c, '#fff', ink);
      line(c, [-s * 0.44, -s * 0.26, 0, s * 0.06, s * 0.44, -s * 0.26]);
      break;
    case 'camera':
      rr(c, -s * 0.44, -s * 0.22, s * 0.88, s * 0.56, s * 0.07);
      fs(c, '#455A64', ink);
      rr(c, -s * 0.16, -s * 0.32, s * 0.32, s * 0.12, s * 0.03);
      fs(c, '#455A64', ink);
      circ(c, 0, s * 0.06, s * 0.17);
      fs(c, th.accent2, ink);
      circ(c, s * 0.3, -s * 0.11, s * 0.04);
      fs(c, Math.sin(t * 5) > 0 ? RED : '#7f1d1d');
      break;
    case 'music': {
      const b = Math.sin(t * 5) * s * 0.04;
      c.translate(0, b);
      c.lineWidth *= 1.2;
      line(c, [-s * 0.12, s * 0.25, -s * 0.12, -s * 0.32, s * 0.3, -s * 0.4, s * 0.3, s * 0.17]);
      c.beginPath();
      c.ellipse(-s * 0.22, s * 0.27, s * 0.12, s * 0.09, -0.4, 0, 7);
      c.ellipse(s * 0.2, s * 0.19, s * 0.12, s * 0.09, -0.4, 0, 7);
      fs(c, th.accent, ink);
      break;
    }
    case 'crown':
      c.beginPath();
      c.moveTo(-s * 0.42, s * 0.25);
      c.lineTo(-s * 0.46, -s * 0.22);
      c.lineTo(-s * 0.2, 0);
      c.lineTo(0, -s * 0.34);
      c.lineTo(s * 0.2, 0);
      c.lineTo(s * 0.46, -s * 0.22);
      c.lineTo(s * 0.42, s * 0.25);
      c.closePath();
      fs(c, GOLD, ink);
      for (const x of [-0.25, 0, 0.25]) {
        circ(c, x * s, s * 0.12, s * 0.05);
        fs(c, x ? th.accent2 : RED);
      }
      break;
    case 'shield':
      c.beginPath();
      c.moveTo(0, -s * 0.44);
      c.quadraticCurveTo(s * 0.22, -s * 0.32, s * 0.4, -s * 0.34);
      c.quadraticCurveTo(s * 0.42, s * 0.22, 0, s * 0.45);
      c.quadraticCurveTo(-s * 0.42, s * 0.22, -s * 0.4, -s * 0.34);
      c.quadraticCurveTo(-s * 0.22, -s * 0.32, 0, -s * 0.44);
      fs(c, th.accent2, ink);
      c.strokeStyle = '#fff';
      c.lineWidth *= 1.5;
      line(c, [-s * 0.15, 0, -s * 0.03, s * 0.13, s * 0.18, -s * 0.12]);
      break;
    case 'plant':
      c.beginPath();
      c.moveTo(-s * 0.24, s * 0.1);
      c.lineTo(s * 0.24, s * 0.1);
      c.lineTo(s * 0.18, s * 0.45);
      c.lineTo(-s * 0.18, s * 0.45);
      c.closePath();
      fs(c, '#D2691E', ink);
      c.save();
      c.rotate(Math.sin(t * 2) * 0.05);
      line(c, [0, s * 0.1, 0, -s * 0.3]);
      for (const [a, y] of [[-0.8, -0.05], [0.8, -0.15], [-0.7, -0.28]]) {
        c.save();
        c.translate(0, y * s);
        c.rotate(a);
        c.beginPath();
        c.ellipse(0, -s * 0.12, s * 0.07, s * 0.14, 0, 0, 7);
        fs(c, '#57B05A', ink);
        c.restore();
      }
      c.restore();
      break;
    case 'arrow-up':
    case 'arrow-down': {
      const up = name === 'arrow-up';
      c.translate(0, Math.sin(t * 4) * s * 0.04 * (up ? -1 : 1));
      if (!up) c.rotate(Math.PI);
      c.beginPath();
      c.moveTo(0, -s * 0.45);
      c.lineTo(s * 0.36, -s * 0.05);
      c.lineTo(s * 0.14, -s * 0.05);
      c.lineTo(s * 0.14, s * 0.42);
      c.lineTo(-s * 0.14, s * 0.42);
      c.lineTo(-s * 0.14, -s * 0.05);
      c.lineTo(-s * 0.36, -s * 0.05);
      c.closePath();
      fs(c, up ? GREEN : RED, ink);
      break;
    }
    case 'thumbs-up':
    case 'thumbs-down': {
      if (name === 'thumbs-down') c.rotate(Math.PI);
      c.rotate(Math.sin(t * 4) * 0.06);
      rr(c, -s * 0.4, -s * 0.02, s * 0.18, s * 0.42, s * 0.03);
      fs(c, th.accent2, ink);
      c.beginPath();
      c.moveTo(-s * 0.2, 0);
      c.lineTo(-s * 0.04, -s * 0.12);
      c.lineTo(s * 0.0, -s * 0.42);
      c.quadraticCurveTo(s * 0.14, -s * 0.44, s * 0.1, -s * 0.06);
      c.lineTo(s * 0.36, -s * 0.06);
      c.quadraticCurveTo(s * 0.44, 0.02 * s, s * 0.36, s * 0.08);
      c.quadraticCurveTo(s * 0.42, s * 0.16, s * 0.32, s * 0.22);
      c.quadraticCurveTo(s * 0.38, s * 0.3, s * 0.28, s * 0.34);
      c.quadraticCurveTo(s * 0.3, s * 0.42, s * 0.2, s * 0.42);
      c.lineTo(-s * 0.2, s * 0.4);
      c.closePath();
      fs(c, '#FFD7A8', ink);
      break;
    }
    case 'speech':
      c.beginPath();
      c.ellipse(0, -s * 0.06, s * 0.45, s * 0.3, 0, 0, 7);
      fs(c, '#fff', ink);
      c.beginPath();
      c.moveTo(-s * 0.2, s * 0.18);
      c.lineTo(-s * 0.3, s * 0.42);
      c.lineTo(-s * 0.02, s * 0.22);
      fs(c, '#fff', ink);
      for (let i = 0; i < 3; i++) {
        circ(c, (i - 1) * s * 0.16, -s * 0.06 - (Math.floor(t * 3) % 3 === i ? s * 0.04 : 0), s * 0.045);
        fs(c, ink);
      }
      break;
    case 'people':
      for (const [x, sc] of [[-0.3, 0.8], [0.3, 0.8], [0, 1]]) {
        c.save();
        c.translate(x * s, (1 - sc) * s * 0.3);
        c.scale(sc, sc);
        circ(c, 0, -s * 0.28, s * 0.1);
        fs(c, bg, ink);
        line(c, [0, -s * 0.18, 0, s * 0.1]);
        line(c, [-s * 0.14, -s * 0.05, 0, -s * 0.12, s * 0.14, -s * 0.05]);
        line(c, [-s * 0.1, s * 0.35, 0, s * 0.1, s * 0.1, s * 0.35]);
        c.restore();
      }
      break;
    case 'dna':
      for (let i = 0; i <= 12; i++) {
        const y = -s * 0.45 + (i / 12) * s * 0.9;
        const ph = t * 3 + i * 0.55;
        const x1 = Math.sin(ph) * s * 0.25;
        const x2 = -x1;
        c.strokeStyle = th.dark ? '#ffffff66' : '#00000044';
        line(c, [x1, y, x2, y]);
        circ(c, x1, y, s * 0.05);
        fs(c, th.accent);
        circ(c, x2, y, s * 0.05);
        fs(c, th.accent2);
      }
      break;
    case 'atom': {
      c.lineWidth *= 0.8;
      for (let i = 0; i < 3; i++) {
        c.save();
        c.rotate((i * Math.PI) / 3);
        c.beginPath();
        c.ellipse(0, 0, s * 0.45, s * 0.16, 0, 0, 7);
        c.strokeStyle = th.accent2;
        c.stroke();
        const a = t * 3 + i * 2;
        circ(c, Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.16, s * 0.045);
        fs(c, th.accent);
        c.restore();
      }
      circ(c, 0, 0, s * 0.09);
      fs(c, RED, ink);
      break;
    }
    case 'pill':
      c.rotate(-0.6);
      c.save();
      rr(c, -s * 0.42, -s * 0.15, s * 0.84, s * 0.3, s * 0.15);
      c.clip();
      c.fillStyle = '#fff';
      c.fillRect(-s * 0.42, -s * 0.15, s * 0.84, s * 0.3);
      c.fillStyle = th.accent;
      c.fillRect(-s * 0.42, -s * 0.15, s * 0.42, s * 0.3);
      c.restore();
      rr(c, -s * 0.42, -s * 0.15, s * 0.84, s * 0.3, s * 0.15);
      c.stroke();
      break;
    case 'apple':
      c.beginPath();
      c.moveTo(0, -s * 0.22);
      c.bezierCurveTo(-s * 0.5, -s * 0.42, -s * 0.5, s * 0.42, 0, s * 0.38);
      c.bezierCurveTo(s * 0.5, s * 0.42, s * 0.5, -s * 0.42, 0, -s * 0.22);
      fs(c, RED, ink);
      line(c, [0, -s * 0.22, s * 0.04, -s * 0.38]);
      c.beginPath();
      c.ellipse(s * 0.14, -s * 0.34, s * 0.1, s * 0.05, -0.5, 0, 7);
      fs(c, '#57B05A', ink);
      break;
    case 'bomb': {
      circ(c, -s * 0.05, s * 0.08, s * 0.34);
      fs(c, '#263238', ink);
      c.beginPath();
      c.moveTo(s * 0.15, -s * 0.18);
      c.quadraticCurveTo(s * 0.3, -s * 0.38, s * 0.38, -s * 0.3);
      c.stroke();
      c.save();
      c.translate(s * 0.4, -s * 0.33);
      c.rotate(t * 8);
      starPath(c, s * (0.1 + Math.sin(t * 20) * 0.03), 6, 0.4);
      fs(c, YEL);
      c.restore();
      break;
    }
    case 'skull':
      c.beginPath();
      c.arc(0, -s * 0.08, s * 0.34, Math.PI * 0.85, Math.PI * 2.15);
      c.lineTo(s * 0.18, s * 0.38);
      c.lineTo(-s * 0.18, s * 0.38);
      c.closePath();
      fs(c, '#F5F5F5', ink);
      circ(c, -s * 0.13, -s * 0.05, s * 0.09);
      fs(c, '#222');
      circ(c, s * 0.13, -s * 0.05, s * 0.09);
      fs(c, '#222');
      line(c, [-s * 0.06, s * 0.3, -s * 0.06, s * 0.38]);
      line(c, [s * 0.06, s * 0.3, s * 0.06, s * 0.38]);
      break;
    case 'zzz':
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.6 + i / 3) % 1;
        c.save();
        c.globalAlpha = 1 - k;
        c.translate(-s * 0.2 + k * s * 0.4, s * 0.3 - k * s * 0.7);
        text(c, 'Z', s * (0.25 + k * 0.25), th.accent2, null, th.fontFamily);
        c.restore();
      }
      break;
    case 'stairs':
      c.beginPath();
      c.moveTo(-s * 0.45, s * 0.42);
      for (let i = 0; i < 4; i++) {
        c.lineTo(-s * 0.45 + i * s * 0.22, s * 0.42 - (i + 1) * s * 0.2);
        c.lineTo(-s * 0.45 + (i + 1) * s * 0.22, s * 0.42 - (i + 1) * s * 0.2);
      }
      c.lineTo(s * 0.43, s * 0.42);
      c.closePath();
      fs(c, th.accent2, ink);
      break;
    case 'door':
      rr(c, -s * 0.26, -s * 0.45, s * 0.52, s * 0.9, s * 0.03);
      fs(c, BROWN, ink);
      circ(c, s * 0.14, 0, s * 0.04);
      fs(c, GOLD);
      break;
    case 'map':
      c.beginPath();
      c.moveTo(-s * 0.45, -s * 0.3);
      c.lineTo(-s * 0.15, -s * 0.38);
      c.lineTo(s * 0.15, -s * 0.3);
      c.lineTo(s * 0.45, -s * 0.38);
      c.lineTo(s * 0.45, s * 0.32);
      c.lineTo(s * 0.15, s * 0.4);
      c.lineTo(-s * 0.15, s * 0.32);
      c.lineTo(-s * 0.45, s * 0.4);
      c.closePath();
      fs(c, '#FFF3C4', ink);
      c.save();
      c.setLineDash([s * 0.05, s * 0.05]);
      c.strokeStyle = RED;
      c.beginPath();
      c.moveTo(-s * 0.35, s * 0.25);
      c.bezierCurveTo(-s * 0.1, s * 0.3, -s * 0.1, -s * 0.15, s * 0.25, -s * 0.12);
      c.stroke();
      c.restore();
      c.save();
      c.translate(s * 0.25, -s * 0.2 - Math.abs(Math.sin(t * 4)) * s * 0.05);
      c.beginPath();
      c.arc(0, -s * 0.06, s * 0.08, Math.PI * 0.8, Math.PI * 2.2);
      c.lineTo(0, s * 0.08);
      c.closePath();
      fs(c, RED, ink);
      c.restore();
      break;
    case 'pen':
      c.rotate(0.7 + Math.sin(t * 6) * 0.05);
      rr(c, -s * 0.08, -s * 0.42, s * 0.16, s * 0.66, s * 0.02);
      fs(c, YEL, ink);
      c.beginPath();
      c.moveTo(-s * 0.08, s * 0.24);
      c.lineTo(0, s * 0.42);
      c.lineTo(s * 0.08, s * 0.24);
      c.closePath();
      fs(c, '#FFE0B2', ink);
      break;
    case 'wifi': {
      const n = Math.floor(t * 3) % 4;
      for (let i = 0; i < 3; i++) {
        c.globalAlpha = i < n ? 1 : 0.25;
        c.beginPath();
        c.arc(0, s * 0.3, s * (0.18 + i * 0.16), Math.PI * 1.25, Math.PI * 1.75);
        c.lineWidth = s * 0.07;
        c.strokeStyle = th.accent;
        c.stroke();
      }
      c.globalAlpha = 1;
      circ(c, 0, s * 0.3, s * 0.06);
      fs(c, th.accent);
      break;
    }
    case 'bell':
      c.rotate(Math.sin(t * 8) * 0.25);
      c.beginPath();
      c.moveTo(-s * 0.36, s * 0.22);
      c.quadraticCurveTo(-s * 0.26, s * 0.1, -s * 0.26, -s * 0.1);
      c.quadraticCurveTo(-s * 0.24, -s * 0.38, 0, -s * 0.38);
      c.quadraticCurveTo(s * 0.24, -s * 0.38, s * 0.26, -s * 0.1);
      c.quadraticCurveTo(s * 0.26, s * 0.1, s * 0.36, s * 0.22);
      c.closePath();
      fs(c, GOLD, ink);
      circ(c, 0, s * 0.3, s * 0.07);
      fs(c, GOLD, ink);
      break;
    case 'eye': {
      c.beginPath();
      c.moveTo(-s * 0.46, 0);
      c.quadraticCurveTo(0, -s * 0.42, s * 0.46, 0);
      c.quadraticCurveTo(0, s * 0.42, -s * 0.46, 0);
      fs(c, '#fff', ink);
      const lx = Math.sin(t * 1.5) * s * 0.08;
      circ(c, lx, 0, s * 0.16);
      fs(c, th.accent2, ink);
      circ(c, lx, 0, s * 0.07);
      fs(c, '#111');
      break;
    }
    case 'pig': case 'dog': case 'cat': case 'cow': case 'sheep': {
      const col = { pig: '#F7A8B8', dog: '#B9814F', cat: '#F2A65A', cow: '#F7F7F2', sheep: '#F4F1E8' }[name];
      const dark = { pig: '#E58CA0', dog: '#8A5C33', cat: '#D9843A', cow: '#3A3A3A', sheep: '#3A3A3A' }[name];
      const bob = Math.sin(t * 5) * s * 0.015;
      c.translate(0, bob);
      for (const x of [-0.22, 0.2]) { rr(c, x * s - s * 0.05, s * 0.2, s * 0.1, s * 0.25, s * 0.03); fs(c, name === 'sheep' || name === 'cow' ? dark : col, ink); }
      c.beginPath(); c.ellipse(0, s * 0.08, s * 0.4, s * 0.27, 0, 0, 7); fs(c, col, ink);
      if (name === 'sheep') for (let i = 0; i < 7; i++) { circ(c, Math.cos(i * 0.9) * s * 0.33, s * 0.08 + Math.sin(i * 0.9) * s * 0.2, s * 0.12); fs(c, col, ink); }
      if (name === 'sheep') { c.beginPath(); c.ellipse(0, s * 0.08, s * 0.3, s * 0.18, 0, 0, 7); fs(c, col); }
      if (name === 'cow') for (const [x, y, q] of [[-0.12, 0.02, 0.1], [0.14, 0.14, 0.08]]) { circ(c, x * s, y * s, q * s); fs(c, dark); }
      // baş
      const hx = -s * 0.3, hy = -s * 0.12;
      if (name === 'pig') { for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(hx + sd * s * 0.12, hy - s * 0.14); c.lineTo(hx + sd * s * 0.2, hy - s * 0.3); c.lineTo(hx + sd * s * 0.03, hy - s * 0.2); c.closePath(); fs(c, dark, ink); } }
      else if (name === 'cat') { for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(hx + sd * s * 0.14, hy - s * 0.1); c.lineTo(hx + sd * s * 0.17, hy - s * 0.32); c.lineTo(hx + sd * s * 0.02, hy - s * 0.18); c.closePath(); fs(c, col, ink); } }
      else { for (const sd of [-1, 1]) { c.beginPath(); c.ellipse(hx + sd * s * 0.17, hy - s * 0.02, s * 0.07, s * 0.13, sd * 0.5, 0, 7); fs(c, dark, ink); } }
      circ(c, hx, hy, s * 0.2); fs(c, name === 'sheep' ? '#3A3A3A' : col, ink);
      const eye = name === 'sheep' ? '#fff' : '#111';
      circ(c, hx - s * 0.07, hy - s * 0.04, s * 0.025); fs(c, eye); circ(c, hx + s * 0.07, hy - s * 0.04, s * 0.025); fs(c, eye);
      if (name === 'pig' || name === 'cow') { c.beginPath(); c.ellipse(hx, hy + s * 0.07, s * 0.09, s * 0.06, 0, 0, 7); fs(c, name === 'pig' ? dark : '#F7A8B8', ink); circ(c, hx - s * 0.03, hy + s * 0.07, s * 0.012); fs(c, '#111'); circ(c, hx + s * 0.03, hy + s * 0.07, s * 0.012); fs(c, '#111'); }
      else { circ(c, hx, hy + s * 0.05, s * 0.03); fs(c, '#111'); }
      // kuyruk
      c.beginPath(); c.moveTo(s * 0.38, s * 0.02);
      if (name === 'pig') c.bezierCurveTo(s * 0.5, -s * 0.05, s * 0.42, -s * 0.15, s * 0.5, -s * 0.12 + Math.sin(t * 8) * s * 0.02);
      else c.quadraticCurveTo(s * 0.52, -s * 0.1 + Math.sin(t * 7) * s * 0.06, s * 0.48, -s * 0.25);
      c.stroke();
      break;
    }
    case 'chicken':
      c.translate(0, Math.abs(Math.sin(t * 6)) * -s * 0.02);
      line(c, [-s * 0.05, s * 0.3, -s * 0.05, s * 0.45]); line(c, [s * 0.08, s * 0.3, s * 0.08, s * 0.45]);
      c.beginPath(); c.ellipse(s * 0.02, s * 0.1, s * 0.28, s * 0.24, 0, 0, 7); fs(c, '#FFFFFF', ink);
      circ(c, -s * 0.2, -s * 0.18, s * 0.14); fs(c, '#FFFFFF', ink);
      c.beginPath(); c.moveTo(-s * 0.33, -s * 0.18); c.lineTo(-s * 0.45, -s * 0.14); c.lineTo(-s * 0.33, -s * 0.1); c.closePath(); fs(c, ORANGE, ink);
      c.beginPath(); c.arc(-s * 0.2, -s * 0.33, s * 0.06, 0, 7); c.arc(-s * 0.12, -s * 0.31, s * 0.05, 0, 7); fs(c, RED);
      circ(c, -s * 0.24, -s * 0.2, s * 0.02); fs(c, '#111');
      break;
    case 'campfire': {
      c.lineWidth *= 1.6; c.strokeStyle = BROWN;
      line(c, [-s * 0.35, s * 0.4, s * 0.3, s * 0.25]); line(c, [s * 0.35, s * 0.4, -s * 0.3, s * 0.25]);
      c.restore(); c.save(); c.translate(0, -s * 0.08); drawIcon(c, 'fire', s * 0.75, th, t);
      break;
    }
    case 'chest':
      rr(c, -s * 0.4, -s * 0.05, s * 0.8, s * 0.45, s * 0.04); fs(c, BROWN, ink);
      c.beginPath(); c.moveTo(-s * 0.4, -s * 0.05); c.quadraticCurveTo(0, -s * 0.5, s * 0.4, -s * 0.05); c.closePath(); fs(c, '#A06A35', ink);
      c.fillStyle = GOLD; c.fillRect(-s * 0.06, -s * 0.12, s * 0.12, s * 0.2);
      for (const x of [-0.25, 0.25]) { c.fillStyle = GOLD; c.fillRect(x * s - s * 0.03, -s * 0.3, s * 0.06, s * 0.7); }
      break;
    case 'rock':
      c.beginPath(); c.moveTo(-s * 0.42, s * 0.35); c.lineTo(-s * 0.3, -s * 0.05); c.lineTo(-s * 0.05, -s * 0.28); c.lineTo(s * 0.28, -s * 0.12); c.lineTo(s * 0.42, s * 0.35); c.closePath(); fs(c, '#9AA3AD', ink);
      line(c, [-s * 0.05, -s * 0.28, s * 0.02, s * 0.05, s * 0.28, -s * 0.12]);
      break;
    case 'sword':
      c.rotate(-0.6);
      c.beginPath(); c.moveTo(0, -s * 0.48); c.lineTo(s * 0.06, -s * 0.38); c.lineTo(s * 0.06, s * 0.15); c.lineTo(-s * 0.06, s * 0.15); c.lineTo(-s * 0.06, -s * 0.38); c.closePath(); fs(c, '#DDE3EA', ink);
      rr(c, -s * 0.2, s * 0.15, s * 0.4, s * 0.07, s * 0.02); fs(c, GOLD, ink);
      rr(c, -s * 0.04, s * 0.22, s * 0.08, s * 0.2, s * 0.02); fs(c, BROWN, ink);
      break;
    default:
      circ(c, 0, 0, s * 0.3);
      fs(c, th.accent, ink);
  }
  c.restore();
}
