import { createDataClient } from "@/lib/supabase/client";

export async function createNotification(
  notification: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createDataClient();
    await supabase.from("notifications").insert(notification);
  } catch {
    // silent - notification creation should never block the main action
  }
}
