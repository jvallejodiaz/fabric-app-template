/*
 * Copyright 2021 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataTable, setWorldConstructor } from "@cucumber/cucumber";
import * as grpc from "@grpc/grpc-js";
import {
  ChaincodeEvent,
  Identity,
  Signer,
  signers,
} from "@hyperledger/fabric-gateway";
import * as crypto from "crypto";
import { promises as fs } from "fs";
import * as path from "path";
import { fixturesDir, getOrgForMsp } from "./fabric";
import { GatewayContext } from "./gatewaycontext";
import { TransactionInvocation } from "./transactioninvocation";
import { assertDefined, Constructor, isInstanceOf } from "./utils";

interface ConnectionInfo {
  readonly url: string;
  readonly serverNameOverride: string;
  readonly tlsRootCertPath: string;
  running: boolean;
}

const peerConnectionInfo: Record<string, ConnectionInfo> = {
  "peer0.org1.example.com": {
    url: "org1peer-api.127-0-0-1.nip.io:8080",
    serverNameOverride: "peer0.org1.example.com",
    tlsRootCertPath:
      fixturesDir +
      "/crypto-material/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
    running: true,
  },
};

async function newIdentity(user: string, _mspId: string): Promise<Identity> {
  const certificate = await readCertificate(user, _mspId);
  return {
    mspId: "org1MSP",
    credentials: certificate,
  };
}

async function readCertificate(user: string, mspId: string): Promise<Buffer> {
  const credentialsPath = getCredentialsPath(user, mspId);
  const certPath = path.join(credentialsPath, "signcerts", "cert.pem");
  return await fs.readFile(certPath);
}

async function newSigner(user: string, mspId: string): Promise<Signer> {
  const privateKey = await readPrivateKey(user, mspId);
  return signers.newPrivateKeySigner(privateKey);
}

async function readPrivateKey(
  user: string,
  mspId: string,
): Promise<crypto.KeyObject> {
  const credentialsPath = getCredentialsPath(user, mspId);
  const keyPath = path.join(credentialsPath, "keystore", "cert_sk");
  const privateKeyPem = await fs.readFile(keyPath);
  return crypto.createPrivateKey(privateKeyPem);
}

function getCredentialsPath(user: string, mspId: string): string {
  const org = getOrgForMsp(mspId);
  return path.join(fixturesDir, "uf", "_msp", `${org}`, `${org}${user}`, "msp");
}

export class CustomWorld {
  _gateways: Record<string, GatewayContext> = {};
  _currentGateway?: GatewayContext;
  _transaction?: TransactionInvocation;
  _lastCommittedBlockNumber = BigInt(0);

  async createGateway(
    name: string,
    user: string,
    mspId: string,
  ): Promise<void> {
    const identity = await newIdentity(user, mspId);
    const signer = await newSigner(user, mspId);
    const gateway = new GatewayContext(identity, signer);
    this._gateways[name] = gateway;
    this._currentGateway = gateway;
  }

  createCheckpointer(): void {
    this.getCurrentGateway().createCheckpointer();
  }

  async createGatewayWithoutSigner(
    name: string,
    user: string,
    mspId: string,
  ): Promise<void> {
    const identity = await newIdentity(user, mspId);
    const gateway = new GatewayContext(identity);
    this._gateways[name] = gateway;
    this._currentGateway = gateway;
  }

  useGateway(name: string): void {
    this._currentGateway = this._gateways[name];
  }

  useNetwork(channelName: string): void {
    this.getCurrentGateway().useNetwork(channelName);
  }

  useContract(contractName: string): void {
    this.getCurrentGateway().useContract(contractName);
  }

  async connect(address: string): Promise<void> {
    // address is the name of the peer, lookup the connection info
    const peer = peerConnectionInfo[address];
    //const tlsRootCert = await fs.readFile(peer.tlsRootCertPath);
    //const credentials = grpc.credentials.createSsl(tlsRootCert);
    //let grpcOptions: Record<string, unknown> = {};
    // if (peer.serverNameOverride) {
    //   grpcOptions = {
    //     "grpc.ssl_target_name_override": peer.serverNameOverride,
    //   };
    // }
    // FIXME: use the credentials and grpcOptions
    const client = new grpc.Client(peer.url, grpc.credentials.createInsecure());
    this.getCurrentGateway().connect(client);
  }

  prepareTransaction(action: string, transactionName: string): void {
    this._transaction = this.getCurrentGateway().newTransaction(
      action,
      transactionName,
    );
  }

  setArguments(jsonArgs: string): void {
    const args = JSON.parse(jsonArgs) as string[];
    this.getTransaction().options.arguments = args;
  }

  setTransientData(dataTable: DataTable): void {
    this.getTransaction().options.transientData = dataTable.rowsHash();
  }

  setEndorsingOrgs(jsonOrgs: string): void {
    const orgs = JSON.parse(jsonOrgs) as string[];
    this.getTransaction().options.endorsingOrganizations = orgs;
  }

  async listenForChaincodeEvents(
    listenerName: string,
    chaincodeName: string,
  ): Promise<void> {
    await this.getCurrentGateway().listenForChaincodeEvents(
      listenerName,
      chaincodeName,
    );
  }

  async listenForChaincodeEventsUsingCheckpointer(
    listenerName: string,
    chaincodeName: string,
  ): Promise<void> {
    await this.getCurrentGateway().listenForChaincodeEventsUsingCheckpointer(
      listenerName,
      chaincodeName,
      { checkpoint: this.getCurrentGateway().getCheckpointer() },
    );
  }

  async replayChaincodeEvents(
    listenerName: string,
    chaincodeName: string,
    startBlock: bigint,
  ): Promise<void> {
    await this.getCurrentGateway().listenForChaincodeEvents(
      listenerName,
      chaincodeName,
      { startBlock },
    );
  }

  async nextChaincodeEvent(listenerName: string): Promise<ChaincodeEvent> {
    return await this.getCurrentGateway().nextChaincodeEvent(listenerName);
  }

  async listenForBlockEvents(listenerName: string): Promise<void> {
    await this.getCurrentGateway().listenForBlockEvents(listenerName);
  }

  async listenForBlockEventsUsingCheckpointer(
    listenerName: string,
  ): Promise<void> {
    await this.getCurrentGateway().listenForBlockEventsUsingCheckpointer(
      listenerName,
      { checkpoint: this.getCurrentGateway().getCheckpointer() },
    );
  }

  async listenForFilteredBlockEventsUsingCheckpointer(
    listenerName: string,
  ): Promise<void> {
    await this.getCurrentGateway().listenForFilteredBlockEventsUsingCheckpointer(
      listenerName,
      { checkpoint: this.getCurrentGateway().getCheckpointer() },
    );
  }

  async listenForBlockAndPrivateDataEventsUsingCheckpointer(
    listenerName: string,
  ): Promise<void> {
    await this.getCurrentGateway().listenForBlockAndPrivateDataEventsUsingCheckpointer(
      listenerName,
      { checkpoint: this.getCurrentGateway().getCheckpointer() },
    );
  }

  async replayBlockEvents(
    listenerName: string,
    startBlock: bigint,
  ): Promise<void> {
    await this.getCurrentGateway().listenForBlockEvents(listenerName, {
      startBlock,
    });
  }

  async nextBlockEvent(listenerName: string): Promise<unknown> {
    return await this.getCurrentGateway().nextBlockEvent(listenerName);
  }

  async listenForFilteredBlockEvents(listenerName: string): Promise<void> {
    await this.getCurrentGateway().listenForFilteredBlockEvents(listenerName);
  }

  async replayFilteredBlockEvents(
    listenerName: string,
    startBlock: bigint,
  ): Promise<void> {
    await this.getCurrentGateway().listenForFilteredBlockEvents(listenerName, {
      startBlock,
    });
  }

  async nextFilteredBlockEvent(listenerName: string): Promise<unknown> {
    return await this.getCurrentGateway().nextFilteredBlockEvent(listenerName);
  }

  async listenForBlockAndPrivateDataEvents(
    listenerName: string,
  ): Promise<void> {
    await this.getCurrentGateway().listenForBlockAndPrivateDataEvents(
      listenerName,
    );
  }

  async replayBlockAndPrivateDataEvents(
    listenerName: string,
    startBlock: bigint,
  ): Promise<void> {
    await this.getCurrentGateway().listenForBlockAndPrivateDataEvents(
      listenerName,
      { startBlock },
    );
  }

  async nextBlockAndPrivateDataEvent(listenerName: string): Promise<unknown> {
    return await this.getCurrentGateway().nextBlockAndPrivateDataEvent(
      listenerName,
    );
  }

  async setOfflineSigner(user: string, mspId: string): Promise<void> {
    const signer = await newSigner(user, mspId);
    this.getTransaction().setOfflineSigner(signer);
  }

  async invokeSuccessfulTransaction(): Promise<void> {
    await this.invokeTransaction();
    this.getTransaction().getResult();
  }

  private async invokeTransaction(): Promise<void> {
    const transaction = this.getTransaction();
    await transaction.invokeTransaction();
    this._lastCommittedBlockNumber = transaction.getBlockNumber();
  }

  async assertTransactionFails(): Promise<void> {
    await this.invokeTransaction();
    this.getError();
  }

  getResult(): string {
    return this.getTransaction().getResult();
  }

  getError(): Error {
    return this.getTransaction().getError();
  }

  getErrorOfType<T extends Error>(type: Constructor<T>): T {
    const err = this.getTransaction().getError();

    if (!isInstanceOf(err, type)) {
      throw new TypeError(`Error is not a ${String(type)}: ${String(err)}`);
    }

    return err;
  }

  getLastCommittedBlockNumber(): bigint {
    return this._lastCommittedBlockNumber;
  }

  close(): void {
    for (const context of Object.values(this._gateways)) {
      context.close();
    }

    this._gateways = {};
    this._currentGateway = undefined;
  }

  closeChaincodeEvents(listenerName: string): void {
    this.getCurrentGateway().closeChaincodeEvents(listenerName);
  }

  closeBlockEvents(listenerName: string): void {
    this.getCurrentGateway().closeBlockEvents(listenerName);
  }

  closeFilteredBlockEvents(listenerName: string): void {
    this.getCurrentGateway().closeFilteredBlockEvents(listenerName);
  }

  closeBlockAndPrivateDataEvents(listenerName: string): void {
    this.getCurrentGateway().closeBlockAndPrivateDataEvents(listenerName);
  }
  private getCurrentGateway(): GatewayContext {
    return assertDefined(this._currentGateway, "currentGateway");
  }

  private getTransaction(): TransactionInvocation {
    return assertDefined(this._transaction, "transaction");
  }
}

setWorldConstructor(CustomWorld);
