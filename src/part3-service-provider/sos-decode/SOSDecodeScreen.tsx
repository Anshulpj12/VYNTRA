/**
 * VYNTRA — SOS Decode, Emergency Display & Navigation Screen
 * Module F — Decodes SMS SOS compact payloads, parses coordinates and requirements,
 * renders tactical radar map, and launches turn-by-turn navigation.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseSOSMessage, type DecodedSOSTelemetry } from './sos-decoder';
import SOSCodeInput from './components/SOSCodeInput';
import DecodedConditionsDisplay from './components/DecodedConditionsDisplay';
import EmergencyLocationMap from './components/EmergencyLocationMap';
import NavigateButton from './components/NavigateButton';
import '../styles/part3-base.css';
import '../styles/sos-decode.css';

const DEFAULT_CODE = 'VYNTRA|23.1815,79.9412|PG-MD-AD|VYNTRA-USR-M3WP5FNR|1760000000';

export default function SOSDecodeScreen() {
  const navigate = useNavigate();

  const [rawInput, setRawInput] = useState(DEFAULT_CODE);
  const [telemetry, setTelemetry] = useState<DecodedSOSTelemetry | null>(() =>
    parseSOSMessage(DEFAULT_CODE)
  );
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleDecode = () => {
    setErrorNotice(null);
    const parsed = parseSOSMessage(rawInput);
    if (parsed) {
      setTelemetry(parsed);
    } else {
      setTelemetry(null);
      setErrorNotice('Invalid VYNTRA SOS format! Expected: VYNTRA|<lat>,<lng>|<conditions>|<userId>|<timestamp>');
    }
  };

  const handleInputChange = (val: string) => {
    setRawInput(val);
    // Auto-decode if matching prefix
    if (val.trim().startsWith('VYNTRA|')) {
      const parsed = parseSOSMessage(val);
      if (parsed) {
        setTelemetry(parsed);
        setErrorNotice(null);
      }
    }
  };

  return (
    <div className="part3-container">
      {/* Top Header */}
      <header className="part3-top-header">
        <div className="part3-top-header__left">
          <button
            type="button"
            className="part3-back-btn"
            onClick={() => navigate('/service/dashboard')}
            title="Back"
          >
            ←
          </button>
          <div className="part3-top-header__title-group">
            <h1 className="part3-top-header__title">SOS Decode & Navigation</h1>
            <span className="part3-top-header__subtitle">Emergency Signal Extraction</span>
          </div>
        </div>
        <span className="part3-badge part3-badge--danger">🚨 TACTICAL DECRYPT</span>
      </header>

      <main className="sos-decode-screen">
        {/* Code Input Box */}
        <section>
          <SOSCodeInput
            value={rawInput}
            onChange={handleInputChange}
            onDecode={handleDecode}
            error={errorNotice}
          />
        </section>

        {/* Decoded Telemetry & Map View */}
        {telemetry && (
          <>
            {/* Decoded Conditions & Priority */}
            <section>
              <DecodedConditionsDisplay telemetry={telemetry} />
            </section>

            {/* Tactical Radar Map */}
            <section>
              <div className="svc-section-header" style={{ marginBottom: '8px' }}>
                <h2 className="svc-section-title">
                  <span>🗺️ Victim Emergency Coordinates</span>
                </h2>
                <span className="part3-badge part3-badge--primary">GPS LIVE LOCK</span>
              </div>
              <EmergencyLocationMap
                victimCoords={{ lat: telemetry.lat, lng: telemetry.lng }}
                baseCoords={{ lat: 23.1685, lng: 79.9338 }}
                victimName={`Person ${telemetry.userId}`}
              />
            </section>

            {/* Launch Tactical Navigation CTA */}
            <section>
              <NavigateButton lat={telemetry.lat} lng={telemetry.lng} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
