export const LIGHT_CHART_COLORS = {
  light_white: { label: "💡 Weiß", stroke: "#f7d24a", fill: "rgba(247,210,74,0.28)" },
  light_ir: { label: "🌇 IR", stroke: "#e11d48", fill: "rgba(225,29,72,0.24)" },
  light_uv: { label: "🌌 UV", stroke: "#7c3aed", fill: "rgba(124,58,237,0.24)" },
};

export function normalizeTimeDigits(str: string | null | undefined) {
  if (str === null || str === undefined) return null;
  const cleaned = String(str).replace(':', '').trim();
  if (!/^[0-9]{3,4}$/.test(cleaned)) return null;
  return cleaned.slice(-4);
}

export function minutesFromClock(str: string | null | undefined) {
  if (str === null || str === undefined) return null;
  const cleaned = String(str).trim();
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length < 2) return minutesFromClock(parts[0]);
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return ((hours * 60 + minutes) % 1440 + 1440) % 1440;
  }
  const digits = normalizeTimeDigits(cleaned);
  if (!digits) return null;
  const hours = parseInt(digits.slice(0, 2), 10);
  const minutes = parseInt(digits.slice(2), 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return ((hours * 60 + minutes) % 1440 + 1440) % 1440;
}

export function minutesToClockLabel(minute: number, allow24 = true) {
  if (!Number.isFinite(minute)) return '';
  const isEndOfDay = allow24 && minute === 1440;
  const normalized = isEndOfDay ? 1440 : ((minute % 1440) + 1440) % 1440;
  const totalMinutes = isEndOfDay ? 1440 : Math.floor(normalized);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function convertPwmToIntensity(actor: string, pwm: number) {
  let value = Number(pwm);
  if (!Number.isFinite(value)) value = 0;
  if (actor === 'light_ir' || actor === 'light_uv') {
    value = 255 - value;
  }
  if (value < 0) value = 0;
  if (value > 255) value = 255;
  return value;
}

export function buildLightSeries(entries: any[], softMs = 0, limits?: { min: number, max: number }) {
  const values = new Float32Array(1440);
  if (!Array.isArray(entries) || entries.length === 0) {
    return { values, hasPlan: false };
  }
  
  const minVal = limits?.min ?? 0;
  const maxVal = limits?.max ?? 255;
  
  const cleaned = [];
  for (const entry of entries) {
    if (!entry) continue;
    const minute = typeof entry.time === 'number' ? ((entry.time % 1440) + 1440) % 1440 : minutesFromClock(entry.time);
    if (!Number.isFinite(minute)) continue;
    const intensity = Number(entry.pwmValue ?? entry.pwm ?? entry.intensity);
    if (!Number.isFinite(intensity)) continue;
    const clamped = Math.max(0, Math.min(255, intensity));
    
    let finalIntensity = clamped;
    if (limits) {
      if (clamped > 0) {
        finalIntensity = Math.max(minVal, Math.min(maxVal, clamped));
      } else {
        finalIntensity = 0;
      }
    }
    
    cleaned.push({ time: minute, intensity: finalIntensity });
  }
  cleaned.sort((a, b) => a.time - b.time);
  if (!cleaned.length) return { values, hasPlan: false };
  const last = cleaned[cleaned.length - 1];
  let previous = last.intensity;
  for (let i = cleaned.length - 2; i >= 0; i--) {
    if (cleaned[i].intensity !== last.intensity) { previous = cleaned[i].intensity; break; }
  }
  const rampMinutes = Math.max(0, softMs / 60000);
  let initial = last.intensity;
  
  let initialFrom = previous;
  if (limits && previous === 0 && last.intensity > 0) {
     initialFrom = minVal;
  }
  
  if (rampMinutes > 0 && last.intensity !== previous) {
    const delta = (1440 - last.time) % 1440;
    if (delta > 0 && delta < rampMinutes) {
      initial = initialFrom + (last.intensity - initialFrom) * (delta / rampMinutes);
    }
  }
  const events = [];
  let current = initial;
  for (const entry of cleaned) {
    if (entry.intensity === current) continue;
    
    let fromVal = current;
    if (limits && current === 0 && entry.intensity > 0) {
      fromVal = minVal;
    }
    
    events.push({ time: entry.time, from: fromVal, to: entry.intensity });
    current = entry.intensity;
  }
  if (!events.length) {
    values.fill(initial / 255 * 100);
    return { values, hasPlan: true };
  }
  const totalEvents = events.length;
  let activeIdx = totalEvents - 1;
  let forwardIdx = 0;
  for (let minute = 0; minute < 1440; minute++) {
    while (forwardIdx < totalEvents && events[forwardIdx].time <= minute) {
      activeIdx = forwardIdx;
      forwardIdx++;
    }
    const evt = events[activeIdx] || events[totalEvents - 1];
    let intensity = evt ? evt.to : initial;
    if (evt && rampMinutes > 0 && evt.from !== evt.to) {
      let delta = minute - evt.time;
      if (delta < 0) delta += 1440;
      if (delta < rampMinutes) {
        intensity = evt.from + (evt.to - evt.from) * (delta / rampMinutes);
      }
    }
    values[minute] = Math.max(0, Math.min(100, (intensity / 255) * 100));
  }
  return { values, hasPlan: true };
}

export function renderLightPlanCanvas(canvas: HTMLCanvasElement, data: any, options: any = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const compact = !!options.compact;
  const dpr = window.devicePixelRatio || 1;
  
  // Use bound dimensions
  const width = canvas.clientWidth || canvas.width || 0;
  const height = canvas.clientHeight || canvas.height || 0;
  if (width <= 0 || height <= 0) return;

  const pixelW = Math.round(width * dpr);
  const pixelH = Math.round(height * dpr);

  if (canvas.width !== pixelW) canvas.width = pixelW;
  if (canvas.height !== pixelH) canvas.height = pixelH;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const margin = compact ? { left: 22, right: 10, top: 8, bottom: 16 } : { left: 38, right: 16, top: 18, bottom: 26 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  if (chartW <= 0 || chartH <= 0) { ctx.restore(); return; }

  const toX = (m: number) => margin.left + (m / 1440) * chartW;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(margin.left, margin.top, chartW, chartH);
  
  const shading = data?.shading || {};
  if (Number.isFinite(shading.dayStart) && Number.isFinite(shading.nightStart)) {
    const dayStart = shading.dayStart;
    const nightStart = shading.nightStart;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    if (dayStart === nightStart) {
      ctx.fillRect(margin.left, margin.top, chartW, chartH);
    } else if (dayStart < nightStart) {
      ctx.fillRect(margin.left, margin.top, Math.max(0, toX(dayStart) - margin.left), chartH);
      ctx.fillRect(toX(nightStart), margin.top, Math.max(0, margin.left + chartW - toX(nightStart)), chartH);
    } else {
      ctx.fillRect(toX(nightStart), margin.top, Math.max(0, toX(dayStart) - toX(nightStart)), chartH);
    }
  }

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + chartH);
  ctx.lineTo(margin.left + chartW, margin.top + chartH);
  ctx.stroke();

  const yTicks = compact ? [0, 50, 100] : [0, 25, 50, 75, 100];
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.fillStyle = '#9ca3af';
  ctx.font = compact ? '10px Inter, system-ui, sans-serif' : '11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (const tick of yTicks) {
    const y = margin.top + chartH - (tick / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartW, y);
    ctx.stroke();
    if (!compact) ctx.fillText(`${tick}%`, margin.left - 6, y);
  }

  const xTicks = compact ? [0, 240, 480, 720, 960, 1200, 1440] : [0, 240, 480, 720, 960, 1200, 1440];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (const minute of xTicks) {
    const x = toX(minute);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + chartH);
    ctx.stroke();
    ctx.fillStyle = '#9ca3af';
    const label = minutesToClockLabel(minute, true);
    ctx.fillText(label, x, margin.top + chartH + 2);
  }

  const plotConfig: any = {
    light_white: { offsetPx: 0, fill: true, fillOpacity: compact ? 0.35 : 0.42, lineWidth: compact ? 2.6 : 3.4 },
    light_ir: { offsetPx: compact ? -1.4 : -1.8, fill: false, lineWidth: compact ? 2.0 : 2.6, dash: [5, 3] },
    light_uv: { offsetPx: compact ? 1.4 : 1.8, fill: false, lineWidth: compact ? 2.0 : 2.6, dash: [3, 2] },
    default: { offsetPx: 0, fill: true, fillOpacity: 0.3, lineWidth: 2 }
  };

  const clampY = (y: number) => Math.max(margin.top, Math.min(margin.top + chartH, y));
  const actorOrder = Object.keys(LIGHT_CHART_COLORS);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const actor of actorOrder) {
    const palette = (LIGHT_CHART_COLORS as any)[actor];
    const valuesArr = data?.series?.[actor];
    if (!valuesArr) continue;

    let nonZero = false;
    for (let i = 0; i < valuesArr.length; i++) {
      if (valuesArr[i] > 0.05) { nonZero = true; break; }
    }
    if (!nonZero) continue;

    const cfg = plotConfig[actor] || plotConfig.default;
    const offsetPx = cfg.offsetPx || 0;
    const points = [];

    for (let minute = 0; minute < 1440; minute++) {
      const idx = minute;
      const v = Math.max(0, Math.min(100, valuesArr[idx] || 0));
      const x = toX(minute);
      const baseY = margin.top + chartH - (v / 100) * chartH;
      const y = clampY(baseY + offsetPx);
      points.push({ x, y });
    }

    if (points.length > 0) {
      points.push({ x: toX(1440), y: points[points.length - 1].y });
    }

    if (cfg.fill) {
      ctx.beginPath();
      ctx.moveTo(margin.left, margin.top + chartH);
      for (const pt of points) ctx.lineTo(pt.x, pt.y);
      ctx.lineTo(margin.left + chartW, margin.top + chartH);
      ctx.closePath();
      ctx.globalAlpha = cfg.fillOpacity ?? (compact ? 0.28 : 0.34);
      ctx.fillStyle = palette.fill;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
    });

    if (cfg.dash) ctx.setLineDash(cfg.dash); else ctx.setLineDash([]);
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = cfg.lineWidth || (compact ? 2.2 : 2.8);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Current time line
  const now = new Date();
  const currentMinutes = (now.getHours() * 60 + now.getMinutes()) % 1440;
  const curX = toX(currentMinutes);

  if (curX >= margin.left && curX <= margin.left + chartW) {
    const nowLabel = minutesToClockLabel(currentMinutes, false);
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = compact ? 1.2 : 1.6;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, margin.top);
    ctx.lineTo(curX, margin.top + chartH);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const font = compact ? 'bold 10px Inter, system-ui, sans-serif' : 'bold 11px Inter, system-ui, sans-serif';
    ctx.font = font;
    const metrics = ctx.measureText(nowLabel);
    const labelWidth = metrics.width;
    const labelY = margin.top + chartH + 2;
    const labelX = curX;

    ctx.clearRect(labelX - labelWidth / 2 - 2, labelY - 1, labelWidth + 4, 12);
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(nowLabel, labelX, labelY);
    ctx.restore();
  }

  const live = data?.live || {};
  for (const actor of actorOrder) {
    const val = live[actor];
    if (!Number.isFinite(val)) continue;

    const cfg = plotConfig[actor] || plotConfig.default;
    const offsetPx = cfg.offsetPx || 0;
    const pct = Math.max(0, Math.min(100, val)) / 100;
    const y = clampY(margin.top + chartH - pct * chartH + offsetPx);
    const radius = Math.max(2.2, (cfg.lineWidth || (compact ? 2.2 : 2.8)) * 0.55);

    ctx.fillStyle = (LIGHT_CHART_COLORS as any)[actor].stroke;
    ctx.beginPath();
    ctx.arc(curX, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(curX, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
