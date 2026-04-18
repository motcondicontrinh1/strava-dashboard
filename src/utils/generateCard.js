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
  // Outer stroke — thick glow effect, creates visible weight on any background
  ctx.save();
  ctx.strokeStyle = '#FC4C02';
  ctx.lineWidth = 50;  // Extra thick for sticker effect (was 14)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.25;
  tracePath(ctx, points, transform);
  ctx.stroke();
  ctx.restore();

  // Main route line — solid, bold
  ctx.save();
  ctx.strokeStyle = '#FC4C02';
  ctx.lineWidth = 35;  // Extra thick for sticker effect (was 9)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  tracePath(ctx, points, transform);
  ctx.stroke();
  ctx.restore();

  // Start marker — orange filled dot with ring (extra large for sticker effect)
  const sx = transform.toX(points[0][1]), sy = transform.toY(points[0][0]);
  ctx.save();
  ctx.fillStyle = '#FC4C02';
  ctx.beginPath();
  ctx.arc(sx, sy, 40, 0, Math.PI * 2);  // Extra large (was 14)
  ctx.fill();
  ctx.strokeStyle = '#FC4C02';
  ctx.lineWidth = 10;  // Extra thick (was 3)
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(sx, sy, 70, 0, Math.PI * 2);  // Extra large (was 24)
  ctx.stroke();
  ctx.restore();

  // End marker — white dot (extra large for sticker effect)
  const ex = transform.toX(points[points.length - 1][1]);
  const ey = transform.toY(points[points.length - 1][0]);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex, ey, 30, 0, Math.PI * 2);  // Extra large (was 10)
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

// ═══════════════════════════════════════════════════════════════════════════
// AMBITIOUS AWARD-WINNING LAYOUTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Layout 1: BRUTALIST GRID ────────────────────────────────────────────────
// Heavy typography, aggressive grid, architectural precision

function drawBrutalistCard(ctx, activity, routePoints, W, H) {
  ctx.clearRect(0, 0, W, H);
  
  const PAD = 80;
  const GRID_GAP = 4;
  const DARK = '#0a0a0a';
  const ORANGE = '#FC4C02';
  
  // Background with subtle grain texture simulation
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, W, H);
  
  // Brutalist grid lines
  ctx.strokeStyle = 'rgba(252,76,2,0.15)';
  ctx.lineWidth = 2;
  const gridSize = 120;
  for (let x = 0; x <= W; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  
  // Massive distance number - overlapping the grid
  const dist = ((activity.distance || 0) / 1000).toFixed(2);
  ctx.save();
  ctx.font = `900 320px "Space Grotesk", sans-serif`;
  ctx.fillStyle = 'rgba(252,76,2,0.08)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dist, W * 0.5, H * 0.4);
  ctx.restore();
  
  // Route map - positioned in grid cell
  const routeArea = { 
    x: PAD, 
    y: PAD + 200, 
    w: W - PAD * 2, 
    h: H * 0.35 
  };
  if (routePoints.length) {
    const t = getRouteTransform(routePoints, routeArea);
    drawRoute(ctx, routePoints, t);
  }
  
  // Heavy black bar at bottom for stats
  const BAR_HEIGHT = 280;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, H - BAR_HEIGHT, W, BAR_HEIGHT);
  
  // Orange accent line on bar
  ctx.fillStyle = ORANGE;
  ctx.fillRect(PAD, H - BAR_HEIGHT, 8, BAR_HEIGHT);
  
  // Activity name - massive, clipped
  ctx.save();
  ctx.font = `700 72px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  const name = activity.name || 'ACTIVITY';
  // Clip to available space
  let displayName = name;
  while (ctx.measureText(displayName + '…').width > W - PAD * 2 - 20 && displayName.length > 3) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== name) displayName += '…';
  ctx.fillText(displayName.toUpperCase(), PAD + 20, H - BAR_HEIGHT + 80);
  ctx.restore();
  
  // Stats in brutalist blocks
  const pace = activity.average_speed > 0 ? formatPaceSec(1000 / activity.average_speed) : '—';
  const stats = [
    { val: dist, unit: 'KM', sub: 'DISTANCE' },
    { val: secToMmss(activity.moving_time), unit: '', sub: 'TIME' },
    { val: pace, unit: '/KM', sub: 'PACE' },
  ];
  
  if (activity.average_heartrate) {
    stats.push({ val: Math.round(activity.average_heartrate).toString(), unit: 'BPM', sub: 'HEART RATE' });
  }
  
  const blockWidth = (W - PAD * 2) / stats.length;
  stats.forEach((stat, i) => {
    const x = PAD + i * blockWidth;
    const y = H - 140;
    
    // Value
    ctx.save();
    ctx.font = `700 84px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(stat.val, x + 20, y);
    ctx.restore();
    
    // Unit
    if (stat.unit) {
      ctx.save();
      ctx.font = `500 32px "JetBrains Mono", monospace`;
      ctx.fillStyle = ORANGE;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(stat.unit, x + 20 + ctx.measureText(stat.val).width + 8, y);
      ctx.restore();
    }
    
    // Label
    ctx.save();
    ctx.font = `500 18px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(stat.sub, x + 20, y + 40);
    ctx.restore();
    
    // Separator
    if (i < stats.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + blockWidth - GRID_GAP, H - BAR_HEIGHT + 40);
      ctx.lineTo(x + blockWidth - GRID_GAP, H - 40);
      ctx.stroke();
    }
  });
  
  // Date stamp
  ctx.save();
  ctx.font = `600 20px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(252,76,2,0.6)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(formatDate(activity.start_date_local), W - PAD, PAD + 40);
  ctx.restore();
}

// ── Layout 2: KINETIC OVERLAP ───────────────────────────────────────────────
// Dynamic overlapping elements, motion blur aesthetic, depth through layers

function drawKineticCard(ctx, activity, routePoints, W, H) {
  ctx.clearRect(0, 0, W, H);
  
  const ORANGE = '#FC4C02';
  const dist = ((activity.distance || 0) / 1000).toFixed(2);
  const pace = activity.average_speed > 0 ? formatPaceSec(1000 / activity.average_speed) : '—';
  
  // Dynamic diagonal background
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, W, H);
  
  // Diagonal orange accent bar
  ctx.save();
  ctx.translate(W * 0.6, 0);
  ctx.rotate(Math.PI / 6);
  ctx.fillStyle = ORANGE;
  ctx.fillRect(-100, 0, 200, H * 1.5);
  ctx.restore();
  
  // Route map - tilted and offset
  ctx.save();
  ctx.translate(W * 0.15, H * 0.25);
  ctx.rotate(-Math.PI / 12);
  const routeArea = { x: 0, y: 0, w: W * 0.7, h: H * 0.4 };
  if (routePoints.length) {
    const t = getRouteTransform(routePoints, routeArea);
    drawRoute(ctx, routePoints, t);
  }
  ctx.restore();
  
  // Distance - massive overlapping title
  ctx.save();
  ctx.font = `900 180px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(dist, 60, H * 0.72);
  
  // KM suffix with motion offset
  ctx.font = `900 72px "Space Grotesk", sans-serif`;
  ctx.fillStyle = ORANGE;
  const distWidth = ctx.measureText(dist).width;
  ctx.fillText('KM', 60 + distWidth + 20, H * 0.72);
  ctx.restore();
  
  // Shadow/echo of distance (motion blur effect)
  ctx.save();
  ctx.font = `900 180px "Space Grotesk", sans-serif`;
  ctx.fillStyle = 'rgba(252,76,2,0.15)';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(dist, 65, H * 0.72 + 8);
  ctx.restore();
  
  // Activity name - rotated vertical
  ctx.save();
  ctx.translate(W - 100, H * 0.3);
  ctx.rotate(Math.PI / 2);
  ctx.font = `700 48px "Space Grotesk", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textBaseline = 'alphabetic';
  let displayName = (activity.name || 'ACTIVITY').toUpperCase();
  while (ctx.measureText(displayName).width > H * 0.5 && displayName.length > 3) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== (activity.name || '').toUpperCase()) displayName += '…';
  ctx.fillText(displayName, 0, 0);
  ctx.restore();
  
  // Stats floating in bottom left
  const stats = [
    { icon: '⏱', val: secToMmss(activity.moving_time), label: 'TIME' },
    { icon: '⚡', val: pace, label: 'PACE' },
  ];
  
  if (activity.average_heartrate) {
    stats.push({ icon: '♥', val: `${Math.round(activity.average_heartrate)}`, label: 'BPM' });
  }
  
  stats.forEach((stat, i) => {
    const y = H - 200 + i * 80;
    
    // Stat card background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(60, y - 50, 320, 70);
    
    // Orange left border
    ctx.fillStyle = ORANGE;
    ctx.fillRect(60, y - 50, 6, 70);
    
    // Icon
    ctx.save();
    ctx.font = `32px "JetBrains Mono", monospace`;
    ctx.fillStyle = ORANGE;
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.icon, 85, y - 15);
    ctx.restore();
    
    // Value
    ctx.save();
    ctx.font = `700 44px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.val, 130, y - 15);
    ctx.restore();
    
    // Label
    ctx.save();
    ctx.font = `500 16px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textBaseline = 'middle';
    ctx.fillText(stat.label, 85, y + 15);
    ctx.restore();
  });
  
  // Date - floating badge
  ctx.save();
  ctx.fillStyle = ORANGE;
  ctx.fillRect(60, 60, 4, 60);
  ctx.font = `600 18px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(formatDate(activity.start_date_local), 80, 85);
  ctx.font = `700 14px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText((activity.sport_type || activity.type || 'RUN').toUpperCase(), 80, 108);
  ctx.restore();
}

// ── Layout 3: TYPOGRAPHY POSTER ─────────────────────────────────────────────
// Massive type-driven design, Swiss style precision, hierarchy through scale

function drawTypographyCard(ctx, activity, routePoints, W, H) {
  ctx.clearRect(0, 0, W, H);
  
  const ORANGE = '#FC4C02';
  const dist = ((activity.distance || 0) / 1000).toFixed(2);
  const pace = activity.average_speed > 0 ? formatPaceSec(1000 / activity.average_speed) : '—';
  
  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  
  // Typography hierarchy:
  // 1. Massive activity type
  // 2. Distance
  // 3. Route
  // 4. Secondary stats
  
  // Primary: Activity type - EXTREME size
  const type = (activity.sport_type || activity.type || 'RUN').toUpperCase();
  ctx.save();
  ctx.font = `900 220px "Space Grotesk", sans-serif`;
  ctx.fillStyle = 'rgba(252,76,2,0.12)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(type, -20, 240);
  ctx.restore();
  
  // Secondary: Distance - HUGE
  ctx.save();
  ctx.font = `900 280px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(dist, 60, 540);
  
  // KM - aligned with distance baseline
  ctx.font = `700 64px "JetBrains Mono", monospace`;
  ctx.fillStyle = ORANGE;
  const distWidth = ctx.measureText(dist).width;
  ctx.fillText('kilometers', 60 + distWidth + 30, 540);
  ctx.restore();
  
  // Tertiary: Activity name
  ctx.save();
  ctx.font = `500 42px "Space Grotesk", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let name = activity.name || 'Morning Activity';
  // Wrap if too long
  const maxNameWidth = W - 120;
  if (ctx.measureText(name).width > maxNameWidth) {
    const words = name.split(' ');
    let line = '';
    let y = 600;
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxNameWidth && line) {
        ctx.fillText(line, 60, y);
        line = word;
        y += 52;
      } else {
        line = test;
      }
    });
    ctx.fillText(line, 60, y);
  } else {
    ctx.fillText(name, 60, 600);
  }
  ctx.restore();
  
  // Orange rule
  ctx.fillStyle = ORANGE;
  ctx.fillRect(60, 640, 160, 4);
  
  // Route - subtle background element
  const routeArea = { x: W * 0.4, y: 400, w: W * 0.55, h: 400 };
  ctx.save();
  ctx.globalAlpha = 0.4;
  if (routePoints.length) {
    const t = getRouteTransform(routePoints, routeArea);
    drawRoute(ctx, routePoints, t);
  }
  ctx.restore();
  
  // Stats - grid layout at bottom
  const statsStartY = H - 280;
  const colWidth = (W - 120) / 4;
  
  const stats = [
    { label: 'TIME', val: secToMmss(activity.moving_time) },
    { label: 'PACE', val: `${pace}/km` },
    { label: 'DATE', val: formatDate(activity.start_date_local) },
  ];
  
  if (activity.average_heartrate) {
    stats.push({ label: 'HEART RATE', val: `${Math.round(activity.average_heartrate)} BPM` });
  } else {
    stats.push({ label: 'TYPE', val: type });
  }
  
  stats.forEach((stat, i) => {
    const x = 60 + i * colWidth;
    
    // Label - tiny, uppercase
    ctx.save();
    ctx.font = `600 14px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(stat.label, x, statsStartY);
    ctx.restore();
    
    // Value - large
    ctx.save();
    ctx.font = `700 52px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(stat.val, x, statsStartY + 70);
    ctx.restore();
    
    // Orange dot accent
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(x, statsStartY - 8, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Corner accents
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 3;
  // Top left
  ctx.beginPath();
  ctx.moveTo(40, 80);
  ctx.lineTo(40, 40);
  ctx.lineTo(80, 40);
  ctx.stroke();
  // Bottom right
  ctx.beginPath();
  ctx.moveTo(W - 40, H - 80);
  ctx.lineTo(W - 40, H - 40);
  ctx.lineTo(W - 80, H - 40);
  ctx.stroke();
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateActivityCard(activity, format = 'square', layout = 'classic') {
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

  // Route layout selection
  if (layout === 'brutalist') {
    drawBrutalistCard(ctx, activity, routePoints, W, H);
  } else if (layout === 'kinetic') {
    drawKineticCard(ctx, activity, routePoints, W, H);
  } else if (layout === 'typography') {
    drawTypographyCard(ctx, activity, routePoints, W, H);
  } else if (format === 'story') {
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
