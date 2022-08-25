// Copyright (c) 2021-2022 Peter Matta
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { booleanType, numberType, TypeOf } from '@fp4ts/core';
import { Schema } from '@fp4ts/schema';
import {
  Capture,
  DeleteNoContent,
  Get,
  group,
  JSON,
  PostCreated,
  Put,
  QueryParam,
  ReqBody,
  Route,
 } from '@fp4ts/http-dsl';

export const CreateTodo = Schema.struct({
  title: Schema.string,
  description: Schema.string.nullable,
}).as('todo-api/create-todo');
export type CreateTodo = TypeOf<typeof CreateTodo>;

export const Todo = Schema.struct({
  id: Schema.number,
  title: Schema.string,
  description: Schema.string.nullable,
  done: Schema.boolean,
}).as('todo-api/todo');
export type Todo = TypeOf<typeof Todo>;

export const TodoArray = Todo.schema.array.as('todo-api/todo-array');

export const TodoApi = group(
  Route('todo')
    [':>'](QueryParam('limit', numberType))
    [':>'](QueryParam('offset', numberType))
    [':>'](QueryParam('done', booleanType))
    [':>'](Get(JSON, TodoArray)),
  Route('todo')
    [':>'](ReqBody(JSON, CreateTodo))
    [':>'](PostCreated(JSON, Todo)),
  Route('todo')
    [':>'](ReqBody(JSON, Todo))
    [':>'](Put(JSON, Todo)),
  Route('todo')
    [':>'](Capture('id', numberType))
    [':>'](Get(JSON, Todo)),
  Route('todo')
    [':>'](Capture('id', numberType))
    [':>'](DeleteNoContent),
);
