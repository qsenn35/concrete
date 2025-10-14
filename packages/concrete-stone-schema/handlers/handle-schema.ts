import {
  MooLexer,
  StateMachine,
  SchemaDefBlock,
  FormatLexerResult,
  StateMachineStepHandler,
} from "../types.ts";
import { handleBlock } from "./handle-blocks.ts";

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
    const scope = block.scopes[state.last_nested as string];
    scope.props[scopeProp as string] = {
      category: "type",
      name: scopeProp,
      descriptors: [],
      formats: [],
    };
  }

  state.last_property = prop;
}

function handleIdentifier(
  state: StateMachine["state"],
  block: SchemaDefBlock,
  value: string
) {
  if (!block.name) {
    block.name = value;
    return;
  }

  const { last_property, last_nested } = state;

  if ((last_property as string) && !last_nested) {
    block.props[last_property as string].descriptors.push(value);
  } else if (last_property && last_nested) {
    block.scopes[last_nested as string].props[
      last_property as string
    ].descriptors.push(value);
  }
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
  state.last_nested = scope;
}

function handleFormat(
  state: StateMachine["state"],
  block: SchemaDefBlock,
  value: FormatLexerResult
) {
  const lastProp = state.last_property as string;
  const lastNested = state.last_nested as string;

  if (lastProp && !lastNested) {
    block.props[lastProp].formats.push(value);
  } else if (lastProp && lastNested) {
    block.scopes[lastNested].props[lastProp].formats.push(value);
  }
}

function handleCloseCurly(
  state: StateMachine["state"],
  _block: SchemaDefBlock,
  _value: string
) {
  if (state.last_nested) state.last_nested = undefined;
  if (state.last_property) state.last_property = undefined;
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
        next: ["prop_identifier"],
      },
      close_curly: {
        handler: handleCloseCurly,
        next: ["prop_identifier", "end_line"],
      },
      open_paren: {
        next: ["identifier", "format"],
      },
      close_paren: {
        next: ["end_line"],
      },
      end_line: {
        next: ["prop_identifier", "prop_directive", "close_curly"],
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
      punctuation: {
        next: ["identifier"],
      },
      comma: {
        next: ["identifier", "format", "close_paren"],
      },
    },
  };

  return handleBlock(lexer, block, stateMachine) as SchemaDefBlock;
}
