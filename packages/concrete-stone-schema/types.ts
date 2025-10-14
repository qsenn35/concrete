import { ZodAny } from "zod/v4";
import { ZodObject } from "zod/v4";

export type FormatLexerResult = {
  type: string;
  args: Array<string>;
};

export type MooLexerResult<TValue = string> = {
  type: string;
  value: TValue;
  text: string;
  toString: () => string;
  offset: number;
  lineBreaks: number;
  line: number;
  col: number;
};

export type MooLexer<TValue = string> = {
  reset: (input: string) => void;
  next: () => MooLexerResult<TValue>;
};

export type DefaultDefBlock = {
  category: "type" | "schema";
  name: string | undefined;
};

export interface TypeDefContext extends DefaultDefBlock {
  descriptors: Array<string>;
  formats: Array<FormatLexerResult>;
}

export type TypeIdentifierHandler = (block: BlockType, value: string) => void;

export type TypeFormHandler = (
  block: BlockType,
  value: FormatLexerResult
) => void;

export interface SchemaDefBlock extends DefaultDefBlock {
  props: {
    [prop: string]: TypeDefContext;
  };
  scopes: {
    [scope: string]: {
      props: {
        [prop: string]: TypeDefContext;
      };
    };
  };
}

export type BlockType = TypeDefContext | SchemaDefBlock;

export type StateMachineStepHandler<TBlock, TValue> = (
  state: StateMachine["state"],
  block: TBlock,
  value: MooLexerResult<TValue>["value"]
) => void;

export type StateMachine<THandler = StateMachineStepHandler<unknown, unknown>> =
  {
    current: string;
    state: {
      [key: string]: string | number | boolean | object | undefined | null;
    };
    steps: {
      [key: string]: {
        handler?: THandler;
        next: string[];
      };
    };
  };

export type LexerContext = {
  types: {
    [type: string]: TypeDefContext;
  };
  schemas: {
    [schema: string]: SchemaDefBlock;
  };
};

export type ConcreteZodSchemas = {
  types: {
    [type: string]: ZodAny;
  };
  schemas: {
    [schema: string]: ZodObject;
  };
};
