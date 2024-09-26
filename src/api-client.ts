import { TimePing } from "./types";

class APIClient {
  _host = "";

  constructor() {
    this._host = "https://racemap.com";
  }

  async _fetch(
    path: string,
    options: RequestInit = {},
  ): Promise<
    Omit<Response, "json"> & {
      json: (reviver?: <I, O>(key: string, value: I) => O) => Promise<any>;
    }
  > {
    const res = await fetch(`${this._host}${path}`, {
      ...options,
      headers: options.headers || [],
    });

    return res;
  }

  async _postJSON(
    path: string,
    data: Record<string, any> = {},
    headers = {},
  ): Promise<Response> {
    return await this._fetch(path, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(data),
    });
  }

  async checkAvailibility() {
    return this.sendTimePingsAsJSON([]);
  }

  async sendTimePingsAsJSON(
    timePings: Array<TimePing>,
    options = { headers: {} },
  ): Promise<Response> {
    return this._postJSON(
      "/api/v1/timing_input/pings",
      timePings,
      options.headers,
    );
  }
}

export default APIClient;
