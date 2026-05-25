import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('devuelve estado ok con timestamp ISO', () => {
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });
});
