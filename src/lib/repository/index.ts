import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../supabase/client.ts";
import type { StorageRepository } from "./types.ts";
import { LocalStorageRepository } from "./localStorageRepository.ts";
import { SupabaseRepository } from "./supabaseRepository.ts";

export type * from "./types.ts";
export * from "./localStorageRepository.ts";
export * from "./supabaseRepository.ts";

let localStorageRepoInstance: LocalStorageRepository | null = null;

export function getStorageRepository(user?: User | null): StorageRepository {
  if (user && user.id) {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      return new SupabaseRepository(supabase, user.id);
    }
  }

  if (!localStorageRepoInstance) {
    localStorageRepoInstance = new LocalStorageRepository();
  }
  return localStorageRepoInstance;
}
