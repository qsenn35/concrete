import { ZodObject } from "zod/v4";
import { handleSchemaDef } from "./handlers/handle-schema.ts";
import { handleTypeDef } from "./handlers/handle-types.ts";
import { lexer } from "./lexer.ts";
import { LexerContext } from "./types.ts";

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
      //console.log("type result:", typeResult);
    }

    if (token.type === "schema_def") {
      const schemaResult = handleSchemaDef(lexer) as ZodObject;

      for (const prop in schemaResult.def.shape) {
        const obj = schemaResult.def.shape[prop];
        console.log("?", prop, obj);
      }
    }
  }
}

tokenize(`
  type customString (string, min(1), max(255));

  schema BasicWithNested {
    someProp: (customString);

    :nested {
      someNestedProp: (string);
    }
  }

  schema BasicWithDeeplyNested {
    someProp: (customString, min(2), max(255));

    :nested {
      someNestedProp: (string);
      :deeplyNested {
        someDeepProp: (customString);
      }
    }
  }
`);
