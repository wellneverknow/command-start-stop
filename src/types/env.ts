import { Type as T } from "@sinclair/typebox";
import { StaticDecode } from "@sinclair/typebox";

export const envSchema = T.Object({
  SUPABASE_URL: T.String(),
  SUPABASE_KEY: T.String(),
  APP_ID: T.Transform(T.Union([T.String(), T.Number()]))
    .Decode((val) => {
      if (isNaN(Number(val))) {
        throw new Error("Invalid APP_ID");
      }
      return Number(val);
    })
    .Encode((encoded) => encoded.toString())
});

export type Env = StaticDecode<typeof envSchema>;
