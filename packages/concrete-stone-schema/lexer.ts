import moo from "moo";

export const lexer = moo.compile({
  ws: { match: /\s+/, lineBreaks: true },
  comment: /\/\/.*?$/,
  open_paren: "(",
  close_paren: ")",
  open_curly: "{",
  close_curly: "}",
  comma: ",",
  end_line: ";",

  // Keywords
  type_def: "type",
  format_def: "format",
  schema_def: "schema",
  module_def: "module",

  // Directives
  prop_directive: /:@[a-zA-Z_][a-zA-Z0-9_]*/,
  directive: /@[a-zA-Z_][a-zA-Z0-9_]*/,

  // Formats (non-greedy to avoid swallowing braces)
  format: {
    match: /[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)/,
    value: (x: string) => {
      const nameMatch = x.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
      const argsMatch = x.match(/\(([^)]*)\)/);

      const name = nameMatch ? nameMatch[1] : null;
      const argsRaw = argsMatch ? argsMatch[1].trim() : "";

      // split by commas while preserving regex args, strings, etc.
      const args = argsRaw.length
        ? argsRaw
            .split(/,(?=(?:[^/]*\/[^/]*\/)*[^/]*$)/) // avoid splitting inside regex
            .map((s: string) => s.trim())
        : [];

      return { type: name, args };
    },
  },

  // Identifiers and fields
  prop_identifier: {
    match: /[a-zA-Z_][a-zA-Z0-9_]*:/,
    value: (x: string) => x.substring(0, x.length - 1),
  },
  nested_schema_identifier: /:[a-zA-Z_][a-zA-Z0-9_]*/,
  identifier: /[a-zA-Z_][a-zA-Z0-9_]+/,

  // Regex literals (no capture groups)
  regex: {
    match: /\/(?:\\\/|[^\n\/])*\/[gimsuy]*/,
    value: (x: string) => x,
  },

  number: /[0-9]+/,
  string: {
    match: /"(?:\\["\\]|[^\n"\\])*"/,
    value: (x: string) => x.slice(1, -1),
  },
  punctuation: /[:]/,
});
