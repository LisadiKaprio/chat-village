import { NonEmptyArray } from "./Types"

export const getRandom = <T>(array: NonEmptyArray<T>): T => {
    return array[Math.floor(Math.random() * array.length)]
  }