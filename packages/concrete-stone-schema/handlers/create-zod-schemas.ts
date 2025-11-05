import { FormatLexerResult, SchemaDefBlock, TypeDefContext } from "../types.ts";
import { z, ZodAny } from "zod/v4";

type ZodFactoryKey = keyof typeof z;

export function convertToJSONSchema(obj: ZodSchemaDefObject) {
  return z.toJSONSchema(obj);
}

export function getZodTypeMethod(source: typeof z, key: ZodFactoryKey) {
  const fn = source[key];
  if (typeof fn === "function") {
    return (fn as () => ZodAny)();
  }
  return undefined;
}

export function getZodMethod(source: ZodAny, key: keyof ZodAny) {
  const fn = source[key];
  return fn ?? undefined;
}

export function handleDescriptor(descriptor: string, zodObject: ZodAny) {
  const method = getZodMethod(zodObject, descriptor as keyof ZodAny);
  if (!method) return descriptor;

  return method();
}

export function coerceArg(input: string) {
  if (input === "true" || input === "false")
    return z.coerce.boolean().parse(input);
  if (!isNaN(parseInt(input)) && input.trim() !== "")
    return z.coerce.number().parse(input);

  try {
    const json = JSON.parse(input);

    return json;
    // deno-lint-ignore no-empty
  } catch {}

  try {
    const match = input.match(/^\/(.+)\/([gimsuy]*)$/);
    if (!match) return input;

    new RegExp(match[1], match[2]);
    // deno-lint-ignore no-empty
  } catch {}

  return input;
}

export function handleFormat(format: FormatLexerResult, zodObject: ZodAny) {
  const method = getZodMethod(zodObject, format.type as keyof ZodAny);
  const coerced = format.args.map((a) => coerceArg(a));
  if (!method) return format;

  return method(...coerced);
}

export function handleSchemaDef() {}

export function createZodTypeSchema(
  block: TypeDefContext,
  initialZod?: ZodAny,
): ZodAny | undefined {
  const { descriptors, formats } = block;
  const zodObject =
    initialZod ?? getZodTypeMethod(z, descriptors.shift() as ZodFactoryKey);

  if (!zodObject) return undefined;

  let currentZod = zodObject;
  for (const d of descriptors) {
    currentZod = handleDescriptor(d, currentZod);
  }

  for (const f of formats) {
    currentZod = handleFormat(f, currentZod);
  }

  return currentZod;
}

type ZodSchemaDefProp<T> = T & { zodObject?: ZodAny | undefined };

type ZodSchemaDefObject = Record<string, ZodAny | undefined>;

type ZodSchemaDef = {
  category: "schema";
  name: string;
  props: {
    [name: string]:
      | ZodSchemaDefProp<SchemaDefBlock>
      | ZodSchemaDefProp<TypeDefContext>;
  };
  scopes: {
    [access: string]: SchemaDefBlock;
  };
  zodObject?: any;
};

export function createZodSchema(block: SchemaDefBlock, zodObject: any = {}) {
  const { props } = block;
  const entries = Object.entries(props);

  for (const [name, propBlock] of entries) {
    const key = name as keyof ZodSchemaDef["props"];

    if (propBlock.category === "type") {
      const cloned = { ...propBlock } as TypeDefContext;
      const zodTypeBlock = createZodTypeSchema(cloned as TypeDefContext);

      zodObject[key] = zodTypeBlock;
      continue;
    }

    if (block.category === "schema") {
      const cloned = { ...propBlock } as SchemaDefBlock;
      const schema = createZodSchema(cloned, {});

      zodObject[key] = schema;
    }
  }

  return z.object(zodObject);
}

export function createZodObject(block: TypeDefContext | SchemaDefBlock) {
  if (block.category === "type") {
    return createZodTypeSchema(block as TypeDefContext);
  }

  if (block.category === "schema") {
    return createZodSchema(block as ZodSchemaDef);
  }
}
