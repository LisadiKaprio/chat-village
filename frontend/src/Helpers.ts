// https://deno.land/std@0.132.0/testing/asserts.ts?source
// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible. Do not rely on good formatting of values
// for AssertionError messages in browsers.

export class AssertionError extends Error {
  override name = 'AssertionError'
  constructor(message: string) {
    super(message)
  }
}

/** * Make an assertion that actual is not null or undefined. * If not then throw. */
export function assertExists<T>(
  actual: T,
  msg?: string,
): asserts actual is NonNullable<T> {
  if (actual === undefined || actual === null) {
    if (!msg) {
      msg = `actual: "${actual}" expected to not be null or undefined`
    }
    throw new AssertionError(msg)
  }
}
