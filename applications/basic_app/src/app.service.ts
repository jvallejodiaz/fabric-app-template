import { Injectable } from '@nestjs/common';
import { Connection } from './blockchain.provider';
const utf8Decoder = new TextDecoder();

@Injectable()
export class AppService {
  constructor(private readonly blockchainProvider: Connection) {}

  async putName(name: string, value: string): Promise<string> {
    await this.blockchainProvider.init();
    const resultBytes = Connection.contract.submitTransaction(
      'PutName',
      name,
      value,
    );
    const resultJson = utf8Decoder.decode(await resultBytes);
    return resultJson;
  }
  async getName(name: string): Promise<string> {
    await this.blockchainProvider.init();
    const resultBytes = Connection.contract.submitTransaction('GetName', name);
    const resultJson = utf8Decoder.decode(await resultBytes);
    return resultJson;
  }
}
