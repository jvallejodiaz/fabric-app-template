import * as grpc from '@grpc/grpc-js';
import {
  connect,
  Contract,
  Identity,
  signers,
} from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import { Injectable } from '@nestjs/common';
const peerTLS = boolEnvOrDefault('PEER_TLS', true); 
const channelName = envOrDefault('CHANNEL_NAME', 'mychannel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'asset-transfer');
const mspId = envOrDefault('MSP_ID', 'org1MSP');
const credentialsPath = envOrDefault(
  'CREDENTIALS_PATH',
  '../../_cfg/uf/_msp/org1/org1admin/msp/admincerts/cert.pem',
);
const privateKeyPath = envOrDefault(
  'PRIVATE_KEY_PATH',
  '../../_cfg/uf/_msp/org1/org1admin/msp/keystore/cert_sk',
);
const peerHost = envOrDefault('PEER_HOST', 'org1peer-api.127-0-0-1.nip.io');
const peerPort = envOrDefault('PEER_PORT', '8080');

@Injectable()
export class Connection {
  public static contract: Contract;
  public async init() {
    await initFabric();
  }
}

async function initFabric(): Promise<void> {
  // The gRPC client connection should be shared by all Gateway connections to this endpoint.

  const credentials = await fs.readFile(credentialsPath);
  const identity: Identity = { mspId: mspId, credentials: credentials };
  const privateKeyPem = await fs.readFile(privateKeyPath);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signer = signers.newPrivateKeySigner(privateKey);
  let clientTLS: grpc.ChannelCredentials = grpc.credentials.createInsecure();
  
  if (peerTLS) {
    const tlsRootCert = await fs.readFile(process.env["TLS_PEER_CERT"]);
    clientTLS = grpc.credentials.createSsl(tlsRootCert);
  }

  const client = new grpc.Client(
    `${peerHost}:${peerPort}`,
    clientTLS
  );

  const gateway = connect({
    client,
    identity,
    signer,
    // Default timeouts for different gRPC calls
    evaluateOptions: () => {
      return { deadline: Date.now() + 5000 }; // 5 seconds
    },
    endorseOptions: () => {
      return { deadline: Date.now() + 15000 }; // 15 seconds
    },
    submitOptions: () => {
      return { deadline: Date.now() + 5000 }; // 5 seconds
    },
    commitStatusOptions: () => {
      return { deadline: Date.now() + 60000 }; // 1 minute
    },
  });

  try {
    // Get a network instance representing the channel where the smart contract is deployed.
    const network = gateway.getNetwork(channelName);

    // Get the smart contract from the network.
    const contract = network.getContract(chaincodeName);
    Connection.contract = contract;
  } catch (e: any) {
    console.log('sample log');
    console.log(e.message);
  }
}
/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}
function boolEnvOrDefault(key: string, defaultValue: boolean): boolean {
  if (process.env[key].toLocaleLowerCase() === 'false') {
    return false;
  }
  return Boolean(process.env[key]) || defaultValue;
}
