/*
 * Just to sum up buffers
 * @param incomingData
 * @param aBufferObject
 * @param maxMessageDataDelayInMilis
 */
const CRLF = '\r\n';

type TArgs = Array<unknown>;

type BufferObject = {
  buffer: Buffer;
  lastTime: number;
  name?: string;
};

export const storeIncomingRawData = (
  incomingData: Buffer,
  aBufferObject: BufferObject,
  maxMessageDataDelayInMilis = 200,
): void => {
  const newBufferlength: number = aBufferObject.buffer.length + incomingData.length;
  const now: number = Date.now();
  if (
    aBufferObject.buffer.length > 0 &&
    aBufferObject.lastTime + maxMessageDataDelayInMilis < now
  ) {
    console.warn(
      `storeIncomingRawData - ${aBufferObject.name} Buffer to old!`,
      'ΔT =',
      now - aBufferObject.lastTime,
      'ms',
      'allowedΔT =',
      maxMessageDataDelayInMilis,
      'ms',
      'dropped bytes:',
      aBufferObject.buffer,
    );
    aBufferObject.buffer = Buffer.alloc(0);
  }
  aBufferObject.buffer = Buffer.concat([aBufferObject.buffer, incomingData], newBufferlength);
  aBufferObject.lastTime = now;
};

/*
 * Just to find serialized data seperated by CRLF
 * @param aBufferToProcess
 * @param messageHandler
 */
export const processStoredData = (
  aBufferToProcess: BufferObject,
  messageHandler: (message: Buffer) => void,
): void => {
  if (aBufferToProcess.buffer.length > 0) {
    let CRLFPos: number = aBufferToProcess.buffer.indexOf(CRLF);
    while (CRLFPos > -1) {
      // Reserving some Space
      const aMessage: Buffer = Buffer.alloc(CRLFPos);
      // Reserving some Space for the Rest of the Message
      const aTail: Buffer = Buffer.alloc(aBufferToProcess.buffer.length - CRLFPos - 2);
      // Extracting the message
      aBufferToProcess.buffer.copy(aMessage, 0, 0, CRLFPos);
      // Saving the rest of the message
      aBufferToProcess.buffer.copy(aTail, 0, CRLFPos + 2, aBufferToProcess.buffer.length);
      // shortening the Raw Buffer
      aBufferToProcess.buffer = aTail;
      CRLFPos = aBufferToProcess.buffer.indexOf(CRLF);
      // trying to analyse the message
      if (messageHandler != null && typeof messageHandler === 'function') messageHandler(aMessage);
    }
  }
};

export const now = (): string => {
  return new Date().toISOString().split('T')[1].split('Z')[0];
};


export let log = (...args: TArgs): void => {
      console.log(now(), 'Log:    ', ...args);
};

export let info = (...args: TArgs): void => {
      console.log(now(), 'Info:   \x1b[34m', ...args, '\x1b[0m');
};

export let warn = (...args: TArgs): void => {
  console.log(now(), 'Warning:\x1b[91m', ...args, '\x1b[0m');
};

export let error = (...args: TArgs): void => {

      console.log(now(), 'Error:  \x1b[31m', ...args, '\x1b[0m');
};

export let success = (...args: TArgs): void => {
  console.log(now(), 'Success:\x1b[32m', ...args, '\x1b[0m');
};