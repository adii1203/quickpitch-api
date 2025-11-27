import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ListQueuesCommand, SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sValidator } from "@hono/standard-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import z from "zod";

import type { AppBindings, SqsTask } from "@/lib/types.ts";

import db from "@/db/index.ts";
import { pitch } from "@/db/schema/pitch.ts";
import env from "@/env.ts";
import { requireAuth } from "@/middleware/require-auth.ts";

export const pitchRoutes = new Hono<AppBindings>();

const s3Client = new S3Client({ region: env.AWS_S3_REGION, credentials: {
  accessKeyId: env.AWS_ACCESS_KEY,
  secretAccessKey: env.AWS_SECRET_KEY,
} });

const client = new SQSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_KEY,
  },
});

function createPresignedUrl({ bucket, key }: {
  bucket: string;
  key: string;
}) {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

async function enqueueJob(payload: any) {
  const cmd = new SendMessageCommand({
    QueueUrl: "https://sqs.ap-south-1.amazonaws.com/633379283260/resumeQ",
    MessageBody: JSON.stringify(payload),
  });

  await client.send(cmd);
}

pitchRoutes.use("/*", requireAuth);

const schema = z.object({
  name: z.string().min(2),
});

pitchRoutes.get("/sqs", async (c) => {
  try {
    const data = await client.send(new ListQueuesCommand());
    console.log(data);

    return c.text("/sqs");
  }
  catch (error) {
    console.log(error);
  }
});

pitchRoutes.post("/", sValidator("json", schema), async (c) => {
  const logger = c.get("logger");
  try {
    const data = c.req.valid("json");
    const user = c.get("user");
    if (!user) {
      return c.json({
        error: "Unauthorized",
      }, 401);
    }

    const video_file_key = `${nanoid()}.mp4`;
    const resume_file_key = `${nanoid()}.pdf`;

    // add name and status into database
    const result = await db.insert(pitch).values({
      id: nanoid(),
      name: data.name,
      status: "draft",
      user_id: user.id,
      video_url: video_file_key,
      resume_url: resume_file_key,
    }).returning();
    logger.info("Pitch draft success.");

    // generate signed urls for resume and video upload

    const resume_upload_url = await createPresignedUrl({ bucket: "storage-quickpitch", key: resume_file_key });
    const video_upload_url = await createPresignedUrl({ bucket: "", key: video_file_key });

    // return id, signed urls
    return c.json({
      id: result[0].id,
      video_file_key,
      resume_file_key,
      video_upload_url,
      resume_upload_url,
    }, 201);
  }
  catch (error) {
    logger.warn("Failed to draft pitch");

    console.log(error);
    return c.json({
      code: 500,
      status: "error",
      message: "Something went wrong",
    });
  }
});

const finalizeSchema = z.object({
  id: z.nanoid(),
});

pitchRoutes.patch("/:id/finalize", sValidator("param", finalizeSchema), async (c) => {
  // validate pitch id
  try {
    const user = c.get("user");
    const pitchId = c.req.valid("param");

    const draftPitch = await db.select().from(pitch).where(and(
      eq(pitch.user_id, user.id),
      eq(pitch.id, pitchId.id),
    )).then(res => res[0]);

    if (!draftPitch) {
      return c.json({
        message: "resource not found",
        code: 404,
        status: "error",
      }, 404);
    }

    // validate resume upload
    const command = new HeadObjectCommand({
      Bucket: "storage-quickpitch",
      Key: draftPitch.resume_url!,
    });

    const _ = await s3Client.send(command);

    enqueueJob({
      objectKey: draftPitch.resume_url,
      pitchId: draftPitch.id,
    } as SqsTask);

    return c.text(pitchId.id, 200);
  }
  catch (error) {
    console.warn(error);
    if (error) {
      const isAwsError = typeof error === "object" && ("$metadata" in error);
      if (isAwsError) {
        return c.json({
          status: "error",
          code: 404,
          message: "Failed to save pitch",
        }, 404);
      }
    }

    return c.json({
      message: "Something went wrong",
      code: 500,
      status: "error",
    }, 500);
  }
});

const getPitchSchema = z.object({
  id: z.nanoid(),
});

pitchRoutes.get("/:id", sValidator("param", getPitchSchema), async (c) => {
  try {
    const user = c.get("user");
    const pitchId = c.req.valid("param");

    if (!pitchId.id) {
      return c.status(400);
    }

    const data = await db.select({
      id: pitch.id,
      name: pitch.name,
      status: pitch.status,
      video_url: pitch.video_url,
      resume_url: pitch.resume_url,
    }).from(pitch).where(and(
      eq(pitch.user_id, user.id),
      eq(pitch.id, pitchId.id),
    )).then(res => res[0]);

    if (!data) {
      return c.json({
        message: "resource not found",
        code: 404,
        status: "error",
      }, 404);
    }

    return c.json({
      message: "",
      code: 200,
      status: "success",
      data,
    }, 200);
  }
  catch (error) {
    console.log(error);
    return c.json({
      message: "Something went wrong",
      code: 500,
      status: "error",
    }, 500);
  }
});

pitchRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");

    const data = await db.select().from(pitch).where(eq(pitch.user_id, user.id)).then(res => res);
    if (!data) {
      return c.json({
        message: "resource not found",
        code: 404,
        status: "error",
      }, 404);
    }

    return c.json({
      message: "",
      code: 200,
      status: "success",
      data,
    }, 200);
  }
  catch (error) {
    console.log(error);
  }
});

const deletePitchSchema = z.object({
  id: z.nanoid(),
});

pitchRoutes.delete("/:id", sValidator("param", deletePitchSchema, (result, c) => {
  if (!result.success) {
    return c.json({
      message: "Invalid request data",
      code: 400,
      status: "error",
    }, 400);
  }
}), async (c) => {
  try {
    const user = c.get("user");
    const pitchId = c.req.valid("param");

    const data = await db.delete(pitch).where(and(
      eq(pitch.user_id, user.id),
      eq(pitch.id, pitchId.id),
    )).returning();

    if (data.length === 0) {
      return c.json({
        message: "Resource not found",
        status: "error",
        code: 404,
        data,
      }, 404);
    }

    return c.json({
      message: "Pitch deleted",
      status: "success",
      code: 200,
      data: {
        id: data[0].id,
      },
    }, 200);
  }
  catch (error) {
    console.log(error);
    return c.json({
      message: "Failed to delete pitch",
      status: "error",
      code: 500,
      data: {},
    }, 500);
  }
});
