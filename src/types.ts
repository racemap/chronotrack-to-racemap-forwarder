import net from "net";
import ChronoTrackForwarder from "./forwarder";

export type TimePing = {
  timestamp: string; // Millis since EPOCH
  chipId: string; // BiB or TransponderId or ChipID
  timingId: string; // ID of Timing Hardware or the reader or the antenna
  timingName?: string; // User defined name of the hardware i.e. Start 9K 42K or Finish
  lat?: number | null; // Latitude on earth in degree if availible (most timing system does not have this)
  lng?: number | null; // Longitude on earth in degree
  alt?: number | null; // Elevation in meters above sea level
};

type ChronoTrackEvent = {
  id: string;
  name: string;
  description: string;
};

export enum ChronoTrackProtocol {
  CT01_13 = "CT01_13", // supported by us
  CT01_33 = "CT01_33",
  CTP01 = "CTP01",
}

export type ChronoTrackClientMetadata = {
  name: string; // name of the connected client
  version: string; // version of the connected client
  event?: ChronoTrackEvent;
  protocol: ChronoTrackProtocol;
  clientRespondedAt: Date; // last time client responded to a ping request
  connectionId?: string;
  locations: Array<string>; // list of connected Chronotrack Hardware/Files
};

export type ChronoTrackDevice = {
  id: string;
  meta: ChronoTrackClientMetadata;
  openedAt: string;
};

export type TPredictionTestTimes = {
  testStartTime: Date;
  testStartTimeMinus60Seconds: Date;
  startTime: string;
  endTime: string;
};

export type TFixtures = {
  event: {
    id: string;
    name: string;
    description: string;
    locations: Array<{
      name: string;
      mac: string;
    }>;
  };
  newLocationName: string;
  connectionId: string;
  transponderId: string;
};

export type TState = {
  aTCPClient: net.Socket | null;
  forwarder: ChronoTrackForwarder | null;
  chronoTrackServerMessages: Array<any>;
  chronoTrackSocketCache: {
    lastTime: number;
    buffer: Buffer;
  };
};

export type ExtendedSocket = net.Socket & {
  id: string;
  meta: ChronoTrackClientMetadata;
  token: string;
  cache: { lastTime: number; buffer: Buffer; name: string };
  userId: string;
  openedAt: Date;
  identified: boolean;
  keepAliveTimerHandle: NodeJS.Timeout | null;
  triggerStartTransmissionHandle: NodeJS.Timeout | null;
  sendKeepAlivePing: () => void;
  sendFrame: (text: string) => void;
  sendObject: (object: Record<string, string>) => void;
};

export type MessageParts = Array<string>;
