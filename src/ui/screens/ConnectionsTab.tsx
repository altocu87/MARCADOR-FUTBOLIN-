/** Ajustes → Conexiones: placas Arduino / ESP32 por USB, Wi-Fi o Bluetooth. */
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { defaultWsUrl } from '../../inputs/hardware/hub';
import { linkSupport, type LinkKind, type LinkStatus } from '../../inputs/hardware/links';
import { useHardware } from '../../inputs/hardware/useHardware';
import { sendExternalInput } from '../../inputs/inputBus';
import { Toggle } from '../components/common';

const STATUS_LABEL: Record<LinkStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando…',
  connected: 'Conectado',
  error: 'Error',
};

const INFO: Record<LinkKind, { title: string; icon: string; text: string; needs: string }> = {
  serial: {
    title: 'USB (cable)',
    icon: '🔌',
    text: 'Arduino Uno/Nano/Mega/Leonardo o ESP32 por cable USB a 115200 baudios.',
    needs: 'Chrome o Edge en PC, Mac o Android.',
  },
  websocket: {
    title: 'Wi-Fi',
    icon: '📶',
    text: 'ESP32/ESP8266 en la misma red o con su propia red «MARCADOR-FUTBOLIN».',
    needs: 'Cualquier navegador. Desde una web https solo con la app servida por la placa (http).',
  },
  bluetooth: {
    title: 'Bluetooth',
    icon: '🅱',
    text: 'ESP32 con Bluetooth LE (servicio UART). Aparece como «MFV3-…».',
    needs: 'Chrome o Edge en PC, Mac o Android (no iPhone).',
  },
};

export function ConnectionsTab() {
  const hub = useHardware();
  const { prefs, savePrefs } = useApp();
  const [url, setUrl] = useState(prefs.hardware.wsUrl || defaultWsUrl());

  const card = (kind: LinkKind) => {
    const st = hub.state(kind);
    const supported = linkSupport[kind]();
    const busy = st.status === 'connecting';
    const on = st.status === 'connected';
    return (
      <div key={kind} className={`card conn-card ${on ? 'on' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }} aria-hidden="true">{INFO[kind].icon}</span>
          <strong style={{ flex: 1 }}>{INFO[kind].title}</strong>
          <span className={`badge ${on ? 'badge-ok' : st.status === 'error' ? 'badge-danger' : ''}`}>{STATUS_LABEL[st.status]}</span>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>{INFO[kind].text}</div>
        {kind === 'websocket' && (
          <input className="input" style={{ minHeight: 44, fontSize: 14 }} value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Dirección WebSocket" />
        )}
        {(st.board || st.detail) && (
          <div className="dim" style={{ fontSize: 11 }}>
            {st.board ? `Placa: ${st.board}` : ''} {st.detail ?? ''}
          </div>
        )}
        {!supported ? (
          <div className="notice warn" style={{ fontSize: 11 }}>No disponible aquí. {INFO[kind].needs}</div>
        ) : on || busy ? (
          <button className="btn btn-sm btn-danger" onClick={() => void hub.disconnect(kind)}>Desconectar</button>
        ) : (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              if (kind === 'websocket') void savePrefs({ ...prefs, hardware: { ...prefs.hardware, wsUrl: url } });
              void hub.connect(kind, { url });
            }}
          >
            Conectar
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="conn-grid">{(['serial', 'websocket', 'bluetooth'] as LinkKind[]).map(card)}</div>
      <div className="conn-bottom">
        <div className="card" style={{ flex: 1 }}>
          <Toggle
            checked={prefs.hardware.autoConnect}
            onChange={(v) => void savePrefs({ ...prefs, hardware: { ...prefs.hardware, autoConnect: v, wsUrl: url } })}
            label="Reconectar al abrir"
            description="Wi-Fi y puertos USB ya autorizados (Bluetooth siempre pide un toque)."
          />
          <div className="label" style={{ marginTop: 8 }}>Probar sin placa</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button className="btn btn-sm" onClick={() => sendExternalInput('GOL_BLANCO', 'button')}>GOL_BLANCO</button>
            <button className="btn btn-sm" onClick={() => sendExternalInput('GOL_AZUL', 'sensor')}>GOL_AZUL</button>
            <button className="btn btn-sm" onClick={() => sendExternalInput('PAUSA', 'button')}>PAUSA</button>
          </div>
          <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>
            Programas para las placas y esquemas en la carpeta <code>hardware/</code> del proyecto (guía en docs/HARDWARE.md).
          </div>
        </div>
        <div className="card conn-log">
          <div className="label">Registro</div>
          <div className="scroll" style={{ flex: 1, minHeight: 0, fontFamily: 'Consolas, monospace', fontSize: 11 }}>
            {hub.log.length === 0 ? (
              <span className="dim">Sin mensajes.</span>
            ) : (
              [...hub.log].reverse().map((l, i) => (
                <div key={i} className={`log-${l.dir}`}>
                  {l.dir === 'in' ? '←' : l.dir === 'out' ? '→' : '·'} {l.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
