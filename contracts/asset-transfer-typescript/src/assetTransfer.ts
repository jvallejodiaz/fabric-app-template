/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { X509Certificate } from 'crypto';
import { Context, Contract, Info, Param, Returns, Transaction } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic'; // Deterministic JSON.stringify()
import sortKeysRecursive from 'sort-keys-recursive';
import { TextDecoder } from 'util';
import { Asset } from './asset';

const utf8Decoder = new TextDecoder();

@Info({title: 'AssetTransfer', description: 'Smart contract for trading assets'})
export class AssetTransferContract extends Contract {
    /**
     * CreateAsset issues a new asset to the world state with given details.
     */
    @Transaction()
    @Param('assetObj', 'Asset', 'Part formed JSON of Asset')
    async CreateAsset(ctx: Context, state: Asset): Promise<void> {
        state.Owner = toJSON(clientIdentifier(ctx, state.Owner));
        const asset = Asset.newInstance(state);

        const exists = await this.AssetExists(ctx, asset.ID);
        if (exists) {
            throw new Error(`The asset ${asset.ID} already exists`);
        }

        const assetBytes = marshal(asset);
        await ctx.stub.putState(asset.ID, assetBytes);
        ctx.stub.setEvent('CreateAsset', assetBytes);
    }

    /**
     * ReadAsset returns an existing asset stored in the world state.
     */
    @Transaction(false)
    @Returns('Asset')
    async ReadAsset(ctx: Context, id: string): Promise<Asset> {
        const existingAssetBytes = await this.readAsset(ctx, id);
        const existingAsset = Asset.newInstance(unmarshal(existingAssetBytes));

        return existingAsset;
    }

    async readAsset(ctx: Context, id: string): Promise<Uint8Array> {
        const assetBytes = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetBytes || assetBytes.length === 0) {
            throw new Error(`Sorry, asset ${id} has not been created`);
        }
        return assetBytes;
    }

    /**
     * DeleteAsset deletes an asset from the world state.
     */
    @Transaction()
    async DeleteAsset(ctx: Context, id: string): Promise<void> {
        const assetBytes = await this.readAsset(ctx, id); // Throws if asset does not exist
        const asset = Asset.newInstance(unmarshal(assetBytes));

        if (!hasWritePermission(ctx, asset)) {
            throw new Error('Only owner can delete assets');
        }

        await ctx.stub.deleteState(id);

        ctx.stub.setEvent('DeletaAsset', assetBytes);
    }

    /**
     * AssetExists returns true when asset with the specified ID exists in world state; otherwise false.
     */
    @Transaction(false)
    @Returns('boolean')
    async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJson = await ctx.stub.getState(id);
        return assetJson?.length > 0;
    }

}

function unmarshal(bytes: Uint8Array | string): object {
    const json = typeof bytes === 'string' ? bytes : utf8Decoder.decode(bytes);
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object') {
        throw new Error(`Invalid JSON type (${typeof parsed}): ${json}`);
    }

    return parsed;
}

function marshal(o: object): Buffer {
    return Buffer.from(toJSON(o));
}

function toJSON(o: object): string {
    // Insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    return stringify(sortKeysRecursive(o));
}

interface OwnerIdentifier {
    org: string;
    user: string;
}

function hasWritePermission(ctx: Context, asset: Asset): boolean {
    const clientId = clientIdentifier(ctx);
    const ownerId = unmarshal(asset.Owner) as OwnerIdentifier;
    return clientId.org === ownerId.org;
}

function clientIdentifier(ctx: Context, user?: string): OwnerIdentifier {
    return {
        org: ctx.clientIdentity.getMSPID(),
        user: user ?? clientCommonName(ctx),
    };
}

function clientCommonName(ctx: Context): string {
    const clientCert = new X509Certificate(ctx.clientIdentity.getIDBytes());
    const matches = clientCert.subject.match(/^CN=(.*)$/m); // [0] Matching string; [1] capture group
    if (matches?.length !== 2) {
        throw new Error(`Unable to identify client identity common name: ${clientCert.subject}`);
    }

    return matches[1];
}