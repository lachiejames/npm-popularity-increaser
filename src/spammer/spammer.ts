import { GaxiosError, GaxiosResponse, request } from "gaxios";

import { logComplete, logDownload, logError } from "../cli/logger";
import { Config } from "../models/config.model";
import { NpmjsResponse } from "../models/npmjs-response.model";

const sleep = async (milliseconds: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export const queryNpms = async (name: string): Promise<NpmjsResponse> => {
    let npmsResponse: GaxiosResponse<NpmjsResponse> | undefined;

    await request<NpmjsResponse>({
        baseUrl: "https://api.npms.io",
        url: `/v2/package/${name}`,
        method: "GET",
    })
        .then((response: GaxiosResponse<NpmjsResponse>) => (npmsResponse = response))
        .catch((response: GaxiosError<NpmjsResponse>) => {
            throw Error(`Failed to download ${response.config.url}\n${response.message}`);
        });

    return (npmsResponse as GaxiosResponse<NpmjsResponse>).data;
};

export const downloadPackage = async (name: string, version: string): Promise<void> => {
    await request<unknown>({
        baseUrl: "https://registry.yarnpkg.com",
        url: `/${name}/-/${name}-${version}.tgz`,
        method: "GET",
    }).catch((response: GaxiosError<unknown>) => {
        throw Error(`Failed to download ${response.config.url}\n${response.message}`);
    });
};

export const run = async (config: Config): Promise<void> => {
    try {
        const npmsResponse = await queryNpms(config.packageName);
        const version = npmsResponse.collected.metadata.version;

        for (let i = 0; i < config.numDownloads; i++) {
            await downloadPackage(config.packageName, version);
            await sleep(config.timeBetweenDownloads);

            logDownload(config, i + 1);
        }
        logComplete(config);
    } catch (e) {
        logError(e);
    }
};
