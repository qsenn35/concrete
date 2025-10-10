import { cz, CzInfer } from "./concrete-zod.ts";
import Module, { createModule } from "./Module.ts";

const TodoSchema = cz.object({
  id: cz.string().primary().server(), // specify this is our primary key & is server only
  title: cz.string().min(1).max(100).queryable(),
  completed: cz.boolean().optional().default(false),
});

type TodoType = CzInfer<typeof TodoSchema>

const TodoModule: Module<TodoType> = createModule<TodoType>("Todo", TodoSchema);

// await TodoModule.create({
//   id: "abcd1234",
//   title: "build concrete!",
// });

const data = await TodoModule.get("abcd1234");

console.log(data);