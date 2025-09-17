import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from "../utils/ApiError.js";
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

const prisma = new PrismaClient();

router.get('/', authenticateToken, async (req, res) => {
    try {
        // Get client ID from authenticated user
        const clientId = req.user.id; // The JWT should contain the client ID
        console.log('Fetching logs for client:', clientId);
        
        const logs = await prisma.log.findMany({
            where: {
                anonymousSession: {
                    clientId,
                },
            },
        });
        
        console.log('Found logs:', logs.length);
        return new ApiResponse(200, "Logs fetched successfully", logs).send(res);
    } catch (error) {
        console.error('Error fetching logs:', error);
        throw new ApiError(500, "Failed to fetch logs");
    }
});

router.post("/report-bug", async (req, res) => {
  const { feedback, logs, sessionId, clientId } = req.body;
  // console.log({ feedback, logs, sessionId });
  console.log(req.body);
  // const clientId = "554b8af2-4023-42ef-9df1-8322f3872b33";

  const session = await prisma.anonymousSession.findFirst({
    where: {
        id: sessionId
    }
  });   

  if (!session) {
    await prisma.anonymousSession.create({
      data: {
        id: sessionId,
        clientId: clientId,
      }
    });
  }

  await prisma.log.create({
    data: {
      message: feedback,
      data: logs,
      sessionId,
      type: "bug",
    }
  });

  return new ApiResponse(201, "Bug submitted successfully").send(res);
});

export default router;