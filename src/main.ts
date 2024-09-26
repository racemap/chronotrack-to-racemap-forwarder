import APIClient from "./api-client";
import ChronoTrackForwarder from "./forwarder";
import { error, info, log, success } from "./functions";

const RACEMAP_GENERIC_READS_API_TOKEN = process.env.RACEMAP_GENERIC_READS_API_TOKEN ?? "";
const LISTEN_PORT = Number.parseInt(process.env.LISTEN_PORT ?? "3000");
const apiClient = new APIClient({ "api-token": RACEMAP_GENERIC_READS_API_TOKEN });

async function main() {
  log("Hello from chronotrack-forwarder");
  info("Try to read users api token");

  if (RACEMAP_GENERIC_READS_API_TOKEN === "") {
    throw new Error(`No api token found. 
      - Please create an .env file and store your token there. 
      - The token should look like this: RACEMAP_GENERIC_READS_API_TOKEN=your-api-token
      - You can get your api token from your racemap account profile section.`);
  }
  success(`|-> User token  is availible`);
  info("Try to check validyty of your API Token, sending an empty dataset.");

  const isAvail = await apiClient.checkAvailibility();
  if (isAvail.status === 200) {
    success(`|-> API Token is valid`);
    new ChronoTrackForwarder(RACEMAP_GENERIC_READS_API_TOKEN, LISTEN_PORT);
  } else {
    throw new Error(`API Token is invalid. Please check your token and try again.`);
  }
}

main();
