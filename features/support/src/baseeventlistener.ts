/*
 * Copyright 2021 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CloseableAsyncIterable } from "@hyperledger/fabric-gateway";
import { EventListener } from "./eventlistener";

export class BaseEventListener<T> implements EventListener<T> {
  _iterator: AsyncIterator<T>;
  _close: () => void;

  constructor(events: CloseableAsyncIterable<T>) {
    this._iterator = events[Symbol.asyncIterator]();
    this._close = () => events.close();
  }

  async next(): Promise<T> {
    const result = await this._iterator.next();
    return result.value as T;
  }

  close(): void {
    this._close();
  }
}
