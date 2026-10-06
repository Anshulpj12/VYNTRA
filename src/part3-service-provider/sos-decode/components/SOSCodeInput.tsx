/**
 * VYNTRA — SOS Code Input Component
 * Text area with clipboard paste trigger and sample scenario test chips.
 */

import { useState } from 'react';

interface SOSCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  onDecode: () => void;
  error?: string | null;
}

const SAMPLE_SCENARIOS = [
  {
    label: '🚨 P1: Pregnancy + Medical (Jabalpur)',
    code: 'VYNTRA|23.1815,79.9412|PG-MD-AD|VYNTRA-USR-M3WP5FNR|1760000000',
  },
  {
    label: '🦽 P2: Wheelchair + Child Care',
    code: 'VYNTRA|23.1690,79.9280|WC-CC-SN|VYNTRA-USR-K8P2Q7XZ|1760000500',
  },
  {
    label: '🌸 P3: Menstruation + Sanitation',
    code: 'VYNTRA|23.1950,79.9520|MN-SN-HC|VYNTRA-USR-J4N9L1TY|1760001000',
  },
];

export default function SOSCodeInput({
  value,
  onChange,
  onDecode,
  error,
}: SOSCodeInputProps) {
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
        setPasteNotice('✓ Copied from clipboard');
        setTimeout(() => setPasteNotice(null), 2000);
      }
    } catch {
      setPasteNotice('Could not access clipboard. Please paste manually.');
    }
  };

  return (
    <div className="sos-input-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label htmlFor="sos-raw-code" className="part3-form-label" style={{ margin: 0 }}>
          <span>Enter or Paste SMS SOS Code</span>
        </label>
        <button
          type="button"
          className="part3-btn part3-btn--outline"
          style={{ minHeight: '36px', height: '36px', padding: '0 12px', fontSize: '12px' }}
          onClick={handlePasteClipboard}
        >
          {pasteNotice || '📋 Paste from SMS'}
        </button>
      </div>

      <textarea
        id="sos-raw-code"
        className="sos-input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste compact payload (e.g. VYNTRA|23.1815,79.9412|PG-MD-WC|USR-A7K2M9X1|1696588800)"
      />

      {error && (
        <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 600 }}>
          ⚠️ {error}
        </span>
      )}

      {/* Preset Scenario Quick Chips */}
      <div>
        <span className="sos-sample-label">Quick Scenario Presets:</span>
        <div className="sos-sample-chips" style={{ marginTop: '6px' }}>
          {SAMPLE_SCENARIOS.map((s) => (
            <button
              key={s.label}
              type="button"
              className="sos-sample-chip"
              onClick={() => onChange(s.code)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="part3-btn part3-btn--primary"
        style={{ width: '100%', minHeight: '52px' }}
        onClick={onDecode}
      >
        <span>🔓 Decrypt & Extract Emergency Coordinates</span>
      </button>
    </div>
  );
}
