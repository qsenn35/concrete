import { z } from "zod/v4";
import {
  ConcreteZodSchemas,
  FormatLexerResult,
  LexerContext,
  TypeDefContext,
} from "./concrete-stone-schema/types.ts";
import { ZodAny } from "zod/v4";

type ZodFactoryKey = keyof typeof z;

function coerceArg(value: string): any {
  if (value === "true") return true;
  if (value === "false") return false;

  if (!isNaN(Number(value)) && value.trim() !== "") return Number(value);

  if (/^\/.*\/[gimsuy]*$/.test(value)) {
    const match = value.match(/^\/(.*)\/([gimsuy]*)$/);
    if (match) return new RegExp(match[1], match[2]);
  }

  try {
    if (
      (value.startsWith("{") && value.endsWith("}")) ||
      (value.startsWith("[") && value.endsWith("]"))
    ) {
      return JSON.parse(value);
    }
  } catch {}

  // fallback to string
  return value;
}
function handleFormat(factory: ZodAny, format: FormatLexerResult) {
  const { type, args } = format;
  const methodKey = type as keyof typeof factory;
  const coercedArgs = args.map((arg) => coerceArg(arg));
  const factoryMethod = factory[methodKey];

  if (!factoryMethod || typeof factoryMethod !== "function")
    throw new Error(`Invalid zod factory method: ${methodKey}`);

  return factory[methodKey](...coercedArgs);
}

export function reduceDataType(datatype: ZodFactoryKey) {
  const fn = z[datatype] as () => ZodAny;
  if (typeof fn !== "function") return undefined;

  return fn();
}

export function handleFormats(typeDef: TypeDefContext, currentType: ZodAny) {
  for (const format of typeDef.formats) {
    currentType = handleFormat(currentType as ZodAny, format);
  }

  return currentType;
}

export function handleDescriptors(
  typeDef: TypeDefContext,
  currentType: ZodAny
) {
  for (const descriptor of typeDef.descriptors) {
  }

  return currentType;
}

export function handleDirectives(
  zodSchemas: ConcreteZodSchemas,
  typeDef: TypeDefContext
) {
  const datatype = typeDef.descriptors.shift();

  if (!datatype)
    throw new Error(`Types must specify their datatype as the first item.`);

  const customType = zodSchemas.types[datatype];
  let currentType = customType ?? reduceDataType(datatype as ZodFactoryKey);
  if (!currentType) return datatype;

  currentType = handleFormats(typeDef, currentType);
  currentType = handleDescriptors(typeDef, currentType);

  return currentType;
}

export function createZodSchemas(lexerContext: LexerContext) {
  const { types, schemas } = lexerContext;
  const zodSchemas: ConcreteZodSchemas = {
    types: {},
    schemas: {},
  };
  const customTypes = [];

  for (const prop in types) {
    const key = prop as keyof LexerContext["types"];
    const typeDef = types[key];
    const zodType = handleDirectives(zodSchemas, typeDef);

    // a string return means the type was not a supported
    // zod type, assume it's custom
    if (typeof zodType === "string") {
      customTypes.push({
        prop,
        type: zodType,
      });

      continue;
    }

    zodSchemas.types[key] = zodType;
  }

  // if we have custom types, resolve them.
  if (customTypes.length > 0) {
    let i = 0;
    while (customTypes.length > 0) {
      const item = customTypes[i++];
      const type = item.type as keyof ConcreteZodSchemas["types"];
      const zodSchema = zodSchemas.types[type];

      // this mean we potentially hit a type
      // that is also a depending on another custom type.
      // we'll eventually hit it again.
      if (!zodSchema) continue;

      const key = item.prop as keyof LexerContext["types"];
      const typeDef = lexerContext.types[item.prop];

      let currentType = zodSchema;

      currentType = handleFormats(typeDef, currentType);
      currentType = handleDescriptors(typeDef, currentType);

      zodSchemas.types[key] = currentType;
      customTypes.shift();
    }
  }

  for (const schema in schemas) {
    const zodSchema: {
      [key: string]: ZodAny;
    } = {};
    const key = schema as keyof ConcreteZodSchemas["schemas"];
    const concreteSchema = schemas[key];
    const { props } = concreteSchema;

    for (const propName in props) {
      const propKey = propName as keyof typeof props;
      const typeDef = props[propKey];
      const zodType = handleDirectives(zodSchemas, typeDef);

      if (!zodType)
        throw new Error(
          `Failed to construct type ${typeDef.name} for prop ${propName} of Schema ${schema}`
        );
      if (typeof zodType === "string") continue;

      zodSchema[propKey] = zodType;
    }

    zodSchemas.schemas[key] = z.object(zodSchema);
  }

  console.log(
    zodSchemas.schemas["Basic"].def.shape,
    zodSchemas.schemas["Basic"].def.shape.someProp.def.innerType.def.checks
  );
}
