import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { Connection } from './blockchain.provider';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        
      providers: [AppService, Connection],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});



