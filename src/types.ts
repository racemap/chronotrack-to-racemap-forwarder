
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
  CT01_13 = 'CT01_13', // supported by us
  CT01_33 = 'CT01_33',
  CTP01 = 'CTP01',
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
