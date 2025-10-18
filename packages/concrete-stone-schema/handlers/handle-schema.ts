import { ZodObject } from "zod/v4";
import {
  MooLexer,
  StateMachine,
  SchemaDefBlock,
  FormatLexerResult,
  StateMachineStepHandler,
  TypeDefContext,
} from "../types.ts";
import { createZodObject } from "./create-zod-schemas.ts";
import { handleBlock } from "./handle-blocks.ts";

function setByPath<T extends Record<string, any>>(
  obj: T,
  path: string,
  value: any
): T {
  const keys = path.split(".");
  let current: Record<string, any> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      !(key in current) ||
      typeof current[key] !== "object" ||
      current[key] === null
    ) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
}

function getByPath<T extends Record<string, any>, R = any>(
  obj: T,
  path: string
): R | undefined {
  const keys = path.split(".");
  let current: any = obj;

  for (const key of keys) {
    if (current == null || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  return current as R;
}

function handlePropIdentifier(
  state: StateMachine["state"],
  block: SchemaDefBlock,
  value: string
) {
  const prop = value.substring(
    0,
    value.length
  ) as keyof SchemaDefBlock["props"];

  if (!state.last_nested) {
    block.props[prop] = {
      category: "type",
      name: prop as string,
      descriptors: [],
      formats: [],
    };
  } else {
    const scopeProp = prop as string;

    setByPath(block, `${state.last_nested}.props.${scopeProp}` as string, {
      category: "type",
      name: scopeProp,
      descriptors: [],
      formats: [],
    });
  }

  state.last_property = prop;

  return true;
}

function handleIdentifier(
  state: StateMachine["state"],
  block: SchemaDefBlock,
  value: string
) {
  if (!block.name) {
    block.name = value;
    return true;
  }

  const { last_property, last_nested } = state;

  if ((last_property as string) && !last_nested) {
    const prop = block.props[last_property as string] as TypeDefContext;
    prop.descriptors = [...prop.descriptors, value];
  } else if (last_property && last_nested) {
    const fullPath = `${last_nested}.props.${last_property}.descriptors`;
    const currentDescriptors = getByPath(block, fullPath);

    setByPath(block, fullPath, [...(currentDescriptors || []), value]);
  }

  return true;
}

function handlePropDirective(
  state: StateMachine["state"],
  block: SchemaDefBlock,
  value: string
) {
  const scope = value.substring(1, value.length);
  block.scopes[scope] = {
    props: {},
  };
  state.last_nested = `scopes.${scope}`;

  return true;
}

function handleNestedSchema(
  state: StateMachine["state"],
  block: SchemaDefBlock,
  value: string
) {
  if (state.last_nested) {
    setByPath(block, `${state.last_nested}.props.${value}`, {
      category: "schema",
      name: "value",
      props: {},
      scopes: {},
    });

    state.last_nested = `${state.last_nested}.props.${value}`;

    return true;
  }

  block.props[value] = {
    props: {},
  } as SchemaDefBlock;
  state.last_nested = `props.${value}`;

  return true;
}

function handleFormat(
  state: StateMachine["state"],
  block: SchemaDefBlock,
  value: FormatLexerResult
) {
  const lastProp = state.last_property as string;
  const lastNested = state.last_nested as string;

  if (lastProp && !lastNested) {
    const prop = block.props[lastProp] as TypeDefContext;

    prop.formats = [...prop.formats, value];
  } else if (lastProp && lastNested) {
    const prop = block.scopes[lastNested].props[lastProp] as TypeDefContext;
    prop.formats.push(value);
  }

  return true;
}

function handleCloseCurly(
  state: StateMachine["state"],
  _block: SchemaDefBlock,
  _value: string
) {
  if (!state.last_nested) {
    return false;
  }

  if (state.last_nested) state.last_nested = undefined;
  if (state.last_property) state.last_property = undefined;

  return true;
}

export function handleSchemaDef(lexer: MooLexer) {
  const block: SchemaDefBlock = {
    category: "schema",
    name: undefined,
    props: {},
    scopes: {},
  };

  const stateMachine: StateMachine<
    | StateMachineStepHandler<SchemaDefBlock, string>
    | StateMachineStepHandler<SchemaDefBlock, FormatLexerResult>
  > = {
    current: "schema_def",
    state: {
      last_property: undefined,
      last_nested: undefined,
    },
    steps: {
      schema_def: {
        next: ["identifier"],
      },
      open_curly: {
        next: ["prop_identifier", "nested_schema_identifier"],
      },
      close_curly: {
        handler: handleCloseCurly,
        next: ["prop_identifier", "nested_schema_identifier", "end_line"],
      },
      open_paren: {
        next: ["identifier", "format"],
      },
      close_paren: {
        next: ["end_line"],
      },
      end_line: {
        next: [
          "prop_identifier",
          "nested_schema_identifier",
          "prop_directive",
          "close_curly",
        ],
      },
      format: {
        handler: handleFormat,
        next: ["comma", "close_paren"],
      },
      identifier: {
        handler: handleIdentifier,
        next: ["open_curly", "comma", "close_paren"],
      },
      prop_identifier: {
        handler: handlePropIdentifier,
        next: ["open_paren"],
      },
      prop_directive: {
        handler: handlePropDirective,
        next: ["identifier"],
      },
      nested_schema_identifier: {
        handler: handleNestedSchema,
        next: ["open_curly"],
      },
      punctuation: {
        next: ["identifier"],
      },
      comma: {
        next: ["identifier", "format", "close_paren"],
      },
    },
  };

  const schemaBlock = handleBlock(lexer, block, stateMachine) as SchemaDefBlock;
  const zodSchema = createZodObject(schemaBlock);

  return zodSchema;
}
