/**
 * Event Bus Service
 * Milestone 18: Workflow Engine Runtime
 *
 * Simple in-memory event bus for inter-service communication.
 * Supports event emission and listener registration.
 */

type EventHandler<T = any> = (payload: T) => Promise<void> | void;

interface EventSubscription {
  event: string;
  handler: EventHandler;
}

class EventBus {
  private subscriptions: Map<string, EventHandler[]> = new Map();

  /**
   * Emit an event to all registered listeners
   */
  async emit<T = any>(event: string, payload: T): Promise<void> {
    const handlers = this.subscriptions.get(event) || [];

    console.log(`[EventBus] Emitting event: ${event}, listeners: ${handlers.length}`);

    // Execute all handlers in parallel
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in handler for event ${event}:`, error);
          // Don't throw - continue executing other handlers
        }
      })
    );
  }

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    const handlers = this.subscriptions.get(event) || [];
    handlers.push(handler);
    this.subscriptions.set(event, handlers);

    console.log(`[EventBus] Registered listener for event: ${event}`);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.subscriptions.get(event) || [];
      const index = currentHandlers.indexOf(handler);
      if (index !== -1) {
        currentHandlers.splice(index, 1);
        this.subscriptions.set(event, currentHandlers);
      }
    };
  }

  /**
   * Subscribe to an event (one-time)
   */
  once<T = any>(event: string, handler: EventHandler<T>): () => void {
    const wrappedHandler = async (payload: T) => {
      unsubscribe();
      await handler(payload);
    };

    const unsubscribe = this.on(event, wrappedHandler);
    return unsubscribe;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.subscriptions.delete(event);
    } else {
      this.subscriptions.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    return (this.subscriptions.get(event) || []).length;
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Event payload types
export interface ConversationEngagedEvent {
  conversationId: string;
  leadId: string;
  orgId: string;
  source: string;
  engagedAt: Date;
}

export interface WorkflowTriggeredEvent {
  workflowExecutionId: string;
  workflowDefinitionId: string;
  leadId: string;
  conversationId?: string;
  orgId: string;
}
