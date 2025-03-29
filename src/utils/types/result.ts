export type Result<T, E> =
  | { ok: true; value: T; map: <U>(fn: (value: T) => U) => Result<U, E> }
  | { ok: false; error: E; map: <T>(fn: (value: T) => T) => Result<T, E> }

export function Ok<T, E>(value: T): Result<T, E> {
  return {
    ok: true,
    value,
    map: function <U>(fn: (value: T) => U): Result<U, E> {
      return Ok(fn(this.value))
    },
  }
}

export function Err<T, E>(error: E): Result<T, E> {
  return {
    ok: false,
    error,
    map: function <T>(_fn: (value: T) => T): Result<T, E> {
      return this
    },
  }
}
