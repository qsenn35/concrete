import { expect } from "@std/expect";
import { tokenize } from "../index.ts";
import { TypeDefContext } from "../types.ts";

Deno.test("parse various type definitions", async (t) => {
  const checkToken = (
    token: TypeDefContext,
    datatype: string,
    descriptorsLength: number,
    formatsLength: number,
    min?: string,
    max?: string
  ) => {
    expect(token.category).toBe("type");
    expect(token.type).toBeTruthy();
    expect(token.type!.length).toBeGreaterThan(0);

    if (descriptorsLength !== undefined) {
      expect(token.descriptors).toHaveLength(descriptorsLength);

      if (descriptorsLength > 0) expect(token.descriptors[0]).toBe(datatype);
    }

    if (formatsLength !== undefined) {
      expect(token.formats).toHaveLength(formatsLength);

      if (formatsLength > 0) {
        if (formatsLength === 2 && max !== undefined) {
          expect(token.formats[1].type).toBe("max");
          expect(token.formats[1].args[0]).toBe(max);
        } else {
          if (min !== undefined) {
            expect(token.formats[0].type).toBe("min");
            expect(token.formats[0].args[0]).toBe(min);
          }
          if (max !== undefined) {
            expect(token.formats[0].type).toBe("max");
            expect(token.formats[0].args[0]).toBe(max);
          }
        }
      }
    }
  };

  await t.step("basic types", async () => {
    const input = await Deno.readTextFile(
      "./packages/concrete-stone-schema/tests/inputs/basic-types.stone"
    );

    const tokens = tokenize(input);
    expect(tokens).toHaveLength(3);

    const types = ["number", "string", "boolean"];
    let i = 0;

    for (const type of types) {
      checkToken(tokens[i], type, 1, 0);
      i++;
    }
  });

  await t.step("number types with formats", async () => {
    const input = await Deno.readTextFile(
      "./packages/concrete-stone-schema/tests/inputs/format-number-types.stone"
    );

    const tokens = tokenize(input);
    expect(tokens).toHaveLength(3);

    checkToken(tokens[0], "number", 1, 1, "1");
    checkToken(tokens[1], "number", 1, 1, undefined, "99");
    checkToken(tokens[2], "number", 1, 2, "1", "1000");
  });
});
