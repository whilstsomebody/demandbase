import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { EVENTS_CLIENT } from './events.constants.js';

@Injectable()
export class EventsPublisherService {
  constructor(@Inject(EVENTS_CLIENT) private readonly client: ClientProxy) {}

  publish<T extends object>(pattern: string, payload: T): void {
    // fire-and-forget: notifications are best-effort, never block the caller's transaction
    this.client.emit(pattern, payload).subscribe({ error: () => undefined });
  }
}
