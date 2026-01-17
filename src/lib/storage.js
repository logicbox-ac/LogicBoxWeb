import { ScratchStorage } from 'scratch-storage';

import defaultProject from './default-project';

/**
 * Simple fetch tool that bypasses the Web Worker which can cause hanging promises.
 * This implements the same interface as FetchTool from scratch-storage.
 */
class SimpleFetchTool {
    get isGetSupported() {
        return true;
    }

    get isSendSupported() {
        return true;
    }

    get({ url, ...options }) {
        return fetch(url, Object.assign({ method: 'GET' }, options))
            .then(result => {
                if (result.ok) return result.arrayBuffer().then(b => new Uint8Array(b));
                if (result.status === 404) return null;
                return Promise.reject(result.status);
            });
    }

    send({ url, withCredentials = false, ...options }) {
        return fetch(url, Object.assign({
            credentials: withCredentials ? 'include' : 'omit'
        }, options))
            .then(response => {
                if (response.ok) return response.text();
                return Promise.reject(response.status);
            });
    }
}

/**
 * Wrapper for ScratchStorage which adds default web sources.
 * @todo make this more configurable
 */
class Storage extends ScratchStorage {
    constructor() {
        super();

        // IMPORTANT: Override the webHelper's assetTool to use SimpleFetchTool directly
        // The default ProxyTool uses a Web Worker (FetchWorkerTool) which can cause
        // promises to hang indefinitely in some environments. Using SimpleFetchTool
        // directly uses the browser's native fetch API.
        const fetchTool = new SimpleFetchTool();
        this.webHelper.assetTool = fetchTool;
        this.webHelper.projectTool = fetchTool;
        console.log('[STORAGE] Overrode webHelper tools to use SimpleFetchTool directly (bypassing Web Worker)');

        this.cacheDefaultProject();
    }
    addOfficialScratchWebStores() {
        this.addWebStore(
            [this.AssetType.Project],
            this.getProjectGetConfig.bind(this),
            this.getProjectCreateConfig.bind(this),
            this.getProjectUpdateConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.ImageVector, this.AssetType.ImageBitmap, this.AssetType.Sound],
            this.getAssetGetConfig.bind(this),
            // We set both the create and update configs to the same method because
            // storage assumes it should update if there is an assetId, but the
            // asset store uses the assetId as part of the create URI.
            this.getAssetCreateConfig.bind(this),
            this.getAssetCreateConfig.bind(this)
        );
        this.addWebStore(
            [this.AssetType.Sound],
            asset => `static/extension-assets/scratch3_music/${asset.assetId}.${asset.dataFormat}`
        );
    }
    setProjectHost(projectHost) {
        this.projectHost = projectHost;
    }
    setProjectToken(projectToken) {
        this.projectToken = projectToken;
    }
    getProjectGetConfig(projectAsset) {
        const path = `${this.projectHost}/${projectAsset.assetId}`;
        const qs = this.projectToken ? `?token=${this.projectToken}` : '';
        return path + qs;
    }
    getProjectCreateConfig() {
        return {
            url: `${this.projectHost}/`,
            withCredentials: true
        };
    }
    getProjectUpdateConfig(projectAsset) {
        return {
            url: `${this.projectHost}/${projectAsset.assetId}`,
            withCredentials: true
        };
    }
    setAssetHost(assetHost) {
        this.assetHost = assetHost;
    }
    getAssetGetConfig(asset) {
        const url = `${this.assetHost}/internalapi/asset/${asset.assetId}.${asset.dataFormat}/get/`;
        console.log('[STORAGE] getAssetGetConfig called:', {
            assetHost: this.assetHost,
            assetId: asset.assetId,
            dataFormat: asset.dataFormat,
            constructedUrl: url
        });
        return url;
    }
    getAssetCreateConfig(asset) {
        return {
            // There is no such thing as updating assets, but storage assumes it
            // should update if there is an assetId, and the asset store uses the
            // assetId as part of the create URI. So, force the method to POST.
            // Then when storage finds this config to use for the "update", still POSTs
            method: 'post',
            url: `${this.assetHost}/${asset.assetId}.${asset.dataFormat}`,
            withCredentials: true
        };
    }
    setTranslatorFunction(translator) {
        this.translator = translator;
        this.cacheDefaultProject();
    }
    cacheDefaultProject() {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => this.builtinHelper._store(
            this.AssetType[asset.assetType],
            this.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
}

const storage = new Storage();

export default storage;
