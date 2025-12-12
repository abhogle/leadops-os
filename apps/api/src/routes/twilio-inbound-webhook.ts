import type { FastifyInstance } from "fastify";
import { leads, conversations, messages } from "@leadops/db";
import { eq, and, desc } from "drizzle-orm";
import { InboundSmsWebhookSchema } from "@leadops/schemas";
import { activateConversationIfNeeded, updateLastMessageAt, incrementUnreadCount } from "../services/conversation-activation.js";
import { ValidationError, InternalError } from "../errors/index.js";

/**
 * POST /webhooks/twilio/inbound
 *
 * Handle inbound SMS from Twilio
 *
 * Flow:
 * 1. Validate Twilio signature (TODO: implement)
 * 2. Extract phone + body
 * 3. Find most recent lead with phone
 * 4. Insert inbound message
 * 5. Activate conversation
 * 6. Increment unread_count
 *
 * @public endpoint (webhook - no auth required, but should validate Twilio signature)
 * @ratelimit 1000 requests per 15 minutes (high volume webhook)
 */
export async function registerTwilioInboundWebhookRoute(app: FastifyInstance) {
  app.post("/webhooks/twilio/inbound", {
    config: {
      rateLimit: {
        max: 1000,
        timeWindow: "15 minutes",
      },
    },
  }, async (req, reply) => {
    try {
      // TODO: Validate Twilio signature for security
      // const twilioSignature = req.headers['x-twilio-signature'];
      // if (!validateTwilioSignature(req.body, twilioSignature)) {
      //   throw new ValidationError("Invalid Twilio signature");
      // }

      // Validate Twilio webhook payload
      const validation = InboundSmsWebhookSchema.safeParse(req.body);

      if (!validation.success) {
        throw new ValidationError("Invalid webhook payload", validation.error.errors);
      }

      const { From: from, To: to, Body: body, MessageSid: messageSid } = validation.data;

      // Find most recent lead with this phone number
      // TODO: This is a simplified lookup - in production, consider:
      // 1. Matching by org based on the "To" number
      // 2. Handling multiple leads with same phone across different orgs
      // 3. Creating a new lead if phone not found
      const [lead] = await app.db
        .select({
          id: leads.id,
          orgId: leads.orgId,
        })
        .from(leads)
        .where(eq(leads.phone, from))
        .orderBy(desc(leads.createdAt))
        .limit(1);

      if (!lead) {
        // For now, log and ignore messages from unknown numbers
        // In production, you might want to create a new lead automatically
        req.log.warn({ from, to }, "Received message from unknown phone number");
        return reply.status(200).send({ status: "ignored", reason: "unknown_lead" });
      }

      // Find conversation for this lead
      const [conversation] = await app.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.leadId, lead.id),
            eq(conversations.isArchived, false)
          )
        )
        .orderBy(desc(conversations.createdAt))
        .limit(1);

      if (!conversation) {
        // This shouldn't happen if ingestion pipeline works correctly
        req.log.error({ leadId: lead.id }, "No conversation found for lead");
        return reply.status(200).send({ status: "error", reason: "no_conversation" });
      }

      // Insert inbound message
      await app.db.insert(messages).values({
        orgId: lead.orgId,
        companyId: null,
        leadId: lead.id,
        conversationId: conversation.id,
        messageType: "sms",
        channel: "sms",
        direction: "inbound",
        sender: "lead",
        body,
        status: "delivered",
        providerMessageId: messageSid || null,
        metadata: { from, to },
      });

      // Activate conversation if needed
      await activateConversationIfNeeded(app.db, conversation.id);

      // Update last_message_at
      await updateLastMessageAt(app.db, conversation.id);

      // Increment unread_count
      await incrementUnreadCount(app.db, conversation.id);

      // Twilio expects 200 OK response
      return reply.status(200).send({ status: "ok" });
    } catch (err) {
      if (err instanceof ValidationError || err instanceof InternalError) {
        // Log error but still return 200 to Twilio to prevent retries
        req.log.error(err, "Webhook processing failed");
        return reply.status(200).send({ status: "error", message: err.message });
      }
      req.log.error(err, "Unexpected webhook error");
      return reply.status(200).send({ status: "error", message: "Internal error" });
    }
  });
}
