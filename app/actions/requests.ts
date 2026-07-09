"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import type { RequestStatus } from "@/types";

/** Same discriminated-union convention as app/actions/karma.ts. */
export type RequestResult =
  | { ok: true }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

export type StartRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; reason: "auth_required" | "error"; message?: string };

/** Map a raw DB error message to human copy; fall back to the raw string. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("request limit reached")) {
    return "You've reached today's request limit — try again tomorrow.";
  }
  if (m.includes("message cap reached")) {
    return "This thread is full — wrap up or exchange contact info.";
  }
  if (m.includes("own listing")) return "You can't request your own listing.";
  if (m.includes("this request is closed")) {
    return "This request is closed — no more messages can be sent.";
  }
  if (m.includes("not a participant")) return "You're not part of this request.";
  if (m.includes("after the request is fulfilled")) {
    return "You can rate the seller once the request is marked fulfilled.";
  }
  if (m.includes("only the buyer")) return "Only the buyer can rate the seller.";
  if (m.includes("duplicate key") || m.includes("seller_ratings_request_id")) {
    return "You already rated this seller.";
  }
  if (m.includes("1–1000") || m.includes("1-1000")) {
    return "Messages are 1–1000 characters.";
  }
  return message;
}

/**
 * Buyer opens a request on a post and sends the first message. Two RPCs:
 * create_request (returns the new id) then send_request_message.
 */
export async function startRequest(
  postId: string,
  firstMessage: string,
): Promise<StartRequestResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const body = firstMessage.trim();
  if (body.length < 1 || body.length > 1000) {
    return { ok: false, reason: "error", message: "Messages are 1–1000 characters." };
  }

  const { data: requestId, error } = await supabase.rpc("create_request", {
    p_post_id: postId,
  });
  if (error || !requestId) {
    return { ok: false, reason: "error", message: friendly(error?.message ?? "Couldn't start the request.") };
  }

  const { error: msgError } = await supabase.rpc("send_request_message", {
    p_request_id: requestId,
    p_body: body,
  });
  if (msgError) {
    // The request exists; surface the message failure but keep the id so the
    // buyer lands in the thread and can retry the message there.
    revalidatePath("/requests");
    return { ok: false, reason: "error", message: friendly(msgError.message) };
  }

  revalidatePath("/requests");
  return { ok: true, requestId };
}

export async function sendMessage(requestId: string, body: string): Promise<RequestResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 1000) {
    return { ok: false, reason: "error", message: "Messages are 1–1000 characters." };
  }

  const { error } = await supabase.rpc("send_request_message", {
    p_request_id: requestId,
    p_body: trimmed,
  });
  if (error) return { ok: false, reason: "error", message: friendly(error.message) };

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { ok: true };
}

export async function setRequestStatus(
  requestId: string,
  status: Extract<RequestStatus, "open" | "fulfilled" | "declined">,
): Promise<RequestResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const { error } = await supabase.rpc("update_request_status", {
    p_request_id: requestId,
    p_status: status,
  });
  if (error) return { ok: false, reason: "error", message: friendly(error.message) };

  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return { ok: true };
}

export async function rateSeller(requestId: string, stars: number): Promise<RequestResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { ok: false, reason: "error", message: "Pick a rating from 1 to 5 stars." };
  }

  const { error } = await supabase.rpc("rate_seller", {
    p_request_id: requestId,
    p_stars: stars,
  });
  if (error) return { ok: false, reason: "error", message: friendly(error.message) };

  revalidatePath(`/requests/${requestId}`);
  return { ok: true };
}

/** Seller ends a thrift listing early (author-only, enforced in the RPC). */
export async function markThriftSold(postId: string): Promise<RequestResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth_required" };

  const { error } = await supabase.rpc("update_thrift_status", {
    p_post_id: postId,
    p_status: "sold",
  });
  if (error) return { ok: false, reason: "error", message: friendly(error.message) };

  revalidatePath("/thrift");
  return { ok: true };
}
