import { Static, TSchema } from "@sinclair/typebox";
import { startStopSchema } from "../types";

class DuplicateRoleError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "DuplicateRoleError";
    }
  }
  
 export function validateSchemaForDuplicateRoles<T extends TSchema>(schema: T): T {
    return {
      ...schema,
      decode(value: unknown) {
        try {
          const decodedValue = value as Static<typeof startStopSchema>;
  
          const taskRoles = decodedValue.miscellaneous.maxConcurrentTasks.map((task) => task.role);
          const uniqueRoles = new Set(taskRoles);
  
          if (taskRoles.length !== uniqueRoles.size) {
            throw new DuplicateRoleError("Duplicate roles found in maxConcurrentTasks.");
          }
  
          return decodedValue;
        } catch (error) {
          if (error instanceof DuplicateRoleError) {
            console.error(error.message);
            throw error;
          } else {
            console.error("An unexpected error occurred during decoding:", error);
            throw error;
          }
        }
      },
    } as T;
  }