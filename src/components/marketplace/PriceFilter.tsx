interface PriceFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
}

export default function PriceFilter({
  min,
  max,
  value,
  onChange,
}: PriceFilterProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text">Rango de precio</label>
      <div className="flex items-center gap-3 text-sm text-text-muted">
        <span>${value[0].toLocaleString()}</span>
        <div className="relative flex-1">
          <input
            type="range"
            min={min}
            max={max}
            step={100}
            value={value[0]}
            onChange={(e) =>
              onChange([Math.min(Number(e.target.value), value[1] - 100), value[1]])
            }
            className="pointer-events-none absolute h-1 w-full appearance-none bg-gray-200 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
          />
          <input
            type="range"
            min={min}
            max={max}
            step={100}
            value={value[1]}
            onChange={(e) =>
              onChange([value[0], Math.max(Number(e.target.value), value[0] + 100)])
            }
            className="pointer-events-none absolute h-1 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
          />
        </div>
        <span>${value[1].toLocaleString()}</span>
      </div>
    </div>
  );
}
