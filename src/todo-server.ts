// Copyright (c) 2021-2022 Peter Matta
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { compose } from '@fp4ts/core';
import { Either, EitherT, Option } from '@fp4ts/cats';
import { IO, IOF } from '@fp4ts/effect';
import { JsonCodec } from '@fp4ts/schema-json';
import { HttpApp, MessageFailure, NotFoundFailure } from '@fp4ts/http';
import { builtins, toHttpAppIO } from '@fp4ts/http-dsl-server';
import { Transactor } from '@fp4ts/sql';

import { CreateTodo, Todo, TodoApi, TodoArray } from './todo-api';
import * as repo from './todo-repository';

export const server = (trx: Transactor<IOF>): HttpApp<IOF> => {
  const getAll =
    (limit: Option<number>) =>
    (offset: Option<number>) =>
    (done: Option<boolean>): IO<Todo[]> =>
      done.fold(
        () => repo.getAll({ limit, offset }),
        done => repo.getAllWhere(done, { limit, offset }),
      )
        .map(xs => xs.toArray)
        .transact(trx);

  const create = (todo: CreateTodo): IO<Todo> =>
    repo.create(todo).transact(trx);

  const update = (todo: Todo): IO<Either<MessageFailure, Todo>> =>
    repo
      .update(todo)
      .transact(trx)
      .map(opt => opt.toRight(() => new NotFoundFailure()));

  const getById = (id: number): IO<Either<MessageFailure, Todo>> =>
    repo
      .getById(id)
      .transact(trx)
      .map(opt => opt.toRight(() => new NotFoundFailure()));

  const deleteById = (id: number): IO<void> =>
    repo.deleteById(id).transact(trx);

  return toHttpAppIO(TodoApi, { ...builtins, "application/json": {
    'todo-api/create-todo': JsonCodec.fromSchema(CreateTodo.schema),
    'todo-api/todo': JsonCodec.fromSchema(Todo.schema),
    'todo-api/todo-array': JsonCodec.fromSchema(TodoArray.schema),
  }})(S => [
      limit => offset => compose(S.liftF, getAll(limit)(offset)),
      compose(S.liftF, create),
      compose(EitherT<IOF, MessageFailure, Todo>, update),
      compose(EitherT<IOF, MessageFailure, Todo>, getById),
      compose(S.liftF, deleteById),
  ]);
};
