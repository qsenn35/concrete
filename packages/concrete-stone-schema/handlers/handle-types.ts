import {
  MooLexer,
  StateMachine,
  TypeDefContext,
  FormatLexerResult,
  StateMachineStepHandler,
} from "../types.ts";
import { createZodObject } from "./create-zod-schemas.ts";
import { handleBlock } from "./handle-blocks.ts";

const handleIdentifier = (
  _state: StateMachine["state"],
  block: TypeDefContext,
  value: string
) => {
  if (block.name === undefined) {
    block.name = value;
    return;
  }
  if (typeof value !== "string") return;

  block.descriptors.push(value);
};

const handleFormat = (
  _state: StateMachine["state"],
  block: TypeDefContext,
  value: FormatLexerResult
) => {
  block.formats.push(value);
};

export function handleTypeDef(lexer: MooLexer) {
  const block: TypeDefContext = {
    category: "type",
    name: undefined,
    descriptors: [],
    formats: [],
  };

  const handler: StateMachineStepHandler<TypeDefContext, FormatLexerResult> = (
    state: StateMachine["state"],
    block: TypeDefContext,
    value: string | number | boolean | FormatLexerResult
  ) => {
    if (typeof value === "string") return handleIdentifier(state, block, value);

    return handleFormat(state, block, value as FormatLexerResult);
  };

  const stateMachine: StateMachine<
    | StateMachineStepHandler<TypeDefContext, string>
    | StateMachineStepHandler<TypeDefContext, FormatLexerResult>
  > = {
    current: "type_def",
    state: {}, // not needed for types
    steps: {
      type_def: {
        next: ["identifier"],
      },
      open_paren: {
        next: ["identifier", "format"],
      },
      close_paren: {
        next: [],
      },
      format: {
        handler,
        next: ["comma", "close_paren"],
      },
      identifier: {
        handler,
        next: ["punctuation", "comma", "open_paren", "close_paren"],
      },
      punctuation: {
        next: ["identifier"],
      },
      comma: {
        next: ["identifier", "format", "close_paren"],
      },
    },
  };

  const typeBlock = handleBlock(lexer, block, stateMachine) as TypeDefContext;
  const zodType = createZodObject(typeBlock);

  return zodType;
}
