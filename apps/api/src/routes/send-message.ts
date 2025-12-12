import type { FastifyInstance } from "fastify";
import { conversations, leads, messages, orgTwilioConfig } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import { OutboundMessageSchema, MessageResponseSchema } from "@leadops/schemas";
import { activateConversationIfNeeded, updateLastMessageAt } from "../services/conversation-activation.js";
import { selectSenderNumber } from "../services/sms/select-sender-number.js";
import { sendSms } from "../providers/sms/index.js";
import { ValidationError, NotFoundError, InternalError } from "../errors/index.js";

/**
 * POST /conversations/:id/messages
 *
 * Send outbound SMS to a lead
 *
 * Steps:
 * 1. Validate
 * 2. Activate conversation if not_started
 * 3. Select sender number (local presence)
 * 4. Send via Twilio provider
 * 5. Insert message row
 * 6. Return message_id + status
 *
 * @protected endpoint (requires authentication)
 */
export async function registerSendMessageRoute(app: FastifyInstance) {
  app.post("/conversations/:id/messages", async (req, reply) => {
    try {
      const conversationId = (req.params as any).id;
      const orgId = req.tenantContext?.org?.id;

      if (!orgId) {
        throw new InternalError("Organization context not found");
      }

      // Validate request body
      const validation = OutboundMessageSchema.safeParse(req.body);

      if (!validation.success) {
        throw new ValidationError("Validation failed", validation.error.errors);
      }

      const { body: messageBody } = validation.data;

      // Get conversation and lead data
      const [conversation] = await app.db
        .select({
          id: conversations.id,
          leadId: conversations.leadId,
          orgId: conversations.orgId,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.orgId, orgId)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new NotFoundError("Conversation not found");
      }

      const [lead] = await app.db
        .select({ phone: leads.phone })
        .from(leads)
        .where(eq(leads.id, conversation.leadId))
        .limit(1);

      if (!lead) {
        throw new NotFoundError("Lead not found");
      }

      // Activate conversation if needed
      await activateConversationIfNeeded(app.db, conversationId);

      // Get Twilio config
      const [twilioConfig] = await app.db
        .select()
        .from(orgTwilioConfig)
        .where(eq(orgTwilioConfig.orgId, orgId))
        .limit(1);

      if (!twilioConfig) {
        throw new InternalError("Twilio configuration not found for organization");
      }

      // Select sender number (local presence dialing)
      const senderNumber = await selectSenderNumber(app.db, orgId, lead.phone);

      // Send via Twilio
      const smsResult = await sendSms(
        {
          accountSid: twilioConfig.accountSid,
          authToken: twilioConfig.authToken,
          messagingServiceSid: twilioConfig.messagingServiceSid,
        },
        {
          to: lead.phone,
          from: senderNumber,
          body: messageBody,
        }
      );

      // Insert message row
      const [message] = await app.db
        .insert(messages)
        .values({
          orgId,
          companyId: null,
          leadId: conversation.leadId,
          conversationId,
          messageType: "sms",
          channel: "sms",
          direction: "outbound",
          sender: "human",
          body: messageBody,
          status: smsResult.status,
          providerMessageId: smsResult.message_id,
          metadata: { from: senderNumber },
        })
        .returning({ id: messages.id, createdAt: messages.createdAt });

      if (!message) {
        throw new InternalError("Failed to create message record");
      }

      // Update last_message_at
      await updateLastMessageAt(app.db, conversationId);

      const response = MessageResponseSchema.parse({
        message_id: message.id,
        status: smsResult.status,
        created_at: message.createdAt.toISOString(),
      });

      return reply.status(201).send(response);
    } catch (err) {
      if (
        err instanceof ValidationError ||
        err instanceof NotFoundError ||
        err instanceof InternalError
      ) {
        throw err;
      }
      req.log.error(err, "Failed to send message");
      throw new InternalError("Failed to send message");
    }
  });
}
