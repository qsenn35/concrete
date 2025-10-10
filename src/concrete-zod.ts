import { z } from "zod/v4";

declare module "zod/v4" {
  interface ZodTypeAny {
    primary(): this;
    _$concrete_primary?: boolean;

    server(): this;
    _$concrete_serverOnly: boolean;

    queryable(): this;
    _$concrete_queryable?: boolean;
  }
}

export function zodEnhance(zCore: typeof z) {
  zCore.ZodType.prototype.server = function() {
    this._$concrete_serverOnly = true;

    return this;
  }

  zCore.ZodType.prototype.primary = function() {
    this._$concrete_primary = true;

    return this;
  }

  zCore.ZodType.prototype.queryable = function() {
    this._$concrete_queryable = true;

    return this;
  }

  return zCore;
}

export const cz = zodEnhance(z);
export type CzInfer<T> = z.infer<T>;