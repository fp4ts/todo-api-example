// Copyright (c) 2021-2022 Peter Matta
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { id, pipe } from '@fp4ts/core';;
import { Console, IO, IOF, unsafeRunMain } from '@fp4ts/effect';
import { NodeServerBuilder } from '@fp4ts/http-node-server';
import { HttpLogger } from '@fp4ts/http-server';
import { ConsoleLogger, LogFormat, TimestampLogger } from '@fp4ts/logging';
import { SqliteTransactor } from '@fp4ts/sql-sqlite';
import { setup } from './todo-repository';
import { server } from './todo-server';

const logger = HttpLogger(IO.Async)<IOF, IOF>(
  pipe(
    ConsoleLogger(IO.Async, Console.make(IO.Async))
      .format(LogFormat.default<string>()),
    TimestampLogger(IO.Async, IO.Async),
  ),
  id,
);
const middleware = logger;

const main: IO<void> = IO.Monad.do(function* (_) {
  const trx = SqliteTransactor.make(IO.Async, 'todo.db');
  const app = server(trx);

  yield* _(setup.transact(trx));
  yield* _(
    NodeServerBuilder.make(IO.Async)
      .bindLocal(3000)
      .withHttpApp(middleware(app))
      .serve()
      .compileConcurrent()
      .drain
    );
});

unsafeRunMain(main);
