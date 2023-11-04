/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    Context,
    Contract,
    Info,
    Returns,
    Transaction,
} from 'fabric-contract-api';

@Info({ title: 'Basic', description: 'Basic Smart contract ' })
export class BasicContract extends Contract {
    @Transaction(true)
    @Returns('string')
    async PutName(ctx: Context, arg1: string, arg2: string): Promise<string> {
        await ctx.stub.putState(arg1, Buffer.from(arg2));
        return arg2;
    }

    @Transaction(false)
    @Returns('string')
    async GetName(ctx: Context, name: string): Promise<string> {
        const nameBytes = await ctx.stub.getState(name);
        return nameBytes.toString();
    }
}
