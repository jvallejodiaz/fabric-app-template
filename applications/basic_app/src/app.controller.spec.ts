import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Connection } from './blockchain.provider';

describe('AppController', () => {
  let appController: AppController;
  let mockAppService = {
    getName: (name: string) => {
      return name;
    },
    putName: (name: string, value: string) => {
      return `${name} -> ${value}`;
    },
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, Connection],
    })
      .overrideProvider(AppService)
      .useValue(mockAppService)
      .compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('Should call the getName from service', async () => {
      expect(await appController.getName('cat')).toBe('cat');
    });
    it('Should call the putName from service', async () => {
      expect(await appController.putName('cat', { value: 'wild' })).toBe(
        'cat -> wild',
      );
    });
  });
});
