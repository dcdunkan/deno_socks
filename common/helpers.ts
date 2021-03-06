import {
  ERRORS,
  SOCKS5_CUSTOM_AUTH_END,
  SOCKS5_CUSTOM_AUTH_START,
  SocksClientChainOptions,
  SocksClientOptions,
  SocksCommand,
  SocksProxy,
  SocksRemoteHost,
} from "./constants.ts";
import { SocksClientError } from "./util.ts";
import { Duplex } from "https://deno.land/std@0.147.0/node/stream.ts";

function validateCustomProxyAuth(
  proxy: SocksProxy,
  options: SocksClientOptions | SocksClientChainOptions,
) {
  if (proxy.custom_auth_method !== undefined) {
    // Invalid auth method range
    if (
      proxy.custom_auth_method < SOCKS5_CUSTOM_AUTH_START ||
      proxy.custom_auth_method > SOCKS5_CUSTOM_AUTH_END
    ) {
      throw new SocksClientError(
        ERRORS.InvalidSocksClientOptionsCustomAuthRange,
        options,
      );
    }

    // Missing custom_auth_request_handler
    if (
      proxy.custom_auth_request_handler === undefined ||
      typeof proxy.custom_auth_request_handler !== "function"
    ) {
      throw new SocksClientError(
        ERRORS.InvalidSocksClientOptionsCustomAuthOptions,
        options,
      );
    }

    // Missing custom_auth_response_size
    if (proxy.custom_auth_response_size === undefined) {
      throw new SocksClientError(
        ERRORS.InvalidSocksClientOptionsCustomAuthOptions,
        options,
      );
    }

    // Missing/invalid custom_auth_response_handler
    if (
      proxy.custom_auth_response_handler === undefined ||
      typeof proxy.custom_auth_response_handler !== "function"
    ) {
      throw new SocksClientError(
        ERRORS.InvalidSocksClientOptionsCustomAuthOptions,
        options,
      );
    }
  }
}

function isValidSocksRemoteHost(remoteHost: SocksRemoteHost) {
  return (
    remoteHost &&
    typeof remoteHost.host === "string" &&
    typeof remoteHost.port === "number" &&
    remoteHost.port >= 0 &&
    remoteHost.port <= 65535
  );
}

function isValidSocksProxy(proxy: SocksProxy) {
  return (
    proxy &&
    (typeof proxy.host === "string" || typeof proxy.ipaddress === "string") &&
    typeof proxy.port === "number" &&
    proxy.port >= 0 &&
    proxy.port <= 65535 &&
    (proxy.type === 4 || proxy.type === 5)
  );
}

function isValidTimeoutValue(value: number) {
  return typeof value === "number" && value > 0;
}

export function validateSocksClientOptions(
  options: SocksClientOptions,
  acceptedCommands = ["connect", "bind", "associate"],
) {
  // Check SOCKs command option.
  if (!SocksCommand[options.command]) {
    throw new SocksClientError(ERRORS.InvalidSocksCommand, options);
  }

  // Check SocksCommand for acceptable command.
  if (acceptedCommands.indexOf(options.command) === -1) {
    throw new SocksClientError(ERRORS.InvalidSocksCommandForOperation, options);
  }

  // Check destination
  if (!isValidSocksRemoteHost(options.destination)) {
    throw new SocksClientError(
      ERRORS.InvalidSocksClientOptionsDestination,
      options,
    );
  }

  // Check SOCKS proxy to use
  if (!isValidSocksProxy(options.proxy)) {
    throw new SocksClientError(ERRORS.InvalidSocksClientOptionsProxy, options);
  }

  // Validate custom auth (if set)
  validateCustomProxyAuth(options.proxy, options);

  // Check timeout
  if (options.timeout && !isValidTimeoutValue(options.timeout)) {
    throw new SocksClientError(
      ERRORS.InvalidSocksClientOptionsTimeout,
      options,
    );
  }

  // Check existing_socket (if provided)
  if (
    options.existing_socket &&
    !(options.existing_socket instanceof Duplex)
  ) {
    throw new SocksClientError(
      ERRORS.InvalidSocksClientOptionsExistingSocket,
      options,
    );
  }
}

export function validateSocksClientChainOptions(
  options: SocksClientChainOptions,
) {
  // Only connect is supported when chaining.
  if (options.command !== "connect") {
    throw new SocksClientError(ERRORS.InvalidSocksCommandChain, options);
  }

  // Check destination
  if (!isValidSocksRemoteHost(options.destination)) {
    throw new SocksClientError(
      ERRORS.InvalidSocksClientOptionsDestination,
      options,
    );
  }

  // Validate proxies (length)
  if (
    !(
      options.proxies &&
      Array.isArray(options.proxies) &&
      options.proxies.length >= 2
    )
  ) {
    throw new SocksClientError(
      ERRORS.InvalidSocksClientOptionsProxiesLength,
      options,
    );
  }

  // Validate proxies
  options.proxies.forEach((proxy: SocksProxy) => {
    if (!isValidSocksProxy(proxy)) {
      throw new SocksClientError(
        ERRORS.InvalidSocksClientOptionsProxy,
        options,
      );
    }

    // Validate custom auth (if set)
    validateCustomProxyAuth(proxy, options);
  });

  // Check timeout
  if (options.timeout && !isValidTimeoutValue(options.timeout)) {
    throw new SocksClientError(
      ERRORS.InvalidSocksClientOptionsTimeout,
      options,
    );
  }
}
