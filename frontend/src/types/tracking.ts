/**
 * Type definitions for WebSocket tracking system
 * Matches backend TrackingConsumer message format
 */

// Driver location data
export interface DriverLocation {
  lat: number;
  lng: number;
  address: string;
  timestamp?: string;
}

// WebSocket message types
export type MessageType = 
  | 'location_update'
  | 'subscribe_parcel'
  | 'unsubscribe_parcel'
  | 'subscribed'
  | 'unsubscribed'
  | 'tracking_ended'
  | 'error';

// Outgoing message: Driver -> Server (location update)
export interface LocationUpdateMessage {
  type: 'location_update';
  lat: number;
  lng: number;
  address: string;
  parcel_id?: number;
}

// Incoming message: Server -> Client (broadcast)
export interface DriverLocationMessage {
  type: 'driver_location';
  driver_id: string;
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
  parcel_id?: number;
}

// Subscribe/unsubscribe messages
export interface SubscribeMessage {
  type: 'subscribe_parcel';
  parcel_id: number;
}

export interface UnsubscribeMessage {
  type: 'unsubscribe_parcel';
  parcel_id: number;
}

// Response messages
export interface SubscribedMessage {
  type: 'subscribed';
  parcel_id: number;
}

export interface UnsubscribedMessage {
  type: 'unsubscribed';
  parcel_id: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface TrackingEndedMessage {
  type: 'tracking_ended';
  parcel_id: number;
  message: string;
}

// Union type for all incoming messages
export type IncomingMessage = 
  | DriverLocationMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | TrackingEndedMessage
  | ErrorMessage;

// Union type for all outgoing messages
export type OutgoingMessage = 
  | LocationUpdateMessage
  | SubscribeMessage
  | UnsubscribeMessage;

// WebSocket connection states
export type ConnectionState = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';
