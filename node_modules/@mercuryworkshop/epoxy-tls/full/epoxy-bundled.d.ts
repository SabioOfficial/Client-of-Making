/* tslint:disable */
/* eslint-disable */
/**
 * The `ReadableStreamType` enum.
 *
 * *This API requires the following crate features to be activated: `ReadableStreamType`*
 */
type ReadableStreamType = "bytes";

type EpoxyIoStream = {
	read: ReadableStream<Uint8Array>,
	write: WritableStream<Uint8Array>,
};
type EpoxyWispTransport = string | (() => { read: ReadableStream<ArrayBuffer>, write: WritableStream<Uint8Array> });
type EpoxyWebSocketInput = string | ArrayBuffer;
type EpoxyWebSocketHeadersInput = Headers | { [key: string]: string };
type EpoxyUrlInput = string | URL;


export class EpoxyClient {
/**
** Return copy of self without private attributes.
*/
  toJSON(): Object;
/**
* Return stringified version of self.
*/
  toString(): string;
  free(): void;
  constructor(transport: EpoxyWispTransport, options: EpoxyClientOptions);
  replace_stream_provider(): Promise<void>;
  connect_websocket(handlers: EpoxyHandlers, url: EpoxyUrlInput, protocols: (string)[], headers: EpoxyWebSocketHeadersInput): Promise<EpoxyWebSocket>;
  connect_tcp(url: EpoxyUrlInput): Promise<EpoxyIoStream>;
  connect_tls(url: EpoxyUrlInput): Promise<EpoxyIoStream>;
  connect_udp(url: EpoxyUrlInput): Promise<EpoxyIoStream>;
  fetch(url: EpoxyUrlInput, options: object): Promise<Response>;
  redirect_limit: number;
  user_agent: string;
  buffer_size: number;
}
export class EpoxyClientOptions {
  free(): void;
  constructor();
  wisp_v2: boolean;
  udp_extension_required: boolean;
  title_case_headers: boolean;
  ws_title_case_headers: boolean;
  websocket_protocols: (string)[];
  redirect_limit: number;
  header_limit: number;
  user_agent: string;
  pem_files: (string)[];
  disable_certificate_validation: boolean;
  buffer_size: number;
}
export class EpoxyHandlers {
  free(): void;
  constructor(onopen: Function, onclose: Function, onerror: Function, onmessage: Function);
  onopen: Function;
  onclose: Function;
  onerror: Function;
  onmessage: Function;
}
export class EpoxyWebSocket {
  private constructor();
  free(): void;
  send(payload: EpoxyWebSocketInput): Promise<void>;
  close(code: number, reason: string): Promise<void>;
}
export class IntoUnderlyingByteSource {
  private constructor();
  free(): void;
  start(controller: ReadableByteStreamController): void;
  pull(controller: ReadableByteStreamController): Promise<any>;
  cancel(): void;
  readonly type: ReadableStreamType;
  readonly autoAllocateChunkSize: number;
}
export class IntoUnderlyingSink {
  private constructor();
  free(): void;
  write(chunk: any): Promise<any>;
  close(): Promise<any>;
  abort(reason: any): Promise<any>;
}
export class IntoUnderlyingSource {
  private constructor();
  free(): void;
  pull(controller: ReadableStreamDefaultController): Promise<any>;
  cancel(): void;
}



/**
* 
*
* @returns {Promise<void>}
*/
export default function __wbg_init (): Promise<void>;
export const info: { version: string, minimal: boolean, release: boolean, commit: string };
