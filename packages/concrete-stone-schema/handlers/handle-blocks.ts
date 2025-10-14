import { BlockType, MooLexer, MooLexerResult, StateMachine } from "../types.ts";

export function handleBlock<TBlockType = BlockType, TValue = string>(
  lexer: MooLexer,
  block: BlockType,
  stateMachine: StateMachine<TBlockType, TValue>
) {
  let token: MooLexerResult | undefined = lexer.next();
  while (
    stateMachine.steps[stateMachine.current]?.next &&
    stateMachine.steps[stateMachine.current]?.next?.length
  ) {
    const currentStep = stateMachine.steps[stateMachine.current];
    if (stateMachine.current === token?.type && currentStep?.handler) {
      currentStep.handler(
        stateMachine.state,
        block as TBlockType,
        token.value as TValue
      );
    }

    token = lexer.next();
    if (!token) break;

    if (token.type === "ws" || token.type === "comment") {
      continue;
    }

    stateMachine.current = token.type;

    const nextStep = stateMachine.steps[stateMachine.current];
    if (!nextStep) break;
  }

  return block;
}
