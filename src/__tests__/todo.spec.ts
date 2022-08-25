// Copyright (c) 2021-2022 Peter Matta
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import '@fp4ts/effect-test-kit/lib/jest-extension';
import request from 'supertest';
import { IO } from '@fp4ts/effect';
import { SqliteTransactor } from '@fp4ts/sql-sqlite';
import { withServerResource } from '@fp4ts/http-test-kit-node';

import { server } from '../todo-server';
import { setup } from '../todo-repository';

describe('Todo Api', () => {
  const serverResource = SqliteTransactor
    .memory(IO.Async)
    .evalTap(trx => setup.transact(trx))
    .map(server);

  it.M('should create an incomplete todo', () =>
    withServerResource(serverResource)(server =>
      IO.deferPromise(() =>
        request('')
          .post(`http://${server.address}/todo`)
          .send({ title: 'test', description: null })
          .then(res => {
            expect(res.statusCode).toBe(201);
            expect(res.body).toEqual({
              id: 1,
              title: 'test',
              description: null,
              done: false,
            });
          }),
      ),
    ),
  );

  it.M('should retrieve all todos', () =>
    withServerResource(serverResource)(server =>
      IO.deferPromise(() =>
        request('')
          .post(`http://${server.address}/todo`)
          .send({ title: 'test1', description: null })
          .then(() =>
            request('')
              .post(`http://${server.address}/todo`)
              .send({ title: 'test2', description: null })
          )
          .then(() => request('').get(`http://${server.address}/todo`))
          .then(res => {
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([
              {
                id: 1,
                title: 'test1',
                description: null,
                done: false,
              },
              {
                id: 2,
                title: 'test2',
                description: null,
                done: false,
              }
            ]);
          }),
      ),
    ),
  );
  
  it.M('should complete an incomplete todo', () =>
    withServerResource(serverResource)(server =>
      IO.deferPromise(() =>
        request('')
          .post(`http://${server.address}/todo`)
          .send({ title: 'test', description: null })
          .then(res =>
            request('')
              .put(`http://${server.address}/todo`)
              .send({ ...res.body, done: true })
          )
          .then(() => request('').get(`http://${server.address}/todo?done=true`))
          .then(res => {
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([
              {
                id: 1,
                title: 'test',
                description: null,
                done: true,
              },
            ]);
          }),
      ),
    ),
  );
});
