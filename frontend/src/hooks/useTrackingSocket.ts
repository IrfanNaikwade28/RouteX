import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  DriverLocation, 
  IncomingMessage, 
  OutgoingMessage, 
  ConnectionState 
} from '@/types/tracking';

interface UseTrackingSocketOptions {
  parcelId: number;
  onLocationUpdate?: (driverLocation: DriverLocation, driverId: string) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  autoConnect?: boolean;
}

interface UseTrackingSocketReturn {
  connectionState: ConnectionState;
  driverLocation: DriverLocation | null;
  sendLocationUpdate: (location: DriverLocation, parcelId?: number) => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Custom hook for WebSocket tracking connection
 * 
 * Follows backend TrackingConsumer contract:
 * - URL: ws://localhost:8000/ws/tracking/?parcel_id=<ID>&token=<JWT>
 * - Driver sends: { type: "location_update", lat, lng, address, parcel_id }
 * - Server broadcasts: { type: "location_update", driver_id, location: {lat, lng, address}, parcel_id }
 * - Automatic reconnection on disconnect
 * - Clean lifecycle management
 * 
 * @param options Configuration for tracking socket
 * @returns Socket state and control functions
 */
export function useTrackingSocket({
  parcelId,
  onLocationUpdate,
  onError,
  onConnectionChange,
  autoConnect = true,
}: UseTrackingSocketOptions): UseTrackingSocketReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalDisconnectRef = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  // Get WebSocket URL from environment or default
  const getWebSocketUrl = useCallback(() => {
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const tokens = localStorage.getItem('tokens');
    
    if (!tokens) {
      throw new Error('No authentication tokens found');
    }

    const { access } = JSON.parse(tokens);
    return `${baseUrl}/ws/tracking/?parcel_id=${parcelId}&token=${access}`;
  }, [parcelId]);

  // Update connection state and notify
  const updateConnectionState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    onConnectionChange?.(state);
  }, [onConnectionChange]);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: IncomingMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'driver_location':
          const location: DriverLocation = {
            lat: message.lat,
            lng: message.lng,
            address: message.address,
            timestamp: message.timestamp || new Date().toISOString(),
          };
          setDriverLocation(location);
          onLocationUpdate?.(location, message.driver_id);
          break;

        case 'tracking_ended':
          console.log(`[TrackingSocket] Tracking ended for parcel ${message.parcel_id}: ${message.message}`);
          // Auto-disconnect when delivery is complete
          disconnect();
          break;

        case 'subscribed':
          console.log(`[TrackingSocket] Subscribed to parcel ${message.parcel_id}`);
          break;

        case 'unsubscribed':
          console.log(`[TrackingSocket] Unsubscribed from parcel ${message.parcel_id}`);
          break;

        case 'error':
          console.error(`[TrackingSocket] Server error: ${message.message}`);
          onError?.(message.message);
          break;

        default:
          console.warn('[TrackingSocket] Unknown message type:', message);
      }
    } catch (error) {
      console.error('[TrackingSocket] Failed to parse message:', error);
      onError?.('Failed to parse server message');
    }
  }, [onLocationUpdate, onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      intentionalDisconnectRef.current = false;
      const url = getWebSocketUrl();
      
      console.log(`[TrackingSocket] Connecting to ${url.split('?')[0]}...`);
      updateConnectionState('connecting');

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[TrackingSocket] Connected successfully');
        updateConnectionState('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[TrackingSocket] WebSocket error:', error);
        updateConnectionState('error');
        onError?.('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log(`[TrackingSocket] Disconnected (code: ${event.code})`);
        updateConnectionState('disconnected');
        wsRef.current = null;

        // Attempt reconnection if not intentional disconnect
        if (!intentionalDisconnectRef.current && 
            reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`[TrackingSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error('[TrackingSocket] Max reconnection attempts reached');
          onError?.('Failed to reconnect to tracking server');
        }
      };
    } catch (error) {
      console.error('[TrackingSocket] Connection failed:', error);
      updateConnectionState('error');
      onError?.(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [getWebSocketUrl, handleMessage, updateConnectionState, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log('[TrackingSocket] Disconnecting...');
      wsRef.current.close();
      wsRef.current = null;
    }

    updateConnectionState('disconnected');
  }, [updateConnectionState]);

  // Send location update (driver only)
  const sendLocationUpdate = useCallback((location: DriverLocation, specificParcelId?: number) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.error('[TrackingSocket] Cannot send location: WebSocket not connected');
      onError?.('Not connected to tracking server');
      return;
    }

    const message: OutgoingMessage = {
      type: 'location_update',
      lat: location.lat,
      lng: location.lng,
      address: location.address,
      parcel_id: specificParcelId || parcelId,
    };

    try {
      wsRef.current.send(JSON.stringify(message));
      console.log('[TrackingSocket] Location update sent:', message);
    } catch (error) {
      console.error('[TrackingSocket] Failed to send location update:', error);
      onError?.('Failed to send location update');
    }
  }, [parcelId, onError]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect]); // Only run on mount/unmount

  return {
    connectionState,
    driverLocation,
    sendLocationUpdate,
    connect,
    disconnect,
  };
}
