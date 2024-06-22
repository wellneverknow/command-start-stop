import { LogLevel } from "../../adapters/supabase/pretty-logs";

type Metadata<T extends object> = T & {
  revision?: string;
  logMessage?: {
    type?: LogLevel;
    message?: string;
  };
  [key: string]: unknown;
};

function createStructuredMetadata<T extends object>(className: string, metadata: Metadata<T>) {
  const jsonPretty = JSON.stringify(metadata, null, 2);
  const stackLine = new Error().stack?.split("\n")[2] ?? "";
  const caller = stackLine.match(/at (\S+)/)?.[1] ?? "";
  const ubiquityMetadataHeader = `<!-- Ubiquity - ${className} - ${caller} - ${metadata.revision}`;

  let metadataSerialized: string;
  const metadataSerializedVisible = ["```json", jsonPretty, "```"].join("\n");
  const metadataSerializedHidden = [ubiquityMetadataHeader, jsonPretty, "-->"].join("\n");

  if (metadata.logMessage?.type === LogLevel.FATAL) {
    // if the log message is fatal, then we want to show the metadata
    metadataSerialized = [metadataSerializedVisible, metadataSerializedHidden].join("\n");
  } else {
    // otherwise we want to hide it
    metadataSerialized = metadataSerializedHidden;
  }

  return metadataSerialized;
}

export default {
  create: createStructuredMetadata,
};
