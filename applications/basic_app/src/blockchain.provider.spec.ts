import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from './blockchain.provider';

describe('Blockchain Connection provider', () => {
  let provider: Connection;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        
      providers: [ Connection],
    }).compile();

    provider = module.get<Connection>(Connection);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});



