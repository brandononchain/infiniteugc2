import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export interface StitchingJobMessage {
  premiumJobId: string;
  userId: string;
  creditsCost: number;
  chunkUrls: string[];
  callbackUrl?: string;
  fade?: boolean | number;
  targetTable?: "premium_jobs" | "hook_jobs";
}

export interface TriggerStitchingOptions {
  targetTable?: "premium_jobs" | "hook_jobs";
  fade?: boolean | number;
}

export async function triggerStitching(
  premiumJobId: string,
  userId: string,
  creditsCost: number,
  chunkUrls: string[],
  targetTableOrOptions?: "premium_jobs" | "hook_jobs" | TriggerStitchingOptions
): Promise<void> {
  const queueUrl = process.env.AWS_SQS_QUEUE_URL;

  if (!queueUrl) {
    throw new Error("AWS_SQS_QUEUE_URL environment variable is not set");
  }

  const opts: TriggerStitchingOptions =
    typeof targetTableOrOptions === "string"
      ? { targetTable: targetTableOrOptions }
      : targetTableOrOptions || {};

  const message: StitchingJobMessage = {
    premiumJobId,
    userId,
    creditsCost,
    chunkUrls,
    ...(opts.targetTable && { targetTable: opts.targetTable }),
    ...(opts.fade !== undefined && { fade: opts.fade }),
  };

  try {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        JobId: {
          DataType: "String",
          StringValue: premiumJobId,
        },
        UserId: {
          DataType: "String",
          StringValue: userId,
        },
      },
    });

    const response = await sqsClient.send(command);
    console.log(`SQS message sent for job ${premiumJobId}:`, response.MessageId);
  } catch (error: any) {
    console.error("Failed to send SQS message:", error);
    throw new Error(`Failed to trigger stitching: ${error.message}`);
  }
}

export async function getQueueDepth(): Promise<number> {
  try {
    const queueUrl = process.env.AWS_SQS_QUEUE_URL;
    if (!queueUrl) return 0;

    return 0;
  } catch (error) {
    console.error("Failed to get queue depth:", error);
    return 0;
  }
}
