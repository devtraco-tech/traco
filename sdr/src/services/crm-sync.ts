import type { CatalogItemSnapshot } from "../domain/catalog.js";
import type { FlowPatch } from "../domain/commercial-flow.js";
import type { ConversationContext, EnrollmentData, HandoffReason } from "../domain/types.js";

export interface CrmSyncService {
  syncFlow(
    context: ConversationContext,
    patch: FlowPatch | undefined,
    course: CatalogItemSnapshot,
    enrollmentData?: EnrollmentData,
    notifyEnrollment?: boolean,
  ): Promise<void>;
  syncHandoff(
    context: ConversationContext,
    course: CatalogItemSnapshot,
    reason: HandoffReason,
    details?: string,
  ): Promise<void>;
  restoreHandoffStage(context: ConversationContext, course: CatalogItemSnapshot): Promise<void>;
}
