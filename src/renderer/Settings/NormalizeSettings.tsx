import React from "react";

type Props = {
  value: {
    enableOnImport: boolean;
    useTags: boolean;
    useLLM: boolean;
    flipReversed: boolean;
    recurse: boolean;
    model: string;
  };
  onChange: (v: Props["value"]) => void;
};

export default function NormalizeSettings({ value, onChange }: Props) {
  const set = (k: keyof Props["value"], v: any) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={value.enableOnImport} onChange={e=>set("enableOnImport", e.target.checked)} />
        Normalize filenames automatically on import
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={value.useTags} onChange={e=>set("useTags", e.target.checked)} />
          Prefer tags (ID3/FLAC)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={value.useLLM} onChange={e=>set("useLLM", e.target.checked)} />
          OpenRouter fallback on ambiguous
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={value.flipReversed} onChange={e=>set("flipReversed", e.target.checked)} />
          Auto-flip “Title - Artist”
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={value.recurse} onChange={e=>set("recurse", e.target.checked)} />
          Include subfolders
        </label>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-28">Model</span>
        <input className="border px-2 py-1 w-full" value={value.model}
               onChange={e=>set("model", e.target.value)}
               placeholder='openrouter/anthropic/claude-3.5-sonnet' />
      </div>
    </div>
  );
}
