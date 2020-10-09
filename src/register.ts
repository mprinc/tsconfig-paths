import { createMatchPath } from "./match-path-sync";
import { configLoader, ExplicitParams } from "./config-loader";
import { options } from "./options";

import CircularJSON from "circular-json";

const DEBUG_LOW = 1;
const DEBUG_MEDIUM = 2;
const DEBUG_HIGH = 3;
const DEBUG_LEVEL = DEBUG_LOW;

function debug(debugLevel: number, msg: string) {
	 if (debugLevel >= DEBUG_LEVEL) {
        console.log(msg);
    }
}

debug(DEBUG_HIGH, "[tsconfig-paths:register] initializing ...");

const noOp = (): void => void 0;

function getCoreModules(builtinModules: string[] | undefined): { [key: string]: boolean } {
    builtinModules = builtinModules || ["assert", "buffer", "child_process", "cluster", "crypto", "dgram", "dns", "domain", "events", "fs", "http", "https", "net", "os", "path", "punycode", "querystring", "readline", "stream", "string_decoder", "tls", "tty", "url", "util", "v8", "vm", "zlib"];

    const coreModules: { [key: string]: boolean } = {};
    for (const module of builtinModules) {
        coreModules[module] = true;
    }

    return coreModules;
}

/**
 * Installs a custom module load function that can adhere to paths in tsconfig.
 * Returns a function to undo paths registration.
 */
export function register(explicitParams: ExplicitParams): () => void {
    debug(DEBUG_HIGH, "[tsconfig-paths:register] registering ...");
    const configLoaderResult = configLoader({
        cwd: options.cwd,
        explicitParams,
    });

    if (configLoaderResult.resultType === "failed") {
        console.warn(`${configLoaderResult.message}. tsconfig-paths will be skipped`);

        return noOp;
    }

    debug(DEBUG_HIGH, `[tsconfig-paths:register] configLoaderResult.absoluteBaseUrl: ${configLoaderResult.absoluteBaseUrl}, configLoaderResult.paths: ${JSON.stringify(configLoaderResult.paths, null, 4)}`);
    const matchPath = createMatchPath(configLoaderResult.absoluteBaseUrl, configLoaderResult.paths, configLoaderResult.mainFields, configLoaderResult.addMatchAll);

    // Patch node's module loading
    // tslint:disable-next-line:no-require-imports variable-name
    const Module = require("module");
    const originalResolveFilename = Module._resolveFilename;
    const coreModules = getCoreModules(Module.builtinModules);
    // tslint:disable-next-line:no-any
    Module._resolveFilename = function (request: string, _parent: any): string {
        const _parentReduced = {
            id: _parent && _parent.id,
            path: _parent && _parent.path,
        };
        debug(DEBUG_MEDIUM, `[tsconfig-paths:register] resolving request: ${request}, _parent: ${CircularJSON.stringify(_parentReduced, null, 4)}`);
        const isCoreModule = coreModules.hasOwnProperty(request);
        debug(DEBUG_LOW, `\t isCoreModule: ${isCoreModule}`);
        if (!isCoreModule) {
            const found = matchPath(request);
            debug(DEBUG_LOW, `\t found: ${found}`);
            if (found) {
                const modifiedArguments = [found, ...[].slice.call(arguments, 1)]; // Passes all arguments. Even those that is not specified above.
                // tslint:disable-next-line:no-invalid-this
                const resolution = originalResolveFilename.apply(this, modifiedArguments);
                debug(DEBUG_LOW, `\t resolution: ${resolution}`);
                return resolution;
            }
        }
        // tslint:disable-next-line:no-invalid-this
        const resolution = originalResolveFilename.apply(this, arguments);
        debug(DEBUG_LOW, `\t resolution: ${resolution}`);
        return resolution;
    };

    debug(DEBUG_HIGH, "[tsconfig-paths:register] initializing registered ...");
    return () => {
        // Return node's module loading to original state.
        Module._resolveFilename = originalResolveFilename;
    };
}
