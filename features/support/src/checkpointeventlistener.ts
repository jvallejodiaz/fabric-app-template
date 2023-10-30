/*
 * Copyright 2021 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CloseableAsyncIterable } from "@hyperledger/fabric-gateway";
import { BaseEventListener } from "./baseeventlistener";
import { EventListener } from "./eventlistener";

export class CheckpointEventListener<T> implements EventListener<T> {
  readonly _checkpoint: (event: T) => Promise<void>;
  _eventListener: BaseEventListener<T>;

  constructor(
    events: CloseableAsyncIterable<T>,
    checkpoint: (event: T) => Promise<void>,
  ) {
    this._eventListener = new BaseEventListener<T>(events);
    this._checkpoint = checkpoint;
  }

  async next(): Promise<T> {
    const event = await this._eventListener.next();
    await this._checkpoint(event);
    return event;
  }

  close(): void {
    this._eventListener.close();
  }
}
