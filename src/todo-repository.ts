// Copyright (c) 2021-2022 Peter Matta
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { List, Option } from '@fp4ts/cats';
import { Codec, Schema } from '@fp4ts/schema';
import { ConnectionIO, Read, sql } from '@fp4ts/sql';
import { CreateTodo, Todo } from './todo-api';

const SqliteTodo = Schema.struct({
  id: Schema.number,
  title: Schema.string,
  description: Schema.string.nullable,
  done: Schema.number.imap(Boolean, Number),
});

const sqliteTodoCodec = SqliteTodo.interpret(Codec.Schemable);
const todoRead = new Read(r => sqliteTodoCodec.decode(r).get);

export const setup: ConnectionIO<void> =
  sql`CREATE TABLE IF NOT EXISTS todo (
    |  id          INTEGER PRIMARY KEY,
    |  title       TEXT NOT NULL,
    |  description TEXT,
    |  done        INT NOT NULL DEFAULT FALSE
    |)`
    .stripMargin()
    .update()
    .run()
    .map(() => {});

type Pagination = { limit: Option<number>, offset: Option<number> };
export const getAll = (
  { limit, offset}: Pagination,
): ConnectionIO<List<Todo>> =>
  sql`SELECT *
    | FROM todo
    | LIMIT ${limit.getOrElse(() => 100)}
    | OFFSET ${offset.getOrElse(() => 0)}`
    .stripMargin()
    .query(todoRead)
    .toList();

export const getAllWhere = (
  done: boolean,
  { limit, offset }: Pagination,
): ConnectionIO<List<Todo>> =>
  sql`SELECT *
    | FROM todo
    | WHERE done = ${Number(done)}
    | LIMIT ${limit.getOrElse(() => 100)}
    | OFFSET ${offset.getOrElse(() => 0)}`
    .stripMargin()
    .query(todoRead)
    .toList();

export const getById = (id: number): ConnectionIO<Option<Todo>> =>
  sql`SELECT *
    | FROM todo
    | WHERE id = ${id}`
    .stripMargin()
    .query(todoRead)
    .toOption();

export const create = ({
  title,
  description,
}: CreateTodo): ConnectionIO<Todo> =>
  sql`INSERT INTO todo(title, description)
    | VALUES (${title}, ${description})
    | RETURNING *`
  .stripMargin()
  .update()
  .updateReturning(todoRead)
  .compileConcurrent(ConnectionIO.Async)
  .head;

export const update = ({
  id,
  title,
  description,
  done,
}: Todo): ConnectionIO<Option<Todo>> =>
  sql`UPDATE todo
    | SET title = ${title},
    |     description = ${description},
    |     done = ${Number(done)}
    | WHERE id = ${id}
    | RETURNING *`
    .stripMargin()
    .update()
    .updateReturning(todoRead)
    .compileConcurrent(ConnectionIO.Async)
    .headOption;

export const deleteById = (id: number): ConnectionIO<void> =>
  sql`DELETE FROM todo WHERE id = ${id}`
    .stripMargin()
    .update()
    .run()
    .map(() => {});
