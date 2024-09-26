import net from "net";
import moment from "moment";
import { serial as test } from "ava";
import { TFixtures, TPredictionTestTimes, TState } from "../src/types";
import {
  connectTcpSocket,
  processStoredData,
  shortIdBuilder,
  sleep,
  storeIncomingRawData,
} from "../src/functions";
import ChronoTrackForwarder from "../src/forwarder";
import { ChronoTrackCommands, CRLF } from "../src/consts";

const chronoTrackForwarderHostname = "localhost";
const chronoTrackForwarderPort = Number.parseInt(process.env.PORT || "3000");
const apiToken = process.env.RACEMAP_GENERIC_READS_API_TOKEN ?? "";

const shortId001 = shortIdBuilder();
const shortId002 = shortIdBuilder();
const times: TPredictionTestTimes = {
  testStartTime: moment().utc().toDate(),
  testStartTimeMinus60Seconds: moment().utc().add(-60, "seconds").toDate(),
  startTime: moment().utc().subtract(2, "h").toISOString(),
  endTime: moment().utc().toISOString(),
};

const fixtures: TFixtures = {
  event: {
    id: shortId001,
    name: `Testevent for ChronoTrack Test (${shortId001})`,
    description: `Just to test the data import. (${shortId001})`,
    locations: [
      { name: "Start", mac: `${shortId001}_0` },
      { name: "1k", mac: `${shortId001}_1` },
      { name: "2k", mac: `${shortId001}_2` },
      { name: "3k", mac: `${shortId001}_3` },
      { name: "5k", mac: `${shortId001}_4` },
      { name: "8k", mac: `${shortId001}_5` },
      { name: "9k", mac: `${shortId001}_6` },
      { name: "Finish", mac: `${shortId001}_7` },
    ],
  },
  newLocationName: "OnBridge",
  connectionId: `g4vnkHCHU8SbsDMF${shortId001}`,
  transponderId: shortId001,
};

const state: TState = {
  forwarder: null,
  aTCPClient: null,
  chronoTrackServerMessages: [],
  chronoTrackSocketCache: {
    lastTime: Date.now(),
    buffer: Buffer.alloc(0),
  },
};

test("Ava is running, fixtures and state exists", async (t) => {
  t.is(true, true);
  t.not(fixtures, null);
  t.not(state, null);
});

test("Try to spin up an instance of the chronotrack forwarder", async (t) => {
  state.forwarder = new ChronoTrackForwarder(
    apiToken,
    chronoTrackForwarderPort,
  );
  t.not(state.forwarder, null, "instance of ChronoTrackForwarder is not null");
});

test(`should connect to tcp://${chronoTrackForwarderHostname}:${chronoTrackForwarderPort}`, async (t) => {
  state.aTCPClient = await connectTcpSocket(
    chronoTrackForwarderHostname,
    chronoTrackForwarderPort,
  );
  t.not(state.aTCPClient, null, "tcp client should be not null but is");

  if (state.aTCPClient != null) {
    state.aTCPClient.on("data", (data: Buffer) => {
      storeIncomingRawData(data, state.chronoTrackSocketCache);
      processStoredData(state.chronoTrackSocketCache, (message) => {
        if (state.aTCPClient == null) return;
        const messageStr = message.toString();
        state.chronoTrackServerMessages.push(messageStr);
        const parts = messageStr.split("~");
        const len = parts.length;
        if (len >= 1) {
          if (len > 1 && parts[0] === ChronoTrackCommands.start) {
            state.aTCPClient.write(
              `CT01_13~21~${fixtures.newLocationName}~${fixtures.transponderId}~${moment(
                times.testStartTime,
              )
                .utc()
                .format("YYYY-MM-DDTHH:mm:ss.SS")}~1~117F37~8` + CRLF,
            );
          }

          if (len === 1) {
            switch (parts[0]) {
              case ChronoTrackCommands.start: {
                for (const [
                  i,
                  location,
                ] of fixtures.event.locations.entries()) {
                  state.aTCPClient.write(
                    `${i % 2 === 0 ? "CT01_13" : "CT01_33"}~21~${location.name}~${
                      fixtures.transponderId
                    }~${moment(times.testStartTime)
                      .utc()
                      .format("YYYY-MM-DDTHH:mm:ss.SS")}~1~${location.mac}~8` +
                      CRLF,
                  );
                }
                break;
              }
              case ChronoTrackCommands.ping: {
                state.aTCPClient.write(
                  `${ChronoTrackCommands.ack}~${ChronoTrackCommands.ping}` +
                    CRLF,
                );
                break;
              }
              case ChronoTrackCommands.getlocations: {
                state.aTCPClient.write(
                  `${ChronoTrackCommands.ack}~${
                    ChronoTrackCommands.getlocations
                  }~${fixtures.event.locations.map((l) => l.name).join("~")}` +
                    CRLF,
                );
                break;
              }
              case ChronoTrackCommands.geteventinfo: {
                state.aTCPClient.write(
                  `${ChronoTrackCommands.ack}~${ChronoTrackCommands.geteventinfo}~${fixtures.event.name}~${fixtures.event.id}~${fixtures.event.description}` +
                    CRLF,
                );
                break;
              }
              case ChronoTrackCommands.getconnectionid: {
                state.aTCPClient.write(
                  `${ChronoTrackCommands.ack}~${ChronoTrackCommands.getconnectionid}~${fixtures.connectionId}` +
                    CRLF,
                );
                break;
              }
              default: {
                if (parts[0].includes("guntimes")) break;
                if (parts[0].includes("newlocations")) break;
                if (parts[0].includes("connection-id")) break;
                if (parts[0].includes("stream-mode")) break;
                if (parts[0].includes("time-format")) break;
                console.warn(`Unknown command from server. ${parts[0]}`);
                break;
              }
            }
          }
        }
      });
    });
  }
});

test("should send the welcome message through the socket", async (t) => {
  t.not(state.aTCPClient, null, "tcp client is not null");

  t.true(
    await state.aTCPClient.write(`RacemapTestClient~1.0.0~CTP01${CRLF}`),
    "it should be possible to write a welcome message to the socket",
  );
  // give the server some time to answer!
  await sleep(500);
});

test("should send a timePing through the socket", async (t) => {
  t.not(state.aTCPClient, null, "tcp client should be initialized but is not");

  t.true(
    await state.aTCPClient.write(
      `CT01_13~21~START~${fixtures.transponderId}~${moment(times.testStartTime)
        .utc()
        .format("YYYY-MM-DDTHH:mm:ss.SS")}~1~117F37~8` + CRLF,
    ),
    "it should be possible to send a timePing through the socket",
  );
  // give the server some time to answer!
  await sleep(500);
});

test("should be possible to find the correct client config messages in the server welcome messages for (guntimes, newlocations, connection-id, stream-mode and time-format)", (t) => {
  t.true(
    state.chronoTrackServerMessages.includes("guntimes=true"),
    "guntimes=true should be in the server welcome messages",
  );
  t.true(
    state.chronoTrackServerMessages.includes("newlocations=true"),
    "newlocations=true should be in the server welcome messages",
  );
  t.true(
    state.chronoTrackServerMessages.includes("connection-id=false"),
    "connection-id=false should be in the server welcome messages",
  );
  t.true(
    state.chronoTrackServerMessages.includes("stream-mode=push"),
    "stream-mode=push should be in the server welcome messages",
  );
  t.true(
    state.chronoTrackServerMessages.includes("time-format=iso"),
    "time-format=iso should be in the server welcome messages",
  );
});

test("it should be possible to get a list of connected chronotrack clients", async (t) => {
  t.true(state.forwarder != null, "forwarder should be initialized but is not");
  if (state.forwarder != null) {
    t.true(
      Array.isArray(state.forwarder?.getConnectedChronoTrackDevices()),
      "connectedClients should be an array",
    );

    t.true(
      state.forwarder.getConnectedChronoTrackDevices().length > 0,
      "connectedClients should have more than 0 entries",
    );
  }
});

/*

it('it should be possible to find our RacemapTestClient among all connected Clients', async () => {
  expect(state.connectedClients.length).to.be.greaterThan(0);
  const client = state.connectedClients.find((c) => c.meta.name === 'RacemapTestClient');
  if (client == null) expect.fail('found no connected client.');

  expect(client.meta).to.exist;
  expect(client.meta.name).to.equal('RacemapTestClient');
  expect(client.meta.event).to.exist;
  expect(client.meta.event.name).to.equal(fixtures.event.name);
  expect(client.meta.event.description).to.equal(fixtures.event.description);
  expect(client.meta.locations).to.exist;
  expect(client.meta.locations).to.have.lengthOf(8);
});

it('should send a new location through the socket', async () => {
  if (aTCPClient == null) expect.fail('tcp client is not initialized');
  fixtures.event.locations.push({
    name: fixtures.newLocationName,
    mac: `${shortId001}_${fixtures.event.locations.length}`,
  });
  await aTCPClient.write(
    `CT01_33~12388~${fixtures.newLocationName}~${ChronoTrackCommands.newlocation}~${moment(
      times.testStartTime,
    )
      .utc()
      .format('YYYY-MM-DDTHH:mm:ss.SS')}~0~0~0` + CRLF,
  );
  // give the server some time to answer!
  await sleep(1500);
});

it('it should be possible to get an updated list of connected chronotrack clients', async () => {
  state.connectedClients = await trackpingAPIClient.getConnectedChronoTrackDevices();
  expect(state.connectedClients).to.exist;
});

it('it should be possible to find our new location in the connected RacemapTestClient metadata', async () => {
  expect(state.connectedClients.length).to.be.greaterThan(0);
  const client = state.connectedClients.find((c) => c.meta.name === 'RacemapTestClient');
  if (client == null) expect.fail('found no connected client.');

  expect(client).to.exist;
  expect(client.meta).to.exist;
  expect(client.meta.name).to.equal('RacemapTestClient');
  expect(client.meta.event).to.exist;
  expect(client.meta.event.name).to.equal(fixtures.event.name);
  expect(client.meta.event.description).to.equal(fixtures.event.description);
  expect(client.meta.locations).to.exist;
  expect(client.meta.locations).to.have.lengthOf(8 + 1); // cause the on bridge location
  expect(client.meta.locations).to.include(fixtures.newLocationName);
});

it('it should be possible to find 2 start transmission frames received from the server. 1 unspecific and one specific for the newLocation', async () => {
  expect(state.chronoTrackServerMessages).to.include(ChronoTrackCommands.start);
  expect(state.chronoTrackServerMessages).to.include(
    `${ChronoTrackCommands.start}~${fixtures.newLocationName}`,
  );
});

it('it should be possible to obtain all generated timepings from the timeping_output adapter', async () => {
  state.aListOfChronoTimePings = await trackpingAPIClient.getTimePings({
    timingIds: fixtures.timingMacs,
    startTime: times.startTime,
    endTime: times.endTime,
  });

  expect(state.aListOfChronoTimePings).to.exist;
});

it('The result of the query must be an array and not be empty', () => {
  expect(state.aListOfChronoTimePings).to.be.an('array');
  expect(state.aListOfChronoTimePings.length).to.be.above(0);
});

it(`Every ping has to be older then ${times.startTime} and younger then ${times.endTime}.`, () => {
  for (const aPing of state.aListOfChronoTimePings) {
    expect(Date.parse(aPing.timestamp)).to.be.within(
      Date.parse(times.startTime),
      Date.parse(times.endTime),
    );
  }
});

it(`Every timingId has to be in ${fixtures?.timingMacs}.`, () => {
  for (const aPing of state.aListOfChronoTimePings) {
    expect(fixtures.timingMacs).to.include(aPing.timingId);
  }
});

it('should disconnect from client', async () => {
  if (aTCPClient == null) expect.fail('tcp client is not initialized');

  await aTCPClient.end();
});

*/
