import { createZodSchemas } from "../create-zod-schemas.ts";
import { handleSchemaDef } from "./handlers/handle-schema.ts";
import { handleTypeDef } from "./handlers/handle-types.ts";
import { lexer } from "./lexer.ts";
import { LexerContext, SchemaDefBlock } from "./types.ts";

export function tokenize(input: string) {
  lexer.reset(input);

  const ctx: LexerContext = {
    types: {},
    schemas: {},
  };

  let token;
  while ((token = lexer.next())) {
    if (token.type === "ws" || token.type === "comment") {
      continue;
    }

    if (token.type === "type_def") {
      const typeResult = handleTypeDef(lexer);

      if (typeResult && typeResult.name) {
        ctx.types[typeResult.name] = typeResult;
        continue;
      } else {
        throw new Error("Failed to parse token of type 'type_def'");
      }
    }

    if (token.type === "schema_def") {
      const schemaResult: SchemaDefBlock = handleSchemaDef(lexer);

      if (schemaResult && schemaResult.name) {
        ctx.schemas[schemaResult.name] = schemaResult;
      } else {
        throw new Error("Failed to parse token of type 'schema_def'");
      }
    }
  }

  const zodSchemas = createZodSchemas(ctx);

  return zodSchemas;
}

tokenize(`
  type customType (
    string,
    min(3),
    max(10),
    default('my custom type!'),
  )

  schema Basic {
    someProp: (customType);

    :@nested {
      nestedProp: (string);
    }
  }
`);
