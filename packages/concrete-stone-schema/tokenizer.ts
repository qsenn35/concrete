import { handleSchemaDef } from "./handlers/handle-schema.ts";
import { handleTypeDef } from "./handlers/handle-types.ts";
import { lexer } from "./lexer.ts";
import { LexerContext } from "./types.ts";
import { convertToJSONSchema } from "./handlers/create-zod-schemas.ts";

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
      // const zodResult = z.toJSONSchema(typeResult);
      // console.log(zodResult);
    }

    if (token.type === "schema_def") {
      const schemaResult = handleSchemaDef(lexer);
      console.log("schema result", schemaResult);
      if (schemaResult) {
        const zodResult = convertToJSONSchema(schemaResult);
        console.log(zodResult);
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
