import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionOptions, JobsOptions, Queue, QueueEvents, Worker } from 'bullmq';
import { QUEUE_NAMES, QueueName } from './bullmq.constants';

@Injectable()
export class BullMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullMqService.name);
  private readonly queues = new Map<QueueName, Queue>();
  private readonly queueEvents = new Map<QueueName, QueueEvents>();
  private readonly workers = new Map<QueueName, Worker>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const connection = this.getConnection();

    const defaultQueue = new Queue(QUEUE_NAMES.DEFAULT, { connection });
    const defaultEvents = new QueueEvents(QUEUE_NAMES.DEFAULT, { connection });

    defaultEvents.on('completed', ({ jobId }) => {
      this.logger.debug(`Job completed: ${String(jobId)}`);
    });

    defaultEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.warn(`Job failed: ${String(jobId)} - ${failedReason}`);
    });

    // Boilerplate worker to keep queue wiring ready. Replace with domain handlers.
    const defaultWorker = new Worker(
      QUEUE_NAMES.DEFAULT,
      async (job) => {
        this.logger.log(`Processing job ${job.name}`);
        return { ok: true, payload: job.data };
      },
      { connection },
    );

    this.queues.set(QUEUE_NAMES.DEFAULT, defaultQueue);
    this.queueEvents.set(QUEUE_NAMES.DEFAULT, defaultEvents);
    this.workers.set(QUEUE_NAMES.DEFAULT, defaultWorker);
  }

  async addJob<T>(
    queueName: QueueName,
    jobName: string,
    payload: T,
    options?: JobsOptions,
  ) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not initialized: ${queueName}`);
    }

    return queue.add(jobName, payload, options);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      ...Array.from(this.workers.values()).map((worker) => worker.close()),
      ...Array.from(this.queueEvents.values()).map((events) => events.close()),
      ...Array.from(this.queues.values()).map((queue) => queue.close()),
    ]);
  }

  private getConnection(): ConnectionOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      const parsed = new URL(redisUrl);
      const dbFromPath = parsed.pathname ? Number(parsed.pathname.replace('/', '')) : 0;
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        db: Number.isNaN(dbFromPath) ? 0 : dbFromPath,
        maxRetriesPerRequest: null,
      };
    }

    return {
      host: this.configService.get<string>('REDIS_HOST') || '127.0.0.1',
      port: Number(this.configService.get<string>('REDIS_PORT') || 6379),
      username: this.configService.get<string>('REDIS_USERNAME') || undefined,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: Number(this.configService.get<string>('REDIS_DB') || 0),
      maxRetriesPerRequest: null,
    };
  }
}



