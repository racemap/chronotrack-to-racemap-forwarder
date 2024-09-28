import http from "http";
import chalk from "chalk";
import express from "express";
import APIClient from "./api-client";
import { defineAllRoutes } from "./routes";
import { initChronoTrackForwarder } from "./forwarder";
import { info, listenHostByListenMode, listenModeByinput, log, printEnvVar, success } from "./functions";

const RACEMAP_API_HOST = process.env.RCEMAP_API_HOST ?? "https://racemap.com";
const RACEMAP_API_TOKEN = process.env.RACEMAP_API_TOKEN ?? "";
const LISTEN_MODE = process.env.LISTEN_MODE?.toLocaleLowerCase() ?? "private";
const LISTEN_PORT = Number.parseInt(process.env.LISTEN_PORT ?? "3000");
const apiClient = new APIClient({ "api-token": RACEMAP_API_TOKEN });

// configure and start the webserver
const app = express();
const webServer = http.createServer(app);

defineAllRoutes(app);

webServer.listen(LISTEN_PORT + 1, () => {
  success(
    `Webserver for local UI is listening on ${chalk.bold.yellow(listenHostByListenMode(LISTEN_MODE))}:${chalk.bold.redBright(LISTEN_PORT + 1)}.`,
  );
});

async function main() {
  log("Hello from chronotrack-forwarder");

  printEnvVar({ RACEMAP_API_HOST });
  printEnvVar({ RACEMAP_API_TOKEN });
  printEnvVar({ LISTEN_MODE });
  printEnvVar({ LISTEN_PORT });

  info("Check LISTEN_MODE");
  if (!["private", "public"].includes(LISTEN_MODE)) {
    throw new Error(`Invalid listen mode. Please use either 'private' or 'public'`);
  }

  info("Try to read users api token");
  if (RACEMAP_API_TOKEN === "") {
    throw new Error(`No api token found. 
      - Please create an .env file and store your token there. 
      - The token should look like this: RACEMAP_API_TOKEN=your-api-token
      - You can get your api token from your racemap account profile section.`);
  }
  success(`|-> Users api token is availible`);
  info("Try to check validyty of your API Token, sending an empty dataset.");

  const isAvail = await apiClient.checkAvailibility();
  if (isAvail.status === 200) {
    success(`|-> API Token is valid`);
    initChronoTrackForwarder(RACEMAP_API_TOKEN, LISTEN_PORT, listenModeByinput(LISTEN_MODE));
  } else {
    throw new Error(`API Token is invalid. Please check your token and try again.`);
  }
}

main();
