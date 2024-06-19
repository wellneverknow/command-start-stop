import { Database } from "../types/database";
import { SupabaseClient } from "@supabase/supabase-js";
import { Super } from "./supabase";
import { Context } from "../../../types/context";
import { addCommentToIssue } from "../../../utils/issue";

export class User extends Super {
  constructor(supabase: SupabaseClient<Database>, context: Context) {
    super(supabase, context);
  }

  async getWalletByUserId(userId: number, issueNumber: number) {
    const { data, error } = await this.supabase.from("users").select("wallets(*)").eq("id", userId).single();
    if ((error && !data) || !data.wallets?.address) {
      this.context.logger.error("No wallet address found", { userId, issueNumber }, true);
      await addCommentToIssue(this.context, "```diff\n # Please set your wallet address with the /wallet command first and try again.\n```");
      throw new Error("No wallet address found");
    }

    this.context.logger.info("Successfully fetched wallet", { userId, address: data.wallets?.address });
    return data.wallets?.address;
  }

  public async getMultiplier(userId: number, repositoryId: number) {
    const locationData = await this.getLocationsFromRepo(repositoryId);
    if (locationData && locationData.length > 0) {
      const accessData = await this._getAccessData(locationData, userId);
      if (accessData) {
        return {
          value: accessData.multiplier || null,
          reason: accessData.multiplier_reason || null,
        };
      }
    }
    return null;
  }

  private async _getAccessData(locationData: { id: number }[], userId: number) {
    const locationIdsInCurrentRepository = locationData.map((location) => location.id);

    const { data: accessData, error: accessError } = await this.supabase
      .from("access")
      .select("multiplier, multiplier_reason")
      .in("location_id", locationIdsInCurrentRepository)
      .eq("user_id", userId)
      .order("id", { ascending: false }) // get the latest one
      .maybeSingle();
    if (accessError) throw this.context.logger.error("Error getting access data", accessError);
    return accessData;
  }

  public async getLocationsFromRepo(repositoryId: number) {
    const { data: locationData, error } = await this.supabase.from("locations").select("id").eq("repository_id", repositoryId);

    if (error) throw this.context.logger.error("Error getting location data", new Error(error.message));
    return locationData;
  }
}
