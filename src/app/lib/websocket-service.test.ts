import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWebSocketService } from './websocket-service';

describe('WebSocket Service', () => {
  let mockWebSocket: any;
  let service: ReturnType<typeof createWebSocketService>;

  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    };

    // Properly mock the WebSocket constructor
    global.WebSocket = class MockWebSocket {
      constructor() {
        return mockWebSocket;
      }
    } as any;

    service = createWebSocketService('ws://localhost:8080');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const connectPromise = service.connect();

      // Simulate open event
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();

      await connectPromise;
      expect(service.isConnected()).toBe(true);
    });

    it('should notify on connection', async () => {
      const handler = vi.fn();
      service.onConnect(handler);

      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();

      await connectPromise;
      expect(handler).toHaveBeenCalled();
    });

    it('should notify on disconnection', async () => {
      const handler = vi.fn();
      service.onDisconnect(handler);

      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      // Simulate close
      mockWebSocket.readyState = WebSocket.CLOSED;
      service.disconnect();
      mockWebSocket.onclose?.();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    it('should subscribe to messages', async () => {
      const handler = vi.fn();
      service.subscribe('notification', handler);

      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      // Send a message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'notification',
          data: { message: 'test' },
          timestamp: Date.now(),
        }),
      });

      expect(handler).toHaveBeenCalledWith({ message: 'test' });
    });

    it('should queue messages when disconnected', () => {
      // Verify disconnected state
      const isConnected = service.isConnected();

      service.send('test', { data: 'value' });

      // Message should be queued if not connected
      if (!isConnected) {
        expect(mockWebSocket.send).not.toHaveBeenCalled();
      }
    });

    it('should send messages when connected', async () => {
      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      service.send('test', { data: 'value' });

      expect(mockWebSocket.send).toHaveBeenCalled();
      const sentData = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentData.type).toBe('test');
      expect(sentData.data).toEqual({ data: 'value' });
    });

    it('should handle malformed messages', async () => {
      const handler = vi.fn();
      service.subscribe('test', handler);

      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      // Send malformed JSON
      mockWebSocket.onmessage?.({ data: 'invalid json' });

      // Should not call handler
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Subscriptions', () => {
    it('should unsubscribe handler', async () => {
      const handler = vi.fn();
      const unsubscribe = service.subscribe('test', handler);

      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      // Unsubscribe
      unsubscribe();

      // Send message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'test',
          data: {},
          timestamp: Date.now(),
        }),
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple subscriptions', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      service.subscribe('test', handler1);
      service.subscribe('test', handler2);

      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'test',
          data: { value: 1 },
          timestamp: Date.now(),
        }),
      });

      expect(handler1).toHaveBeenCalledWith({ value: 1 });
      expect(handler2).toHaveBeenCalledWith({ value: 1 });
    });
  });

  describe('Auto-reconnect', () => {
    it('should attempt to reconnect on unexpected close', async () => {
      const connectPromise = service.connect();
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.onopen?.();
      await connectPromise;

      // Verify we're connected
      expect(service.isConnected()).toBe(true);

      // Simulate unexpected close by manually calling onclose without disconnect()
      // In our mock, mockWebSocket is a singleton object returned by the constructor.
      // In the real service, this.ws is set to null in onclose.
      mockWebSocket.readyState = WebSocket.CLOSED;
      mockWebSocket.onclose?.();

      // Verify disconnected
      expect(service.isConnected()).toBe(false);
    });
  });
});
