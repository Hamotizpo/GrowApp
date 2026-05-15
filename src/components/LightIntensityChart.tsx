import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  ReferenceArea,
  ReferenceDot
} from 'recharts';
import { buildLightSeries, minutesFromClock, minutesToClockLabel, convertPwmToIntensity } from '../lib/lightChartUtils';

interface LightIntensityChartProps {
  env?: any;
  actors?: any;
  data?: any; // Directly provided chart data (shading & series)
  compact?: boolean;
}

const COLORS = {
  white: { stroke: "#f7d24a", fill: "rgba(247,210,74,0.2)" },
  ir: { stroke: "#e11d48", fill: "rgba(225,29,72,0.15)" },
  uv: { stroke: "#7c3aed", fill: "rgba(124,58,237,0.15)" },
};

export default function LightIntensityChart({ env, actors, data: externalData, compact = false }: LightIntensityChartProps) {
  const chartData = useMemo(() => {
    if (externalData?.series) {
      const data = [];
      const white = externalData.series.light_white || new Float32Array(1440);
      const ir = externalData.series.light_ir || new Float32Array(1440);
      const uv = externalData.series.light_uv || new Float32Array(1440);

      for (let i = 0; i < 1440; i += 5) {
        data.push({
          time: i,
          label: minutesToClockLabel(i),
          white: Number(white[i]?.toFixed(1) || 0),
          ir: Number(ir[i]?.toFixed(1) || 0),
          uv: Number(uv[i]?.toFixed(1) || 0),
        });
      }
      return data;
    }

    if (!env || !actors) return [];

    const lightWhiteConf = actors?.light_white?.settings || (actors?.light_white?.maxCap !== undefined ? actors.light_white : {});
    const lightUVConf = actors?.light_uv?.settings || (actors?.light_uv?.maxCap !== undefined ? actors.light_uv : {});
    const lightIRConf = actors?.light_ir?.settings || (actors?.light_ir?.maxCap !== undefined ? actors.light_ir : {});

    const getLimits = (conf: any) => {
      const min = Number(conf.minThreshold ?? conf.min_threshold);
      const max = Number(conf.maxCap ?? conf.max_cap);
      return {
        min: !isNaN(min) ? min : 0,
        max: !isNaN(max) ? max : 255
      };
    };

    const buildValues = (actor: string, conf: any) => {
      const timeEntries = Array.isArray(conf.timeEntries) ? conf.timeEntries : [];
      let entries = [];
      for (const entry of timeEntries) {
        if (!entry) continue;
        const minute = minutesFromClock(entry.time);
        if (Number.isFinite(minute)) {
          const raw = entry.pwmValue ?? entry.pwm ?? (entry.intensity !== undefined ? entry.intensity : 0);
          // IMPORTANT: Convert PWM to intensity to handle active-low actors (IR/UV)
          entries.push({ time: minute, intensity: convertPwmToIntensity(actor, raw) });
        }
      }

      // Fallback for light_white if no specific time entries exist: use global day/night cycle
      if (actor === 'light_white' && entries.length === 0) {
        const dStr = env.dayStartTime ?? env.dStart ?? '0600';
        const nStr = env.nightStartTime ?? env.nStart ?? '1800';
        const dayM = minutesFromClock(dStr);
        const nightM = minutesFromClock(nStr);
        if (dayM !== null && nightM !== null) {
          entries.push({ time: dayM, intensity: 255 });
          entries.push({ time: nightM, intensity: 0 });
        }
      }

      const limits = getLimits(conf);
      const minVal = limits.min;
      const maxVal = limits.max;

      let softMs = 0;
      if (actor === 'light_white' && conf.softStartEnabled) {
        softMs = Number(conf.softStartDuration) || 0;
      }
      const seriesRes = buildLightSeries(entries, softMs, limits);
      const series = seriesRes.values;
      
      return series;
    };

    const whiteValues = buildValues('light_white', lightWhiteConf);
    const irValues = buildValues('light_ir', lightIRConf);
    const uvValues = buildValues('light_uv', lightUVConf);

    // Downsample to every 5 minutes to keep it smooth but performant (288 points)
    const data = [];
    for (let i = 0; i < 1440; i += 5) {
      const w = whiteValues[i];
      // Hardware dependency: IR/UV are physically capped by White's intensity
      const ir = Math.min(irValues[i], w);
      const uv = Math.min(uvValues[i], w);
      
      data.push({
        time: i,
        label: minutesToClockLabel(i),
        white: Number(w.toFixed(1)),
        ir: Number(ir.toFixed(1)),
        uv: Number(uv.toFixed(1)),
      });
    }
    // Add 1440 (24:00)
    data.push({
      time: 1440,
      label: '24:00',
      white: Number(whiteValues[1439].toFixed(1)),
      ir: Number(Math.min(irValues[1439], whiteValues[1439]).toFixed(1)),
      uv: Number(Math.min(uvValues[1439], whiteValues[1439]).toFixed(1)),
    });

    return data;
  }, [env, actors]);

  const limits = useMemo(() => {
    if (!actors) return null;
    const l: any = {};
    ['light_white', 'light_ir', 'light_uv'].forEach(key => {
      const actorData = actors[key] || {};
      const conf = actorData.settings || (actorData.maxCap !== undefined ? actorData : {});
      const min = Number(conf.minThreshold ?? conf.min_threshold ?? 0);
      const max = Number(conf.maxCap ?? conf.max_cap ?? 255);
      
      const shortKey = key.replace('light_', '') as keyof typeof COLORS;
      l[shortKey] = {
        min: (min / 255) * 100,
        max: (max / 255) * 100
      };
    });
    return l;
  }, [actors]);

  const maxDomain = useMemo(() => {
    if (!limits) return 100;
    // The White light's max cap is the hardware ceiling for everyone
    const whiteCap = limits.white?.max ?? 100;
    
    let highest = 0;
    Object.values(limits).forEach((l: any) => {
      // Effective limit is the smaller of its own limit and the white power source limit
      const effectiveLimit = Math.min(l.max ?? 100, whiteCap);
      highest = Math.max(highest, effectiveLimit);
    });
    
    // Default to at least 20 for readability
    return Math.min(100, Math.max(highest, 20));
  }, [limits]);

  const liveData = useMemo(() => {
    if (externalData?.live) return externalData.live;
    if (!actors) return {};
    
    const wRaw = actors.light_white?.pwm ?? 0;
    const wIntensity = (convertPwmToIntensity('light_white', wRaw) / 255) * 100;
    const w = Math.max(0, Math.min(100, wIntensity));

    const irRaw = actors.light_ir?.pwm ?? 255;
    const irIntensity = (convertPwmToIntensity('light_ir', irRaw) / 255) * 100;
    
    const uvRaw = actors.light_uv?.pwm ?? 255;
    const uvIntensity = (convertPwmToIntensity('light_uv', uvRaw) / 255) * 100;

    return {
      white: w,
      ir: Math.min(w, Math.max(0, Math.min(100, irIntensity))),
      uv: Math.min(w, Math.max(0, Math.min(100, uvIntensity))),
    };
  }, [actors, externalData]);

  const yTicks = useMemo(() => {
    if (maxDomain <= 25) return [0, 5, 10, 15, 20, 25].filter(t => t <= maxDomain);
    if (maxDomain <= 50) return [0, 10, 20, 30, 40, 50].filter(t => t <= maxDomain);
    return [0, 25, 50, 75, 100].filter(t => t <= maxDomain);
  }, [maxDomain]);

  const shading = useMemo(() => {
    const d = externalData?.shading?.dayStart ?? minutesFromClock(env?.dayStartTime ?? env?.dStart ?? '0600');
    const n = externalData?.shading?.nightStart ?? minutesFromClock(env?.nightStartTime ?? env?.nStart ?? '1800');
    return { dayStart: d, nightStart: n };
  }, [env, externalData]);

  // For shading background
  const CustomBackground = (props: any) => {
    const { viewBox } = props;
    if (!viewBox || shading.dayStart === null || shading.nightStart === null) return null;
    
    const { x, y, width, height } = viewBox;
    const toX = (m: number) => x + (m / 1440) * width;

    // Dark shading for night blocks
    const dayX = toX(shading.dayStart || 0);
    const nightX = toX(shading.nightStart || 1440);

    return (
      <g>
        {shading.dayStart < shading.nightStart ? (
          <>
            {/* Morning Night */}
            <rect x={x} y={y} width={dayX - x} height={height} fill="rgba(0,0,0,0.15)" />
            {/* Evening Night */}
            <rect x={nightX} y={y} width={x + width - nightX} height={height} fill="rgba(0,0,0,0.15)" />
          </>
        ) : (
          /* Day crosses midnight? Actually night crosses midnight if dayStart > nightStart */
          <rect x={nightX} y={y} width={dayX - nightX} height={height} fill="rgba(0,0,0,0.15)" />
        )}
      </g>
    );
  };

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []); 

  // Update current time every second for smooth movement
  const [currentTime, setCurrentTime] = React.useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  });
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: compact ? 0 : 40, bottom: 0 }}>
          <defs>
            <linearGradient id="colorWhite" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.white.stroke} stopOpacity={0.6}/>
              <stop offset="95%" stopColor={COLORS.white.stroke} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorIR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.ir.stroke} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={COLORS.ir.stroke} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorUV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.uv.stroke} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={COLORS.uv.stroke} stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
          <XAxis 
            dataKey="time" 
            type="number" 
            domain={[0, 1440]} 
            ticks={[0, 360, 720, 1080, 1440]}
            tickFormatter={(m) => minutesToClockLabel(m)}
            stroke="rgba(255,255,255,0.2)"
            fontSize={compact ? 9 : 10}
            tick={{ fill: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            domain={[0, maxDomain]} 
            ticks={yTicks}
            stroke="rgba(255,255,255,0.2)" 
            fontSize={compact ? 8 : 10}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono, monospace' }}
            tickFormatter={(v) => `${Math.round(v)}%`}
            label={!compact ? { 
              value: 'INTENSITY', 
              angle: -90, 
              position: 'insideLeft', 
              offset: -25,
              style: { 
                textAnchor: 'middle', 
                fill: 'rgba(255,255,255,0.3)', 
                fontSize: '9px', 
                fontWeight: 'bold', 
                letterSpacing: '1px' 
              } 
            } : undefined}
          />
          
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-2.5 rounded-xl shadow-2xl">
                    <p className="text-[10px] text-muted-color font-bold mb-1.5 uppercase tracking-widest">{data.label}</p>
                    <div className="space-y-1">
                      {payload.map((entry: any) => (
                        <div key={entry.name} className="flex justify-between gap-4 items-center">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-xs text-white/70 capitalize">{entry.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-white">{entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Area 
            type="monotone" 
            name="White Light"
            dataKey="white" 
            stroke={COLORS.white.stroke} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorWhite)" 
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            name="Infrared (IR)"
            dataKey="ir" 
            stroke={COLORS.ir.stroke} 
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorIR)" 
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            name="Ultraviolet (UV)"
            dataKey="uv" 
            stroke={COLORS.uv.stroke} 
            strokeWidth={2}
            strokeDasharray="3 3"
            fillOpacity={1} 
            fill="url(#colorUV)" 
            isAnimationActive={false}
          />

          <ReferenceLine x={currentTime} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3">
            {!compact && (
              <label position="top" fill="#ef4444" fontSize={10} fontWeight="bold" offset={10}>
                NOW
              </label>
            )}
          </ReferenceLine>

          {/* Limits as horizontal boundaries */}
          {!compact && limits && Object.entries(limits).map(([spectrumKey, val]: [string, any]) => {
            const color = COLORS[spectrumKey as keyof typeof COLORS].stroke;
            const res = [];
            
            const RA = ReferenceArea as any;
            const RL = ReferenceLine as any;

            if (val.min !== null && val.min > 0 && !isNaN(val.min)) {
              res.push(
                <RA 
                  key={`${spectrumKey}-min-area`}
                  y1={0} 
                  y2={val.min} 
                  fill={color} 
                  fillOpacity={0.05} 
                />
              );
              res.push(
                <RL 
                  key={`${spectrumKey}-min-line`}
                  y={val.min} 
                  stroke={color} 
                  strokeOpacity={0.6} 
                  strokeDasharray="2 2"
                  label={{ position: 'right', value: 'MIN', fill: color, fontSize: 9, fontWeight: 'bold' }}
                />
              );
            }
            if (val.max !== null && val.max < 100 && !isNaN(val.max)) {
              res.push(
                <RA 
                  key={`${spectrumKey}-max-area`}
                  y1={val.max} 
                  y2={100} 
                  fill={color} 
                  fillOpacity={0.05} 
                />
              );
              res.push(
                <RL 
                  key={`${spectrumKey}-max-line`}
                  y={val.max} 
                  stroke={color} 
                  strokeOpacity={0.6} 
                  strokeDasharray="2 2"
                  label={{ position: 'right', value: 'MAX', fill: color, fontSize: 9, fontWeight: 'bold' }}
                />
              );
            }
            return res;
          }).flat()}

          {/* Shared vertical time crosshair */}
          {!isNaN(currentTime) && (
            <ReferenceLine 
              x={currentTime} 
              stroke="rgba(255,255,255,0.4)" 
              strokeDasharray="3 3" 
              isFront 
              label={!compact ? { 
                position: 'bottom', 
                value: minutesToClockLabel(Math.floor(currentTime)), 
                fill: 'rgba(255,255,255,0.8)', 
                fontSize: 10, 
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 'bold',
                offset: 20
              } : undefined}
            />
          )}

          {/* Live indicator dots and horizontal crosshairs */}
          {Object.entries(liveData).map(([spectrumKey, val]: [string, any]) => {
            const color = COLORS[spectrumKey as keyof typeof COLORS]?.stroke;
            if (!color || isNaN(val)) return null;
            const res = [];
            
            const RL = ReferenceLine as any;

            // Horizontal crosshair line
            res.push(
              <RL 
                key={`live-h-${spectrumKey}`}
                y={val} 
                stroke={color}
                strokeOpacity={0.15}
                strokeDasharray="3 3"
                isFront
              />
            );

            // Dot at intersection
            res.push(
              <ReferenceDot 
                key={`live-dot-${spectrumKey}`}
                x={currentTime} 
                y={val}
                isFront
                shape={(props: any) => {
                  const { cx, cy } = props;
                  if (isNaN(cx) || isNaN(cy)) return null;
                  return (
                    <g>
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={compact ? 3 : 4} 
                        fill={color}
                        stroke="#fff"
                        strokeWidth={1.5}
                        className="drop-shadow-sm"
                      />
                      {!compact && (
                        <>
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r={compact ? 5 : 7} 
                            fill="transparent"
                            stroke={color}
                            strokeWidth={1}
                            strokeOpacity={0.5}
                            className="animate-ping"
                          />
                          <text
                            x={currentTime > 1200 ? cx - 12 : cx + 12}
                            y={cy - 12}
                            fill={color}
                            fontSize={10}
                            fontWeight="bold"
                            textAnchor={currentTime > 1200 ? "end" : "start"}
                            fontFamily="JetBrains Mono, monospace"
                            className="drop-shadow-md"
                          >
                            {minutesToClockLabel(Math.floor(currentTime))} • {Math.round((val / 100) * 255)} PWM
                          </text>
                        </>
                      )}
                    </g>
                  );
                }}
              />
            );
            return res;
          }).flat()}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
