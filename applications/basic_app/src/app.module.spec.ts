import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { AppService } from './app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mockAppService = {
    getName: (name: string) => {
      return name;
    },
    putName: (name: string, value: string) => {
      return `${name} -> ${value}`;
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppService)
      .useValue(mockAppService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/names/jose')
      .expect(200)
      .expect(mockAppService.getName('jose'));
  });
  it('/ (PUT)', () => {
    return request(app.getHttpServer())
      .put('/names/jose')
      .send({ value: 'luis' })
      .expect(200)
      .expect(mockAppService.putName('jose', 'luis'));
  });

  afterAll(async () => {
    await app.close();
  });
});
