import React from 'react';
import { cn } from '../../lib/utils';

interface DurationInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DurationInput({ value, onChange, disabled, className }: DurationInputProps) {
  const parts = (value || '00:00:00').split(':');
  const h = parts[0] || '00';
  const m = parts[1] || '00';
  const s = parts[2] || '00';

  const update = (idx: number, valStr: string) => {
    const newParts = [...parts];
    let val = valStr.replace(/\D/g, '');
    if (val.length === 0) val = '0';
    let num = parseInt(val, 10);
    
    if (idx === 1 || idx === 2) {
      if (num > 59) num = 59;
    }
    if (idx === 0) {
      if (num > 99) num = 99;
    }

    newParts[idx] = String(num).padStart(2, '0');
    onChange(newParts.join(':'));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className={cn(
      "flex items-center bg-black/40 border border-white/10 rounded overflow-hidden focus-within:border-emerald-500/50 transition-colors",
      disabled && "opacity-50 pointer-events-none",
      className
    )}>
      <input 
        type="text" 
        inputMode="numeric" 
        pattern="[0-9]*"
        value={h} 
        onChange={e => update(0, e.target.value)} 
        onFocus={handleFocus}
        className="w-full min-w-[2rem] bg-transparent p-1.5 md:p-2 text-center text-sm md:text-base text-white outline-none" 
        placeholder="HH" 
      />
      <span className="text-white/30 text-xs md:text-sm font-mono">:</span>
      <input 
        type="text" 
        inputMode="numeric" 
        pattern="[0-9]*"
        value={m} 
        onChange={e => update(1, e.target.value)} 
        onFocus={handleFocus}
        className="w-full min-w-[2rem] bg-transparent p-1.5 md:p-2 text-center text-sm md:text-base text-white outline-none" 
        placeholder="MM" 
      />
      <span className="text-white/30 text-xs md:text-sm font-mono">:</span>
      <input 
        type="text" 
        inputMode="numeric" 
        pattern="[0-9]*"
        value={s} 
        onChange={e => update(2, e.target.value)} 
        onFocus={handleFocus}
        className="w-full min-w-[2rem] bg-transparent p-1.5 md:p-2 text-center text-sm md:text-base text-white outline-none" 
        placeholder="SS" 
      />
    </div>
  );
}
