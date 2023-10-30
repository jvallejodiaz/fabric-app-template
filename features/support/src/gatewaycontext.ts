/*
 * Copyright 2021 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as grpc from "@grpc/grpc-js";
import {
  BlockEventsOptions,
  ChaincodeEvent,
  ChaincodeEventsOptions,
  Checkpointer,
  checkpointers,
  connect,
  ConnectOptions,
  Contract,
  Gateway,
  Identity,
  Network,
  Signer,
} from "@hyperledger/fabric-gateway";
import { CheckpointEventListener } from "./checkpointeventlistener";
import { BaseEventListener } from "./baseeventlistener";
import { TransactionInvocation } from "./transactioninvocation";
import { assertDefined } from "./utils";
import { common, peer } from "@hyperledger/fabric-protos";
import { EventListener } from "./eventlistener";

export class GatewayContext {
  readonly _identity: Identity;
  readonly _signer?: Signer;
  readonly _signerClose?: () => void;
  _client?: grpc.Client;
  _gateway?: Gateway;
  _network?: Network;
  _contract?: Contract;
  _checkpointer?: Checkpointer;
  readonly _chaincodeEventListeners: Map<
    string,
    EventListener<ChaincodeEvent>
  > = new Map();
  readonly _blockEventListeners: Map<string, EventListener<common.Block>> =
    new Map();
  readonly _filteredBlockEventListeners: Map<
    string,
    EventListener<peer.FilteredBlock>
  > = new Map();
  readonly _blockAndPrivateDataEventListeners: Map<
    string,
    EventListener<peer.BlockAndPrivateData>
  > = new Map();

  constructor(identity: Identity, signer?: Signer, signerClose?: () => void) {
    this._identity = identity;
    this._signer = signer;
    this._signerClose = signerClose;
  }

  connect(client: grpc.Client): void {
    this._client = client;
    const options: ConnectOptions = {
      signer: this._signer,
      identity: this._identity,
      client,
    };
    this._gateway = connect(options);
  }

  useNetwork(channelName: string): void {
    this._network = this.getGateway().getNetwork(channelName);
    this._contract = undefined;
  }

  useContract(contractName: string): void {
    this._contract = this.getNetwork().getContract(contractName);
  }

  newTransaction(
    action: string,
    transactionName: string,
  ): TransactionInvocation {
    return new TransactionInvocation(
      action,
      this.getGateway(),
      this.getContract(),
      transactionName,
    );
  }

  createCheckpointer(): void {
    this._checkpointer = checkpointers.inMemory();
  }

  getCheckpointer(): Checkpointer {
    return assertDefined(this._checkpointer, "checkpointer");
  }

  async listenForChaincodeEvents(
    listenerName: string,
    chaincodeName: string,
    options?: ChaincodeEventsOptions,
  ): Promise<void> {
    this.closeChaincodeEvents(listenerName);
    const events = await this.getNetwork().getChaincodeEvents(
      chaincodeName,
      options,
    );
    const listener = new BaseEventListener(events);
    this._chaincodeEventListeners.set(listenerName, listener);
  }

  async listenForChaincodeEventsUsingCheckpointer(
    listenerName: string,
    chaincodeName: string,
    options?: ChaincodeEventsOptions,
  ): Promise<void> {
    this.closeChaincodeEvents(listenerName);
    const events = await this.getNetwork().getChaincodeEvents(
      chaincodeName,
      options,
    );
    const listener = new CheckpointEventListener<ChaincodeEvent>(
      events,
      async (event: ChaincodeEvent): Promise<void> => {
        await this.getCheckpointer().checkpointChaincodeEvent(event);
      },
    );
    this._chaincodeEventListeners.set(listenerName, listener);
  }

  async nextChaincodeEvent(listenerName: string): Promise<ChaincodeEvent> {
    const event: ChaincodeEvent =
      await this.getChaincodeEventListener(listenerName).next();
    return event;
  }

  async listenForBlockEvents(
    listenerName: string,
    options?: BlockEventsOptions,
  ): Promise<void> {
    this.closeBlockEvents(listenerName);
    const events = await this.getNetwork().getBlockEvents(options);
    const listener = new BaseEventListener<common.Block>(events);
    this._blockEventListeners.set(listenerName, listener);
  }

  async listenForBlockEventsUsingCheckpointer(
    listenerName: string,
    options?: BlockEventsOptions,
  ): Promise<void> {
    this.closeBlockEvents(listenerName);
    const events = await this.getNetwork().getBlockEvents(options);
    const listener = new CheckpointEventListener<common.Block>(
      events,
      async (event: common.Block): Promise<void> => {
        const header = assertDefined(event.getHeader(), "block header");
        const blockNumber = header.getNumber();
        await this.getCheckpointer().checkpointBlock(BigInt(blockNumber));
      },
    );
    this._blockEventListeners.set(listenerName, listener);
  }

  async nextBlockEvent(listenerName: string): Promise<unknown> {
    return await this.getBlockEventListener(listenerName).next();
  }

  async listenForFilteredBlockEvents(
    listenerName: string,
    options?: BlockEventsOptions,
  ): Promise<void> {
    this.closeFilteredBlockEvents(listenerName);
    const events = await this.getNetwork().getFilteredBlockEvents(options);
    const listener = new BaseEventListener<peer.FilteredBlock>(events);
    this._filteredBlockEventListeners.set(listenerName, listener);
  }

  async listenForFilteredBlockEventsUsingCheckpointer(
    listenerName: string,
    options?: BlockEventsOptions,
  ): Promise<void> {
    this.closeFilteredBlockEvents(listenerName);
    const events = await this.getNetwork().getFilteredBlockEvents(options);
    const listener = new CheckpointEventListener<peer.FilteredBlock>(
      events,
      async (event: peer.FilteredBlock): Promise<void> => {
        const blockNumber = event.getNumber();
        await this.getCheckpointer().checkpointBlock(BigInt(blockNumber));
      },
    );
    this._filteredBlockEventListeners.set(listenerName, listener);
  }

  async nextFilteredBlockEvent(listenerName: string): Promise<unknown> {
    const event = await this.getFilteredBlockEventListener(listenerName).next();
    return event;
  }
  async listenForBlockAndPrivateDataEvents(
    listenerName: string,
    options?: BlockEventsOptions,
  ): Promise<void> {
    this.closeBlockAndPrivateDataEvents(listenerName);
    const events =
      await this.getNetwork().getBlockAndPrivateDataEvents(options);
    const listener = new BaseEventListener<peer.BlockAndPrivateData>(events);
    this._blockAndPrivateDataEventListeners.set(listenerName, listener);
  }

  async listenForBlockAndPrivateDataEventsUsingCheckpointer(
    listenerName: string,
    options?: BlockEventsOptions,
  ): Promise<void> {
    this.closeBlockAndPrivateDataEvents(listenerName);
    const events =
      await this.getNetwork().getBlockAndPrivateDataEvents(options);
    const listener = new CheckpointEventListener<peer.BlockAndPrivateData>(
      events,
      async (event: peer.BlockAndPrivateData): Promise<void> => {
        const block = assertDefined(event.getBlock(), "block");
        const header = assertDefined(block.getHeader(), "block header");
        const blockNumber = header.getNumber();
        await this.getCheckpointer().checkpointBlock(BigInt(blockNumber));
      },
    );
    this._blockAndPrivateDataEventListeners.set(listenerName, listener);
  }

  async nextBlockAndPrivateDataEvent(listenerName: string): Promise<unknown> {
    return await this.getBlockAndPrivateDataEventListener(listenerName).next();
  }

  close(): void {
    this._chaincodeEventListeners.forEach((listener) => listener.close());
    this._blockEventListeners.forEach((listener) => listener.close());
    this._filteredBlockEventListeners.forEach((listener) => listener.close());
    this._blockAndPrivateDataEventListeners.forEach((listener) =>
      listener.close(),
    );
    this._gateway?.close();
    this._client?.close();
    if (this._signerClose) {
      this._signerClose();
    }
  }

  closeChaincodeEvents(listenerName: string): void {
    this._chaincodeEventListeners.get(listenerName)?.close();
    this._chaincodeEventListeners.delete(listenerName);
  }

  closeBlockEvents(listenerName: string): void {
    this._blockEventListeners.get(listenerName)?.close();
    this._blockEventListeners.delete(listenerName);
  }

  closeFilteredBlockEvents(listenerName: string): void {
    this._filteredBlockEventListeners.get(listenerName)?.close();
    this._filteredBlockEventListeners.delete(listenerName);
  }

  closeBlockAndPrivateDataEvents(listenerName: string): void {
    this._blockAndPrivateDataEventListeners.get(listenerName)?.close();
    this._blockAndPrivateDataEventListeners.delete(listenerName);
  }
  private getGateway(): Gateway {
    return assertDefined(this._gateway, "gateway");
  }

  private getNetwork(): Network {
    return assertDefined(this._network, "network");
  }

  private getContract(): Contract {
    return assertDefined(this._contract, "contract");
  }

  private getChaincodeEventListener(
    listenerName: string,
  ): EventListener<ChaincodeEvent> {
    return assertDefined(
      this._chaincodeEventListeners.get(listenerName),
      `chaincodeEventListener: ${listenerName}`,
    );
  }

  private getBlockEventListener(listenerName: string): EventListener<unknown> {
    return assertDefined(
      this._blockEventListeners.get(listenerName),
      `blockEventListener: ${listenerName}`,
    );
  }

  private getFilteredBlockEventListener(
    listenerName: string,
  ): EventListener<unknown> {
    return assertDefined(
      this._filteredBlockEventListeners.get(listenerName),
      `filteredBlockEventListener: ${listenerName}`,
    );
  }

  private getBlockAndPrivateDataEventListener(
    listenerName: string,
  ): EventListener<unknown> {
    return assertDefined(
      this._blockAndPrivateDataEventListeners.get(listenerName),
      `blockAndPrivateDataEventListener: ${listenerName}`,
    );
  }
}
