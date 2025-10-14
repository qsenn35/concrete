import { ZodObject, ZodTypeAny } from "zod/v4";
import { cz } from "./concrete-zod.ts";
import ProtoMsg from "./ProtoMsg.ts";
import kv from "./kv.ts";

export default class Module<T> {
  private protoMsg: ProtoMsg<T>;
  private primaryKey: keyof T | undefined;

  constructor(public name: string, public schema: ZodObject) {
    this.protoMsg = new ProtoMsg<T>(this.name, this.schema);

    this.init();
  }

  init() {
    for (const key in this.schema.shape) {
      const casted = key as keyof typeof this.schema;
      const prop = this.schema.shape[casted] as ZodTypeAny;

      if (prop._$concrete_primary) 
        this.primaryKey = casted as keyof T;
    }

    if (!this.primaryKey) throw new Error("Module requires a primary key to be set.");
  }

  build() {
    return [
      this.protoMsg.build(),
    ].join('\n');
  }

  async create(data: T | Partial<T>) {
    try {
      const parsed = this.schema.parse(data);
      const r = await kv.set([this.name, data[this.primaryKey!] as Deno.KvKeyPart], JSON.stringify(parsed));

      return r;
    } catch(error) {
      throw error;
    }
  }

  async query(id: Deno.KvKeyPart): Promise<T | null> {
    try {
      const r = await kv.get<T>([this.name, id as Deno.KvKeyPart]);

      return r.value;
    } catch(error) {
      throw error;
    }
  }

  async mutate(id: Deno.KvKeyPart, patch: Partial<T>) {
    const current = await this.query(id);

    if (!current) throw new Error(`Resource at [$ {this.name}, ${id as string} ] does not exist.`)

    const patched = { ...current, ...patch }; // NOTE: not a deep merge. not important rn
    const r = await kv.set([this.name, id], patched);

    return r;
  }
  
  async remove(id: Deno.KvKeyPart) {
    const r = await kv.delete([this.name, id]);

    return r;
  }
}

export function createModule<T>(name: string, schema: ZodObject): Module<T> {
  return new Module<T>(name, schema);
}