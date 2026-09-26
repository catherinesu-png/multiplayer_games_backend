import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('should return the platform hello string', () => {
    const controller = new AppController(new AppService({} as never));
    expect(controller.getHello()).toBe('Game Platform API ready');
  });
});
