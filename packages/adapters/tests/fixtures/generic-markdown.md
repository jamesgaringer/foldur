# Conversation about testing

## User

How should I structure my test files?

## Assistant

A common pattern is to co-locate test files next to the source files with a `.test.ts` suffix, or keep them in a parallel `tests/` directory.

## User

What about integration tests?

## Assistant

Integration tests typically go in a top-level `tests/` or `__tests__/` directory, separate from unit tests.
