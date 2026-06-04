export const QUEUE_NAMES = {
  DEFAULT: 'default-jobs',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

