import fs from "fs";
import net from "net";
import _pick from "lodash/pick";
import moment from "moment";
import shortId from "shortid";
import APIClient from "./api-client";
import { BaseClass } from "./base-class";
import { ChronoTrackCommands } from "./consts";
import { ChronoTrackDevice, ChronoTrackProtocol, ExtendedSocket, ListenModes, MessageParts, TimingRead } from "./types";
import { error, info, listenHostByListenMode, log, processStoredData, storeIncomingRawData, success, warn } from "./functions";

const MAX_MESSAGE_DATA_DELAY_IN_MS = 500;

const WELCOME_MESSAGE = "RacemapChronoTrackReceiver~v1.0.0";
const SUPPORTED_PROTOCOL = "CTP01";
const CRLF = "\r\n";
const FEATURES = {
  guntimes: "true",
  newlocations: "true",
  "connection-id": "false",
  "stream-mode": "push",
  "time-format": "iso",
};

export let chronoTrackForwarder: ChronoTrackForwarder;

export function initChronoTrackForwarder(apiToken: string, listenPort: number, listenMode: ListenModes): void {
  chronoTrackForwarder = new ChronoTrackForwarder(apiToken, listenPort, listenMode);
}

const logToFileSystem = (message: Buffer) => {
  fs.appendFileSync("./ChronoTrackInputAdapter.log", `${new Date().toISOString()} message: ${message}\n`);
};

const clearIntervalTimer = (timerHandle: NodeJS.Timeout | null) => {
  if (timerHandle != null) {
    clearInterval(timerHandle);
  }
};

export class ChronoTrackForwarder extends BaseClass {
  _connections: Map<string, ExtendedSocket> = new Map();
  _server: net.Server;
  _apiToken: string;
  _apiClient: APIClient;

  constructor(apiToken: string, listenPort: number, listenMode: ListenModes) {
    super();

    this._apiToken = apiToken;
    this._apiClient = new APIClient({ "api-token": apiToken });
    this._server = this._configureReceiverSocket(listenPort, listenHostByListenMode(listenMode));
  }

  getConnectedChronoTrackDevices(): Array<ChronoTrackDevice> {
    return Array.from(this._connections.entries()).map(([_id, socket]) => {
      return _pick<ExtendedSocket>(socket, ["id", "meta", "openedAt"]);
    });
  }

  _configureReceiverSocket = (listenPort: number, bindAddress: string): net.Server => {
    const server = net.createServer(this._onNewConnection as (socket: net.Socket) => void);
    server.listen({ host: bindAddress, port: listenPort }, () => {
      info(`${this.className} is listening on \x1b[32m${bindAddress}\x1b[0m:\x1b[35m${listenPort}\x1b[0m`);
    });
    server.on("error", (err) => {
      error(`${this.className}._configureReceiverSocket`, err);
    });
    return server;
  };

  _onNewConnection = (socket: ExtendedSocket): void => {
    log(`${this.className}Socket.onNewConnection`);

    socket.id = shortId.generate();
    socket.userId = "";
    socket.openedAt = new Date();
    socket.identified = false;
    socket.cache = {
      lastTime: Date.now(),
      buffer: Buffer.alloc(0),
      name: `ChronoTrackInputAdapter.ClienttSocket[${socket.id}].cache`,
    };
    socket.keepAliveTimerHandle = null;
    socket.triggerStartTransmissionHandle = null;

    this._connections.set(socket.id, socket); // The server knows its sockets

    socket.on("error", (error: Error) => {
      if (error != null) {
        log(`${this.className}Socket.onError: ${error} ${error.stack}`);
        clearIntervalTimer(socket.keepAliveTimerHandle);
        clearIntervalTimer(socket.triggerStartTransmissionHandle);
        this._connections.delete(socket.id);
      }
    });

    socket.on("end", () => {
      log(`${this.className}Socket.onEnd`);
      clearIntervalTimer(socket.keepAliveTimerHandle);
      clearIntervalTimer(socket.triggerStartTransmissionHandle);
      this._connections.delete(socket.id);
    });

    socket.on("data", (data: Buffer) => {
      try {
        storeIncomingRawData(data, socket.cache, MAX_MESSAGE_DATA_DELAY_IN_MS);
        processStoredData(socket.cache, (message) => {
          this._handleRawMessage(socket, message);
        });
      } catch (e) {
        warn(`${this.className}Socket.onData ParserError`, data, e);
      }
    });

    socket.sendFrame = function (text: string) {
      socket.write(text + CRLF);
    };

    socket.sendObject = function (object: Record<string, string>) {
      for (const [key, value] of Object.entries(object)) {
        socket.sendFrame(`${key}=${value}`);
      }
    };

    socket.sendKeepAlivePing = function () {
      socket.sendFrame(ChronoTrackCommands.ping);
    };

    socket.keepAliveTimerHandle = setInterval(() => {
      socket.sendKeepAlivePing();
    }, 10000);
  };

  _handleRawMessage = (socket: ExtendedSocket, rawMessage: Buffer): void => {
    if (rawMessage != null) {
      try {
        logToFileSystem(rawMessage);
        log(`${this.className}._handleMessage.rawMessage: ${rawMessage}`);
        const separated = rawMessage.toString().split("~");
        if (separated.length > 0) {
          if (!socket.identified) {
            this._handleWelcomeMessage(socket, separated);
          } else {
            this._handleMessages(socket, separated);
          }
        }
      } catch (e) {
        error(`${this.className}._handleMessage`, e);
      }
    }
  };

  _handleWelcomeMessage = (refToSocket: ExtendedSocket, parts: MessageParts): void => {
    if (parts.length === 3 && (parts[0] === "SimpleClient" || parts[0] === "RacemapTestClient")) {
      refToSocket.identified = true;
      refToSocket.meta = {
        name: parts[0],
        version: parts[1],
        protocol: parts[2] as ChronoTrackProtocol,
        event: undefined,
        connectionId: undefined,
        locations: [],
        clientRespondedAt: new Date(),
      };
      refToSocket.sendFrame(`${WELCOME_MESSAGE}~${Object.keys(FEATURES).length}`);
      refToSocket.sendObject(FEATURES);
      refToSocket.sendFrame(ChronoTrackCommands.getconnectionid);
      refToSocket.sendFrame(ChronoTrackCommands.geteventinfo);
      refToSocket.sendFrame(ChronoTrackCommands.getlocations);
      refToSocket.sendFrame(ChronoTrackCommands.authorize);
    }
  };

  _handleMessages = (refToSocket: ExtendedSocket, parts: MessageParts): void => {
    if (refToSocket.meta.protocol === SUPPORTED_PROTOCOL) {
      const len = parts.length;
      if (len > 1 && parts[1] === ChronoTrackCommands.getlocations) {
        if (refToSocket.meta.locations.length === 0) {
          refToSocket.sendFrame(ChronoTrackCommands.start);
        }
        refToSocket.meta.locations = parts.slice(2);
        return;
      }
      switch (len) {
        case 2: {
          if (parts[0] === ChronoTrackCommands.ack && parts[1] === ChronoTrackCommands.ping) {
            refToSocket.meta.clientRespondedAt = new Date();
          }
          break;
        }
        case 3: {
          if (parts[0] === ChronoTrackCommands.ack && parts[1] === ChronoTrackCommands.getconnectionid) {
            refToSocket.meta.clientRespondedAt = new Date();
            refToSocket.meta.connectionId = parts[2];
          }
          break;
        }
        case 5: {
          if (parts[0] === ChronoTrackCommands.ack && parts[1] === ChronoTrackCommands.geteventinfo) {
            refToSocket.meta.clientRespondedAt = new Date();
            refToSocket.meta.event = {
              id: parts[3],
              name: parts[2],
              description: parts[4],
            };
          }
          break;
        }
        case 8: {
          this._processTimingRead(refToSocket, parts);
          break;
        }
        default: {
          warn("Message with unknown count of parts received", parts);
          break;
        }
      }
    } else {
      warn(`${this.className} - We do not handle messages using protocol ${refToSocket.meta.protocol}`);
    }
  };

  _processTimingRead = (refToSocket: ExtendedSocket, parts: MessageParts): void => {
    const protocolId = parts[0];

    const saveRead = (someParts: Array<string>) => {
      let chipId = someParts[3];

      // All ChronoTrack Transponder IDs are prefixed with ChronoPing_
      // This is to seperate them from Raceresult TransponderIds and common App Ids
      if (chipId.indexOf("ChronoPing_") !== 0) {
        chipId = `ChronoPing_${chipId}`;
      }

      const TimingRead: TimingRead = {
        chipId, // the transponder registered by the antenna
        timingId: someParts[6], // MAC Address of the reader (often each antenna has a own MAC address)
        timestamp: this._parseTime(refToSocket, someParts[4]).toISOString(),
        // receivedAt: Date.now(), // when we received this information in our backend
        lat: null,
        lng: null,
        alt: null,
        timingName: someParts[2],
      };

      this._pushNonlocatedReadToRacemap(TimingRead);
    };

    switch (protocolId) {
      case ChronoTrackProtocol.CT01_13: {
        /*
          CT01_13,     24,          START, 50101,15:54:48.90, 1,              117F37,     8
          Protocol_ID, Line number, Point, Tag,  Time of Day, Read Occurence, Reader MAC, Reader Antenna Port
           0 Protocol ID         = Always the same will not change
          1 Line Number         = So this isnt increasing anything, it is just the line number/counter
          2 Point               = timing location name
          3 Tag                 = the tag 😊 / bib numer / transpodnerId / chipId
          4 Time of Day         = In local time Europe/Amsterdam, i fit is required we can forward with a time shift the UTC time
          5 Read Occurence      = How many times the tag has read ( useable for laps )
          6 Reader MAC          = Mac adress of the reader
          7 Reader antenna Port = is always between 1-8 It is just for us that we now wich antenna had read something. If this is 0 it will be a GUN START normally
          */

        saveRead(parts);

        break;
      }
      case ChronoTrackProtocol.CT01_33: {
        // CT01_33~2038~30k~newlocation~09:15:21.00~0~ED932A~0
        // Here new hardware was connected to SimpleClient the measure point is called 30k
        // We try to obtain all readings again
        if (parts[3] === ChronoTrackCommands.newlocation) {
          const newLocationName = parts[2];
          refToSocket.sendFrame(ChronoTrackCommands.getlocations);
          // 1 seconds after we received a new location we trigger the client to start transmitting data
          refToSocket.triggerStartTransmissionHandle = setInterval(() => {
            this._triggerStartTransmission(refToSocket, newLocationName);
          }, 1000);
        } else {
          saveRead(parts);
        }

        // CT01_33~4~start~guntime~07:45:01.01~0~DF239A~0
        // ToDo: How to handle guntimes?
        break;
      }

      default: {
        warn(`protocolId: ${protocolId} of ChronoTrack textfile-format is not supported yet`);
        break;
      }
    }
  };

  _parseTime(_refToSocket: ExtendedSocket, timeString: string): Date {
    let time = new Date(0);
    switch (FEATURES["time-format"]) {
      case "normal": {
        // we have no date just 14:02:15.31
        time = moment.utc(timeString, "HH:mm:ss.SS").toDate();
        break;
      }
      case "iso": {
        // we have: 2008-10-16T14:02:15.31 => expected to be UTC
        time = moment.utc(timeString, "YYYY-MM-DDTHH:mm:ss.SS").toDate();
        break;
      }
      case "unix": {
        time = moment.unix(parseFloat(timeString)).toDate();
      }
    }
    return time;
  }

  _triggerStartTransmission(socket: ExtendedSocket, locationName: string): void {
    socket.sendFrame(`${ChronoTrackCommands.start}~${locationName}`);
  }

  async _pushNonlocatedReadToRacemap(TimingRead: TimingRead): Promise<void> {
    // log("tryToPushNonlocatedReadToRacemap", TimingRead);
    const response = await this._apiClient.sendTimingReadsAsJSON([TimingRead]);
    if (response.status === 200) {
      success("tryToPushNonlocatedReadToRacemap", TimingRead);
    } else {
      warn("tryToPushNonlocatedReadToRacemap", response.status);
    }
  }
}
