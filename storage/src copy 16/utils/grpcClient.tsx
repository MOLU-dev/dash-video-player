import { YoutubeCloneClient as WebYoutubeClient } from '../proto/Youtube_serviceServiceClientPb';
import log from 'loglevel';

log.setLevel('debug');
const browserEndpoint = process.env.NEXT_PUBLIC_GRPC_WEB || 'http://localhost:8000';

// Factory function without interceptors
export function getGrpcClient() {
  return new WebYoutubeClient(
    browserEndpoint,
    null,
    {}
  );
}

// Default singleton client without interceptors
export const grpcClient = getGrpcClient();

log.debug(`(browser) gRPC-Web client initialized: ${browserEndpoint}`);
