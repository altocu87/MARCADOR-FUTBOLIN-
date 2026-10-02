/**
 * Enlaces de transporte con las placas. Todos intercambian líneas de texto del
 * protocolo MFV3; solo cambia el medio:
 * - USB Serial (Web Serial): Arduino Uno/Nano/Mega/Leonardo, ESP32 por cable. Chrome/Edge en PC y Android.
 * - Wi-Fi (WebSocket): ESP32/ESP8266 en la red local o con su propio punto de acceso. Cualquier navegador.
 * - Bluetooth LE (Web Bluetooth, servicio UART de Nordic): ESP32. Chrome/Edge en PC y Android.
 */

import { LineSplitter } from './protocol';

export type LinkKind = 'serial' | 'websocket' | 'bluetooth';
export type LinkStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface LinkHandlers {
  onLine(line: string): void;
  onStatus(status: LinkStatus, detail?: string): void;
}

export interface HardwareLink {
  readonly kind: LinkKind;
  connect(handlers: LinkHandlers): Promise<void>;
  disconnect(): Promise<void>;
  send(line: string): void;
}

// ------------------------------------------------------------------ Tipos mínimos (APIs aún no incluidas en TS)

interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}
interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}
interface BtCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BtCharacteristic>;
  writeValue(data: BufferSource): Promise<void>;
}
interface BtServer {
  connected: boolean;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<BtCharacteristic> }>;
}
interface BtDevice extends EventTarget {
  name?: string;
  gatt?: { connect(): Promise<BtServer> };
}
interface BluetoothLike {
  requestDevice(options: { filters?: { services?: string[]; namePrefix?: string }[]; optionalServices?: string[] }): Promise<BtDevice>;
}

const nav = () => navigator as Navigator & { serial?: SerialLike; bluetooth?: BluetoothLike };

export const linkSupport = {
  serial: () => typeof navigator !== 'undefined' && !!nav().serial,
  bluetooth: () => typeof navigator !== 'undefined' && !!nav().bluetooth,
  websocket: () => typeof WebSocket !== 'undefined',
};

const encoder = new TextEncoder();

// ------------------------------------------------------------------ USB Serial

export class SerialLink implements HardwareLink {
  readonly kind = 'serial' as const;
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private closing = false;

  constructor(private readonly baudRate = 115200, private readonly reuseGranted = false) {}

  async connect(h: LinkHandlers): Promise<void> {
    const serial = nav().serial;
    if (!serial) throw new Error('Este navegador no admite USB Serial (usa Chrome o Edge).');
    h.onStatus('connecting');
    const granted = this.reuseGranted ? (await serial.getPorts())[0] : undefined;
    if (this.reuseGranted && !granted) {
      // Reconexión automática sin puerto autorizado: no se puede pedir permiso sin un toque.
      h.onStatus('disconnected');
      return;
    }
    this.port = granted ?? (await serial.requestPort());
    await this.port.open({ baudRate: this.baudRate });
    this.writer = this.port.writable?.getWriter() ?? null;
    this.closing = false;
    h.onStatus('connected');
    void this.readLoop(h);
  }

  private async readLoop(h: LinkHandlers): Promise<void> {
    const decoder = new TextDecoder();
    const splitter = new LineSplitter();
    try {
      while (this.port?.readable && !this.closing) {
        this.reader = this.port.readable.getReader();
        for (;;) {
          const { value, done } = await this.reader.read();
          if (done) break;
          splitter.push(decoder.decode(value, { stream: true })).forEach((l) => h.onLine(l));
        }
        this.reader.releaseLock();
      }
    } catch (err) {
      if (!this.closing) h.onStatus('error', err instanceof Error ? err.message : 'Cable desconectado');
      return;
    }
    if (!this.closing) h.onStatus('disconnected');
  }

  send(line: string): void {
    void this.writer?.write(encoder.encode(`${line}\n`)).catch(() => undefined);
  }

  async disconnect(): Promise<void> {
    this.closing = true;
    await this.reader?.cancel().catch(() => undefined);
    this.writer?.releaseLock();
    await this.port?.close().catch(() => undefined);
    this.port = null;
  }
}

// ------------------------------------------------------------------ Wi-Fi WebSocket

export class WebSocketLink implements HardwareLink {
  readonly kind = 'websocket' as const;
  private ws: WebSocket | null = null;
  private retry = 0;
  private timer: number | undefined;
  private stopped = false;

  constructor(private readonly url: string) {}

  async connect(h: LinkHandlers): Promise<void> {
    this.stopped = false;
    this.open(h);
  }

  private open(h: LinkHandlers): void {
    h.onStatus('connecting', this.url);
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch (err) {
      h.onStatus('error', err instanceof Error ? err.message : 'Dirección no válida');
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      h.onStatus('connected', this.url);
    };
    ws.onmessage = (e) => String(e.data).split(/\r?\n/).forEach((l) => l.trim() && h.onLine(l));
    ws.onclose = () => {
      if (this.stopped) return;
      // Reconexión automática con espera creciente (máx. 10 s): la placa puede reiniciarse.
      this.retry += 1;
      const wait = Math.min(10_000, 500 * 2 ** Math.min(this.retry, 5));
      h.onStatus('connecting', `Reintentando en ${Math.round(wait / 1000)} s…`);
      this.timer = window.setTimeout(() => this.open(h), wait);
    };
  }

  send(line: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(line);
  }

  async disconnect(): Promise<void> {
    this.stopped = true;
    window.clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }
}

// ------------------------------------------------------------------ Bluetooth LE (UART de Nordic)

export const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // la app escribe
const NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // la placa notifica

export class BluetoothLink implements HardwareLink {
  readonly kind = 'bluetooth' as const;
  private server: BtServer | null = null;
  private rx: BtCharacteristic | null = null;
  private queue: Promise<void> = Promise.resolve();

  async connect(h: LinkHandlers): Promise<void> {
    const bt = nav().bluetooth;
    if (!bt) throw new Error('Este navegador no admite Bluetooth (usa Chrome o Edge).');
    h.onStatus('connecting');
    const device = await bt.requestDevice({ filters: [{ services: [NUS_SERVICE] }, { namePrefix: 'MFV3' }], optionalServices: [NUS_SERVICE] });
    device.addEventListener('gattserverdisconnected', () => h.onStatus('disconnected'));
    this.server = (await device.gatt?.connect()) ?? null;
    if (!this.server) throw new Error('No se pudo conectar por Bluetooth.');
    const service = await this.server.getPrimaryService(NUS_SERVICE);
    this.rx = await service.getCharacteristic(NUS_RX);
    const tx = await service.getCharacteristic(NUS_TX);
    const decoder = new TextDecoder();
    const splitter = new LineSplitter();
    tx.addEventListener('characteristicvaluechanged', () => {
      if (tx.value) splitter.push(decoder.decode(tx.value)).forEach((l) => h.onLine(l));
    });
    await tx.startNotifications();
    h.onStatus('connected', device.name);
  }

  send(line: string): void {
    const rx = this.rx;
    if (!rx) return;
    // BLE no admite escrituras simultáneas: se encolan.
    this.queue = this.queue.then(() => rx.writeValue(encoder.encode(`${line}\n`))).catch(() => undefined);
  }

  async disconnect(): Promise<void> {
    if (this.server?.connected) this.server.disconnect();
    this.server = null;
    this.rx = null;
  }
}
