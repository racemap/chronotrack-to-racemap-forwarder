import APIClient from "./api-client";
import { error, info, log, success } from "./functions";

const RACEMAP_GENERIC_READS_API_TOKEN =
  process.env.RACEMAP_GENERIC_READS_API_TOKEN ?? "";
const apiClient = new APIClient();

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
  } else {
    throw new Error(
      `API Token is invalid. Please check your token and try again.`,
    );
  }

  try {
  } catch (e) {
    error(
      "Error reading user api token. Did you saved it in put-your-api-token-here.txt",
      e,
    );
  }
}

main();
