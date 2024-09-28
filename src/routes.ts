import { chronoTrackForwarder } from "./forwarder";
import { Express, Request, Response } from "express";

export function defineAllRoutes(app: Express): void {
  // here our very limited api is exposed (all live stuff uses the websocket)
  app.get("/api/v1/info", (_req: Request, res: Response) => {
    res.json({
      name: "ChronoTrack Forwarder",
      version: "v1.0.0",
      description: `This is a simple forwarder for ChronoTrack Live Data to Racemap
       - for more information visit https://github.com/racemap/chronotrack-to-racemap-forwarder
      `,
    });
  });

  // pulled from the real backend (novum cloud). Here our service behaves like a proxy
  app.get("/api/v1/connected-devices", async (_req: Request, res: Response) => {
    if (chronoTrackForwarder != null) {
      res.json(chronoTrackForwarder.getConnectedChronoTrackDevices());
    } else {
      res.json([]);
    }
  });

  app.use((_req, res) => {
    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ChronoTrack Forwarder</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f0f0f0;
              color: #333;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              color: #333;
            }
            p {
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>ChronoTrack Forwarder</h1>
            <p>This is a simple forwarder for ChronoTrack Live Data to Racemap.</p>
            <p>For more information visit <a href="https://github.com/racemap/chronotrack-to-racemap-forwarder">github.com/racemap/chronotrack-to-racemap-forwarder</a></p>
          </div>
        </body>
        </html>
      `),
    );
  });
}
