# chronotrack-to-racemap-forwarder

This is a small service that is meant connect ChronoTrek timing systems to the racemap backend.
- it opens a port und the machine its runing on default is **3000**
- it listens on localhost IP: **127.0.0.1**
- it requires an API Token to forward reads, detections whatwever you call it to racemap.com
- the token is set by using the environment var **RACEMAP_API_TOKEN**





## Settings you can make 

You can change the defaults of the service by overriding the following environment variables

RACEMAP_API_TOKEN
LISTEN_MODE
LISTEN_PORT
RACEMAP_API_HOST


