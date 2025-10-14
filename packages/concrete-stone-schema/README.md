# Concrete Schema DSL

## Disclaimer
You do not have to use Concrete's Schema DSL. All functionality is accessible through Concrete's enhanced version of Zod. This is purely syntactic sugar to make schema definition less tedious.

---

## Introduction
Concrete requires a Zod schema definition to function. The goal of Concrete is to minimize how many times you need to describe your data.  
Concrete provides a Domain-Specific Language (DSL) to define schemas. Under the hood, these resolve to Zod schemas with enhancements that allow Concrete to understand more about your data.

Concrete’s DSL is 1:1 compatible with Zod, TypeScript, and JSON Schema.

---

## Descriptors
Descriptors are tokens used to describe schema and module properties.  
They can be types, formats, configs, or schemas.

---

### Types
All Zod data types are included in Concrete's DSL by default.

```
propertyName: (type);
```

---

### Formats
Formats specify the format of the data — e.g., string lengths, numeric ranges, regex patterns. Any format available in Zod is available in Concrete.

```
propertyName: (type, format());
```

---

### Configs
Configs do not describe the data directly.  
They pass values to the post-compile step to attach metadata to the schema.

Example: defining a primary config to mark a property as the primary key.

```
config primary {
  _$concrete_primary: true;
}
```
---

## Custom Descriptors

### Custom Types
You can define reusable types as collections of descriptors.

```
type email (
  string,     
  minLength(3), 
  maxLength(255),
  regex(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/)
)

type uid (
  string,
  length(36),
  regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
)
```
---

### Custom Formats
Custom formats group multiple format rules for reuse in types or schemas.
```
format positiveNumber (
  min(1),
)
```
---

### Custom Configs
Custom configs attach additional metadata or behavior to a schema.
```
config primary {
  _$concrete_primary: true;
}
```
---

## Schemas
Schemas are collections of property -> descriptor pairs, optionally with configuration properties.

---

### Scopes
By default, schema properties are private, meaning they are not accessible to clients unless explicitly exposed.  
Scopes define which properties are accessible externally. The predefined @public scope exposes properties to clients.

Custom scopes are not supported yet.

Example:
```
schema UserSchema {
  id: (primary, bigint);
  uid: (string, uid);
  email: (string, email);

  :@public {
    displayName: (string, minLength(3));
    username: (string, minLength(3));
    bio: (string);
    avatarUrl: (string);
  }
}
```
Alternate form:
```
@public schema UserSchema {
  displayName: (string, minLength(3));
  username: (string, minLength(3));
  bio: (string);
  avatarUrl: (string);
}
```
---

## Modules
Modules are similar to schemas but also define procedures with arguments and return types.  
You can use with to specify a schema that the module implements.

Example:
```
module User with UserSchema {
  :@public {
    get(id: number): (User);
    getByEmail(email: string): (User);
    getByUUID(uuid: string): (User);
  }
}
```