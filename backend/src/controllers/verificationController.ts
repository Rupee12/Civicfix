import type { RequestHandler } from "express";
import { getVerificationSummary, submitVerification } from "../services/verificationService.js";

export const verificationSummary: RequestHandler = async (request, response) => {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  response.json({
    success: true,
    message: "Verification summary retrieved",
    data: await getVerificationSummary(id, request.user!.userId),
  });
};

export const verifyResolution: RequestHandler = async (request, response) => {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  response.json({
    success: true,
    message: "Resolution verification submitted",
    data: await submitVerification(id, request.body, request.user!.userId),
  });
};
