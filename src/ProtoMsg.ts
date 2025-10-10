import {
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodDefault,
  ZodEnum,
  ZodInt,
  ZodNumber,
  ZodString,
  ZodObject,
} from "zod/v4";

export type TZedTypeInfo =
  | { key: string; type: string; options?: string[]; elementType?: string }
  | undefined;

export default class ProtoMsg<T> {
  constructor(public name: string, public schema: ZodObject) {
    this.name = name;
    this.schema = schema;
  }

  getZodTypes(schema: ZodObject): Array<TZedTypeInfo> {
    return Object.entries(schema.shape).map(([key, shape]) => {
      if (shape instanceof ZodDefault) {
        const casted = shape as ZodDefault<ZodDate | ZodBoolean | ZodEnum>;
        const complexType = casted.def.innerType.type;

        return {
          key,
          type: complexType,
        };
      }

      const casted = shape as
        | ZodString
        | ZodNumber
        | ZodInt
        | ZodBigInt
        | ZodBoolean;

      return {
        key,
        type: casted.type,
      };
    });
  }

  createProto(name: string, types: Array<TZedTypeInfo>) {
    const protoMap: Record<string, string> = {
      string: "string",
      number: "double",
      int: "int32",
      bigint: "int64",
      boolean: "bool",
      date: "int64",
    };

    const lines = [`message ${name} {`];

    let i = 1;
    for (const t of types) {
      if (t === undefined) continue;

      const { type, key } = t;

      lines.push(`  ${protoMap[type]} ${key} = ${i++};`);
    }

    lines.push(`}`);

    return lines.join("\n");
  }

  build() {
    const propTypes = this.getZodTypes(this.schema);
    const proto = this.createProto(this.name, propTypes);

    return proto;
  }
}
