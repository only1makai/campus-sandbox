import type { Post, SellerRating } from "@/types";
import { fetchPostById, fetchJoinedPostIds, getSellerRating } from "@/lib/queries";
import { getCurrentUser } from "@/lib/identity";

export type ListingDetailData = {
  post: Post;
  isAuthed: boolean;
  currentUserId?: string;
  /** seller aggregate for shop/thrift (display-only) */
  rating?: SellerRating;
  /** app-only: has the viewer already joined this beta */
  joined: boolean;
};

/**
 * Everything the universal detail shell needs for one post, regardless of type.
 * Shared by the bare page (`/p/[id]`) and the intercepted overlay so both entries
 * render identically. Returns null when the post doesn't exist (→ notFound).
 */
export async function loadListing(id: string): Promise<ListingDetailData | null> {
  const post = await fetchPostById(id);
  if (!post) return null;

  const user = await getCurrentUser();
  const currentUserId = user?.id;

  let rating: SellerRating | undefined;
  let joined = false;
  if (post.type === "shop" || post.type === "thrift") {
    rating = await getSellerRating(post.author.id);
  } else if (post.type === "app" && currentUserId) {
    const ids = await fetchJoinedPostIds(currentUserId);
    joined = ids.includes(post.id);
  }

  return { post, isAuthed: !!user, currentUserId, rating, joined };
}
