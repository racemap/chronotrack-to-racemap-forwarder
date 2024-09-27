# chronotrack-to-racemap-forwarder

This is a small service that is meant connect ChronoTrek timing systems to the racemap backend. Its called a forwarder because it forwards the data from the timing system to racemap.com. It also manages the communication with the Chronotrek Software.

- it opens a port und the machine its running on default is **3000**
- it listens on localhost IP: **127.0.0.1**
- it requires an API Token to forward reads, detections whatwever you call it to racemap.com
- the token is set by using the environment var **RACEMAP_API_TOKEN**

## How to use

1. Get the API Token from racemap.com
2. Run the service with the API Token as an environment variable
3. Configure your timing system to send data to the service
4. The service will forward the data to racemap.com

## How to run the service

### I just want to use it

You can download the latest binary for your platform from the here and run it with the following commands.

- [chronotrack-to-racemap-forwarder-win-x64-v1.0.0.exe](https://github.com/racemap/chronotrack-to-racemap-forwarder/releases/download/v1.0.0/chronotrack-to-racemap-forwarder-win-x64-v1.0.0.exe)
- [chronotrack-to-racemap-forwarder-linux-x64-v1.0.0](https://github.com/racemap/chronotrack-to-racemap-forwarder/releases/download/v1.0.0/chronotrack-to-racemap-forwarder-linux-x64-v1.0.0)

#### Windows

```cmd
set RACEMAP_API_TOKEN=your-api-token
.\chronotrack-to-racemap-forwarder.exe
```

#### Linux

```bash
export RACEMAP_API_TOKEN=your-api-token
./chronotrack-to-racemap-forwarder
```

### I know what I am doing

You can checkout the repository and run the service with the following commands. (requires nodejs 18 and yarn 4 to be installed)

```bash
  git clone git@github.com:racemap/chronotrack-to-racemap-forwarder.git
  cd chronotrack-to-racemap-forwarder
  yarn install
  touch .env
  sed -i '/^RACEMAP_API_TOKEN=/d' .env && echo "RACEMAP_API_TOKEN=your-api-token" >> .env
  yarn start
```

## Settings you can make

You can change the defaults of the service by overriding the following environment variables

| Variable          | Default             | Description                                                                                                   |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| RACEMAP_API_TOKEN | ''                  | The API Token to use for the racemap API                                                                      |
| LISTEN_MODE       | private             | The mode the service listens on, can be private or public. private binds to 127.0.0.1 public binds to 0.0.0.0 |
| LISTEN_PORT       | 3000                | The port the service listens on                                                                               |
| RACEMAP_API_HOST  | https://racemap.com | The host to send the requests to                                                                              |
