/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

@Info({title: 'Basic', description: 'Basic Smart contract '})
export class BasicContract extends Contract {
    /**
     * Echo return argument value.
     */
    @Transaction(true)
    @Returns('string')
    async Echo(ctx: Context, text: string): Promise<string> {
        return text;
    } 
}