import {AsyncLocalStorage} from 'node:async_hooks';
export const mysqlActor=new AsyncLocalStorage<string|null>();
