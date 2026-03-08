interface ColorPickerProps {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ colors, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-8 h-8 rounded-full border-2 ${value === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
          style={{ backgroundColor: c }}
          aria-label={`Barva ${c}`}
        />
      ))}
    </div>
  );
}
