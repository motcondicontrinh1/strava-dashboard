// ── Polyline decoder ──────────────────────────────────────────────────────────

function decodePolyline(encoded) {
  if (!encoded) return [];
  const pts = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function secToMmss(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60), ss = Math.round(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

function formatPaceSec(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm > 1800) return '—';
  return secToMmss(secPerKm);
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).toUpperCase();
}

// ── Route coordinate helpers ─────────────────────────────────────────────────

function getRouteTransform(points, area) {
  const lats = points.map(p => p[0]);
  const lngs = points.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  const routeAspect = lngRange / latRange;
  const boxAspect = area.w / area.h;
  let drawW, drawH;
  if (routeAspect > boxAspect) {
    drawW = area.w; drawH = area.w / routeAspect;
  } else {
    drawH = area.h; drawW = area.h * routeAspect;
  }

  const ox = area.x + (area.w - drawW) / 2;
  const oy = area.y + (area.h - drawH) / 2;

  return {
    toX: lng => ox + ((lng - minLng) / lngRange) * drawW,
    toY: lat => oy + ((maxLat - lat) / latRange) * drawH,
  };
}

function tracePath(ctx, points, transform) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = transform.toX(p[1]), y = transform.toY(p[0]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
}

// ── Route drawing — clean, no glow, works on any background ──────────────────

function drawRoute(ctx, points, transform) {
  // Outer stroke — thick, creates visible weight on any background
  ctx.save();
  ctx.strokeStyle = '#FC4C02';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.25;
  tracePath(ctx, points, transform);
  ctx.stroke();
  ctx.restore();

  // Main route line — solid, bold
  ctx.save();
  ctx.strokeStyle = '#FC4C02';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  tracePath(ctx, points, transform);
  ctx.stroke();
  ctx.restore();

  // Start marker — orange filled dot with ring
  const sx = transform.toX(points[0][1]), sy = transform.toY(points[0][0]);
  ctx.save();
  ctx.fillStyle = '#FC4C02';
  ctx.beginPath();
  ctx.arc(sx, sy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FC4C02';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(sx, sy, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // End marker — white dot
  const ex = transform.toX(points[points.length - 1][1]);
  const ey = transform.toY(points[points.length - 1][0]);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex, ey, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Typography helpers ───────────────────────────────────────────────────────

function drawText(ctx, text, x, y, { font, color, align = 'left', maxWidth } = {}) {
  ctx.save();
  if (font) ctx.font = font;
  if (color) ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (maxWidth) {
    let t = text;
    while (ctx.measureText(t).width > maxWidth && t.length > 2) t = t.slice(0, -1);
    if (t !== text) t = t.trim() + '…';
    ctx.fillText(t, x, y);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function drawOrangeRule(ctx, x, y, w) {
  ctx.save();
  ctx.fillStyle = '#FC4C02';
  ctx.fillRect(x, y, w * 0.08, 2.5);
  ctx.restore();
}

// ── Corner marks ─────────────────────────────────────────────────────────────

function drawCornerMarks(ctx, W, H, inset) {
  const len = 18;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  // TL
  ctx.beginPath();
  ctx.moveTo(inset, inset + len); ctx.lineTo(inset, inset); ctx.lineTo(inset + len, inset);
  ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(W - inset - len, inset); ctx.lineTo(W - inset, inset); ctx.lineTo(W - inset, inset + len);
  ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(inset, H - inset - len); ctx.lineTo(inset, H - inset); ctx.lineTo(inset + len, H - inset);
  ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(W - inset - len, H - inset); ctx.lineTo(W - inset, H - inset); ctx.lineTo(W - inset, H - inset - len);
  ctx.stroke();
  ctx.restore();
}

// ── Square layout ────────────────────────────────────────────────────────────

function drawSquareCard(ctx, activity, routePoints, W, H) {
  ctx.clearRect(0, 0, W, H);

  const PAD = 64;
  const INSET = PAD - 16;

  // ─── Type + date tag ──────────────────────────────────────────────
  drawText(ctx,
    `${(activity.sport_type || activity.type || 'RUN').toUpperCase()} // ${formatDate(activity.start_date_local)}`,
    PAD, 56,
    { font: `400 22px "JetBrains Mono", monospace`, color: 'rgba(255,255,255,0.6)' },
  );

  // ─── Activity name ────────────────────────────────────────────────
  const nameY = 126;
  drawText(ctx, activity.name || 'Activity', PAD, nameY, {
    font: `bold 82px "Space Grotesk", sans-serif`,
    color: '#ffffff',
    maxWidth: W - PAD * 2,
  });

  // ─── Orange rule ──────────────────────────────────────────────────
  drawOrangeRule(ctx, PAD, nameY + 28, W);

  // ─── Route ────────────────────────────────────────────────────────
  const ROUTE_TOP = nameY + 80;
  const ROUTE_BOTTOM = H - 260;
  const routeArea = { x: PAD, y: ROUTE_TOP, w: W - PAD * 2, h: ROUTE_BOTTOM - ROUTE_TOP };

  if (routePoints.length) {
    const t = getRouteTransform(routePoints, routeArea);
    drawRoute(ctx, routePoints, t);
  }

  // ─── Stats block — bottom area ─────────────────────────────────────
  const pace = activity.average_speed > 0 ? formatPaceSec(1000 / activity.average_speed) : '—';
  const dist = ((activity.distance || 0) / 1000).toFixed(2);
  const hr = activity.average_heartrate ? `${Math.round(activity.average_heartrate)}` : null;

  // Distance — massive hero (explicit draw to guarantee orange)
  const distY = H - 140;
  ctx.save();
  ctx.font = `bold 130px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#FC4C02';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(dist, PAD, distY);
  const distTextW = ctx.measureText(dist).width;
  ctx.restore();

  ctx.save();
  ctx.font = `500 44px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(252,76,2,0.6)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('KM', PAD + distTextW + 12, distY);
  ctx.restore();

  // Secondary stats — right-aligned, stacked
  const rightCol = W - PAD;
  drawText(ctx, pace + '/km', rightCol, distY - 60, {
    font: `500 52px "JetBrains Mono", monospace`,
    color: 'rgba(255,255,255,0.85)',
    align: 'right',
  });
  drawText(ctx, secToMmss(activity.moving_time), rightCol, distY - 4, {
    font: `400 44px "JetBrains Mono", monospace`,
    color: 'rgba(255,255,255,0.6)',
    align: 'right',
  });
  if (hr) {
    drawText(ctx, hr + ' bpm', rightCol, distY + 48, {
      font: `400 36px "JetBrains Mono", monospace`,
      color: 'rgba(255,255,255,0.45)',
      align: 'right',
    });
  }

  // Location + Branding
  const loc = [activity.location_city, activity.location_country].filter(Boolean).join(', ');
  if (loc) {
    drawText(ctx, loc.toUpperCase(), PAD, distY + 56, {
      font: `400 22px "JetBrains Mono", monospace`,
      color: 'rgba(255,255,255,0.35)',
    });
  }
  drawText(ctx, 'PRISM ATHLETIC', W - PAD, H - 40, {
    font: `600 20px "Space Grotesk", sans-serif`,
    color: 'rgba(252,76,2,0.4)',
    align: 'right',
  });

  drawCornerMarks(ctx, W, H, INSET);
}

// ── Story layout ─────────────────────────────────────────────────────────────

function drawStoryCard(ctx, activity, routePoints, W, H) {
  ctx.clearRect(0, 0, W, H);

  const PAD = 64;
  const INSET = PAD - 16;

  // ─── Type + date tag ──────────────────────────────────────────────
  drawText(ctx,
    `${(activity.sport_type || activity.type || 'RUN').toUpperCase()} // ${formatDate(activity.start_date_local)}`,
    PAD, 80,
    { font: `400 26px "JetBrains Mono", monospace`, color: 'rgba(255,255,255,0.6)' },
  );

  // ─── Activity name — large, word-wrapped ──────────────────────────
  ctx.save();
  ctx.font = `bold 108px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  const words = (activity.name || 'Activity').split(' ');
  let line = '', lineY = 192;
  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > W - PAD * 2 && line) {
      ctx.fillText(line, PAD, lineY);
      line = word;
      lineY += 106;
    } else {
      line = test;
    }
  });
  ctx.fillText(line, PAD, lineY);
  ctx.restore();

  // ─── Orange rule ──────────────────────────────────────────────────
  drawOrangeRule(ctx, PAD, lineY + 32, W);

  // ─── Route — big, generous center area ────────────────────────────
  const ROUTE_TOP = lineY + 88;
  const ROUTE_BOTTOM = H - 480;
  const routeArea = { x: PAD, y: ROUTE_TOP, w: W - PAD * 2, h: Math.max(ROUTE_BOTTOM - ROUTE_TOP, 400) };

  if (routePoints.length) {
    const t = getRouteTransform(routePoints, routeArea);
    drawRoute(ctx, routePoints, t);
  }

  // ─── Distance hero number — massive ───────────────────────────────
  const distY = H - 380;
  const dist = ((activity.distance || 0) / 1000).toFixed(2);

  ctx.save();
  ctx.font = `bold 200px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(dist, PAD, distY);
  ctx.restore();

  ctx.save();
  ctx.font = `500 34px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('KILOMETERS', PAD + 6, distY + 56);
  ctx.restore();

  // ─── Stats row — large, readable ──────────────────────────────────
  const pace = activity.average_speed > 0 ? formatPaceSec(1000 / activity.average_speed) : '—';
  const hr = activity.average_heartrate ? Math.round(activity.average_heartrate) : null;

  const statsY = H - 180;
  const statItems = [
    { val: secToMmss(activity.moving_time), label: 'TIME' },
    { val: `${pace}/km`, label: 'PACE' },
    ...(hr ? [{ val: `${hr} bpm`, label: 'HR' }] : []),
  ];
  const colW = (W - PAD * 2) / statItems.length;
  statItems.forEach(({ val, label }, i) => {
    const x = PAD + i * colW;
    drawText(ctx, val, x, statsY, {
      font: `500 56px "JetBrains Mono", monospace`,
      color: 'rgba(255,255,255,0.85)',
    });
    drawText(ctx, label, x, statsY + 48, {
      font: `400 24px "JetBrains Mono", monospace`,
      color: 'rgba(255,255,255,0.35)',
    });
  });

  // Location
  const loc = [activity.location_city, activity.location_country].filter(Boolean).join(', ');
  if (loc) {
    drawText(ctx, loc.toUpperCase(), PAD, H - 64, {
      font: `400 24px "JetBrains Mono", monospace`,
      color: 'rgba(255,255,255,0.3)',
    });
  }

  // Branding
  drawText(ctx, 'PRISM ATHLETIC', W - PAD, H - 64, {
    font: `600 22px "Space Grotesk", sans-serif`,
    color: 'rgba(252,76,2,0.4)',
    align: 'right',
  });

  drawCornerMarks(ctx, W, H, INSET);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateActivityCard(activity, format = 'square') {
  const CONFIGS = {
    square: { W: 1080, H: 1080 },
    story: { W: 1080, H: 1920 },
  };
  const { W, H } = CONFIGS[format] || CONFIGS.square;
  const SCALE = 2;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  await document.fonts.ready;

  const polyline = activity.map?.summary_polyline || '';
  const routePoints = decodePolyline(polyline);

  if (format === 'story') {
    drawStoryCard(ctx, activity, routePoints, W, H);
  } else {
    drawSquareCard(ctx, activity, routePoints, W, H);
  }

  return canvas;
}

export function downloadCanvas(canvas, filename) {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}
