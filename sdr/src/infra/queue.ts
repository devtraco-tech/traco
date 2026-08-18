import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";
import { Redis } from "ioredis";
import type { FlowPatch } from "../domain/commercial-flow.js";
import type { EnrollmentData, HandoffReason } from "../domain/types.js";
import type { SupportedLanguage } from "../domain/language.js";

export const SDR_QUEUE_NAME = "sdr-conversations";
export const KOMMO_RETRY_QUEUE_NAME = "sdr-kommo-retry";

export type ConversationJob =
  | { kind?: "process"; conversationId: string }
  | {
      kind: "enrollment_follow_up";
      conversationId: string;
      attempt: number;
      language: SupportedLanguage;
      baselineInboundAt: string;
    };

export type KommoRetryJob =
  | {
      operation: "flow";
      conversationId: string;
      patch: FlowPatch;
      enrollmentData?: EnrollmentData;
      notifyEnrollment: boolean;
      restoreHandoffStage: boolean;
    }
  | {
      operation: "handoff";
      conversationId: string;
      reason: HandoffReason;
    };

function createConnection(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export class ConversationQueue {
  private readonly connection: Redis;
  private readonly queue: Queue<ConversationJob>;

  constructor(redisUrl: string) {
    this.connection = createConnection(redisUrl);
    this.queue = new Queue<ConversationJob>(SDR_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    });
  }

  async enqueue(
    conversationId: string,
    delay: number,
    attempts: number,
  ): Promise<void> {
    let jobId = `conversation-${conversationId}`;
    const existing = await this.queue.getJob(jobId);

    if (existing) {
      const state = await existing.getState();
      if (state === "delayed" || state === "waiting" || state === "completed" || state === "failed") {
        await existing.remove();
      } else {
        // Uma mensagem chegou enquanto a conversa já estava sendo processada.
        // Um job adicional garante que ela não fique presa em "queued".
        jobId = `${jobId}-follow-up-${Date.now()}`;
      }
    }

    const options: JobsOptions = {
      jobId,
      delay,
      attempts,
      backoff: { type: "exponential", delay: 2_000 },
    };

    await this.queue.add("process-conversation", { conversationId }, options);
  }

  async scheduleEnrollmentFollowUp(
    conversationId: string,
    delay: number,
    attempt: number,
    language: SupportedLanguage,
    baselineInboundAt: string,
  ): Promise<void> {
    await this.queue.add(
      "enrollment-follow-up",
      {
        kind: "enrollment_follow_up",
        conversationId,
        attempt,
        language,
        baselineInboundAt,
      },
      {
        jobId: `enrollment-follow-up-${conversationId}-${attempt}-${Date.now()}`,
        delay,
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
      },
    );
  }

  async cancelEnrollmentFollowUps(conversationId: string): Promise<number> {
    const jobs = await this.queue.getJobs(["delayed", "waiting", "prioritized"]);
    const matching = jobs.filter(
      (job) => job.data.kind === "enrollment_follow_up"
        && job.data.conversationId === conversationId,
    );
    await Promise.all(matching.map((job) => job.remove()));
    return matching.length;
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }

  async isPaused(): Promise<boolean> {
    return this.queue.isPaused();
  }

  async pause(): Promise<void> {
    await this.queue.pause();
  }

  async resume(): Promise<void> {
    await this.queue.resume();
  }

  async discardPendingJobs(): Promise<{ waiting: number; delayed: number }> {
    const [waiting, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getDelayedCount(),
    ]);
    await this.queue.drain(true);
    return { waiting, delayed };
  }
}

export class KommoRetryQueue {
  private readonly connection: Redis;
  private readonly queue: Queue<KommoRetryJob>;

  constructor(redisUrl: string) {
    this.connection = createConnection(redisUrl);
    this.queue = new Queue<KommoRetryJob>(KOMMO_RETRY_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      },
    });
  }

  async enqueue(job: KommoRetryJob): Promise<void> {
    await this.queue.add("sync-kommo", job, {
      jobId: `kommo-${job.operation}-${job.conversationId}-${Date.now()}`,
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}

export function createConversationWorker(
  redisUrl: string,
  processor: Processor<ConversationJob>,
): { worker: Worker<ConversationJob>; close: () => Promise<void> } {
  const connection = createConnection(redisUrl);
  const worker = new Worker<ConversationJob>(SDR_QUEUE_NAME, processor, {
    connection,
    concurrency: 5,
  });

  return {
    worker,
    close: async () => {
      await worker.close();
      await connection.quit();
    },
  };
}

export function createKommoRetryWorker(
  redisUrl: string,
  processor: Processor<KommoRetryJob>,
): { worker: Worker<KommoRetryJob>; close: () => Promise<void> } {
  const connection = createConnection(redisUrl);
  const worker = new Worker<KommoRetryJob>(KOMMO_RETRY_QUEUE_NAME, processor, {
    connection,
    concurrency: 2,
  });
  return {
    worker,
    close: async () => {
      await worker.close();
      await connection.quit();
    },
  };
}
