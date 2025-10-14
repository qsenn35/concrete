import z from "zod/v4";
import { cz, CzInfer } from "./concrete-zod.ts";
import Module, { createModule } from "./Module.ts";

const TodoSchema = cz.object({
  id: cz.string().primary().private(), // specify this is our primary key & is server only
  title: cz.string().min(1).max(100).queryable(),
  completed: cz.boolean().optional().default(false),
});

type TodoType = CzInfer<typeof TodoSchema>;

const User = {
  server: (
    cz.object({
      id: cz.number(),
      phoneNumber: cz.string(),
      address: cz.string(),
    })
  ),
  client: (
    cz.object({
      displayName: cz.string(),
      username: cz.string(),
      bio: cz.string(),
    })
  )
};

const exampleUser = {
  id: 1,
  phoneNumber: "1800CONCRETE",
  address: "127 Localhost Lane, Silicon Valley, CA 12345",
  displayName: "Concrete Inc.",
  username: "concrete",
  bio: "Hello, Sidewalk!",
};

const TodoModule: Module<TodoType> = createModule<TodoType>("Todo", TodoSchema);

// await TodoModule.create({
//   id: "abcd1234",
//   title: "build concrete!",
// });

// await TodoModule.mutate("abcd1234", {
//   completed: false,
// });

const updated = await TodoModule.query("abcd1234");

console.log(updated);
