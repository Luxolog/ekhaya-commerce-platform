import { assertEquals } from "jsr:@std/assert";
import { resolveSearchEntitlement } from "../functions/marketplace-search/search-entitlements.ts";

Deno.test("cache hits are free for owners", () => {
  assertEquals(resolveSearchEntitlement({
    isOwner: true, isLinkedPartner: false, isActivePartner: false, cacheHit: true,
  }), "free_cache");
});

Deno.test("cache hits are free for active partners", () => {
  assertEquals(resolveSearchEntitlement({
    isOwner: false, isLinkedPartner: true, isActivePartner: true, cacheHit: true,
  }), "free_cache");
});

Deno.test("cache hits are free for sellers with pilot access", () => {
  assertEquals(resolveSearchEntitlement({
    isOwner: false, isLinkedPartner: false, isActivePartner: false, cacheHit: true,
  }), "free_cache");
});

Deno.test("live searches use partner support allowance for active linked partners", () => {
  assertEquals(resolveSearchEntitlement({
    isOwner: false, isLinkedPartner: true, isActivePartner: true, cacheHit: false,
  }), "partner_support");
});

Deno.test("live searches use seller pilot or monthly credits for non-partners", () => {
  assertEquals(resolveSearchEntitlement({
    isOwner: false, isLinkedPartner: false, isActivePartner: false, cacheHit: false,
  }), "seller_pilot_or_monthly");
});

Deno.test("owners bypass seller and partner allowances on live searches", () => {
  assertEquals(resolveSearchEntitlement({
    isOwner: true, isLinkedPartner: false, isActivePartner: false, cacheHit: false,
  }), "owner");
});
