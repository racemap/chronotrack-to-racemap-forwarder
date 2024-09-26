import withQuery from "with-query";
import { StoredTimingRead, TimingRead } from "./types";

class APIClient {
  _host = "";
  _headers: HeadersInit = {};

  constructor(headers: HeadersInit = {}) {
    this._host = "https://racemap.com";
    this._headers = headers;
  }

  async _fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${this._host}${path}`, {
      ...options,
      headers: { ...this._headers, ...options.headers },
    });
    return res;
  }

  async _getJSON(path: string): Promise<any> {
    const res = await this._fetch(path, { headers: { Accept: "application/json" } });
    return res.json();
  }

  async _postJSON(path: string, data: Record<string, any> = {}): Promise<Response> {
    return await this._fetch(path, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }

  async checkAvailibility() {
    return this.sendTimingReadsAsJSON([]);
  }

  async sendTimingReadsAsJSON(TimingReads: Array<TimingRead>, options = { headers: {} }): Promise<Response> {
    return this._postJSON("/services/trackping/api/v1/timing_input/pings", TimingReads, options.headers);
  }

  async getTimingReads(query: {
    timingIds: Array<string>;
    transponderIds?: Array<string>;
    startTime?: string;
    endTime?: string;
    firstReceive?: string;
    lastReceive?: string;
  }): Promise<Array<StoredTimingRead>> {
    return this._getJSON(withQuery("/services/trackping/api/v1/timing_output/pings", query));
  }
}

export default APIClient;
