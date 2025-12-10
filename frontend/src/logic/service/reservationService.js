import mqtt from 'mqtt';

const DEFAULT_TIMEOUT_MS = 5000;

export class ReservationService {
  constructor() {
    this.client = null;
    this.clientId = `frontend-${Math.random().toString(16).slice(2,10)}`;
    this.stateCache = new Map(); // segmentId -> state object
    this.pending = new Map(); // nonce -> {resolve, reject, timer}
    this.listeners = new Set(); // callbacks voor state updates
  }

  init(brokerUrl, opts = {}) {
    const connectOpts = Object.assign({
      clientId: this.clientId,
      reconnectPeriod: 1000,
      keepalive: 30,
      clean: true,
    }, opts);

    this.client = mqtt.connect(brokerUrl, connectOpts);

    this.client.on('connect', () => {
      console.log('[ReservationService] connected as', this.clientId);
      this.client.subscribe('track/segments/+/state', {qos: 1});
      this.client.subscribe('track/segments/+/response', {qos: 1});
    });

    this.client.on('message', (topic, buf) => {
      let payload = null;
      try {
        payload = JSON.parse(buf.toString());
      } catch (e) {
        console.warn('[ReservationService] invalid JSON payload', topic, buf.toString());
        return;
      }
      if (topic.endsWith('/state')) {
        const segmentId = this._extractSegmentId(topic);
        this._handleState(segmentId, payload);
      } else if (topic.endsWith('/response')) {
        this._handleResponse(payload);
      }
    });

    this.client.on('error', (err) => {
      console.error('[ReservationService] mqtt error', err);
    });

    this.client.on('reconnect', () => {
      console.log('[ReservationService] reconnecting...');
    });

    this.client.on('close', () => {
      console.log('[ReservationService] connection closed');
    });
  }

  reserve(segmentId, ttlMs = 60000, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const nonce = this._makeNonce();
    const topic = `track/segments/${segmentId}/request`;
    const payload = {
      action: 'reserve',
      client_id: this.clientId,
      ttl_ms: ttlMs,
      timestamp: Date.now(),
      nonce
    };
    return this._publishAndWaitResponse(topic, payload, nonce, timeoutMs);
  }

  release(segmentId, reservationId = null, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const nonce = this._makeNonce();
    const topic = `track/segments/${segmentId}/request`;
    const payload = {
      action: 'release',
      client_id: this.clientId,
      reservation_id: reservationId,
      timestamp: Date.now(),
      nonce
    };
    return this._publishAndWaitResponse(topic, payload, nonce, timeoutMs);
  }

  forceRelease(segmentId, reason = '', timeoutMs = DEFAULT_TIMEOUT_MS) {
    const nonce = this._makeNonce();
    const topic = `track/segments/${segmentId}/request`;
    const payload = {
      action: 'force_release',
      client_id: this.clientId,
      reason,
      timestamp: Date.now(),
      nonce
    };
    return this._publishAndWaitResponse(topic, payload, nonce, timeoutMs);
  }

  getState(segmentId) {
    return this.stateCache.get(segmentId) || null;
  }

  onStateUpdate(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // intern
  _publishAndWaitResponse(topic, payload, nonce, timeoutMs) {
    if (!this.client || !this.client.connected) {
      return Promise.reject(new Error('MQTT client not connected'));
    }
    const pStr = JSON.stringify(payload);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(nonce);
        reject(new Error('timeout waiting for response'));
      }, timeoutMs);

      this.pending.set(nonce, { resolve, reject, timer });

      this.client.publish(topic, pStr, {qos:1}, (err) => {
        if (err) {
          clearTimeout(timer);
          this.pending.delete(nonce);
          reject(err);
        }
      });
    });
  }

  _handleResponse(payload) {
    const nonce = payload.nonce;
    if (nonce && this.pending.has(nonce)) {
      const entry = this.pending.get(nonce);
      clearTimeout(entry.timer);
      this.pending.delete(nonce);
      entry.resolve(payload);
      return;
    }

    // fallback: match by client_id
    for (const [k, entry] of this.pending.entries()) {
      if (payload.client_id && payload.client_id === this.clientId) {
        clearTimeout(entry.timer);
        this.pending.delete(k);
        entry.resolve(payload);
        return;
      }
    }

    console.warn('[ReservationService] response could not be correlated', payload);
  }

  _handleState(segmentId, payload) {
    this.stateCache.set(segmentId, payload);
    for (const cb of this.listeners) {
      try { cb(segmentId, payload); } catch(e) { console.error(e); }
    }
  }

  _extractSegmentId(topic) {
    const parts = topic.split('/');
    if (parts.length >= 3) return parts[2];
    return '';
  }

  _makeNonce() {
    return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2,8)}`;
  }
}

export default new ReservationService();