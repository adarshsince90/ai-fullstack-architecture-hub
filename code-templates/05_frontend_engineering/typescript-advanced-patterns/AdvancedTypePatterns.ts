/**
 * Enterprise Advanced TypeScript Utilities & Metaprogramming Patterns
 */

// =========================================================================
// 1. Deep Readonly Immutability Helper
// =========================================================================
export type DeepReadonly<T> = T extends Function | boolean | number | string | symbol | null | undefined
  ? T
  : T extends Array<infer U>
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer M>
  ? ReadonlySet<DeepReadonly<M>>
  : { readonly [K in keyof T]: DeepReadonly<T[K]> };

// =========================================================================
// 2. Discriminated Union Pattern Matcher (Exhaustive & Type-Safe)
// =========================================================================
export type Action =
  | { type: 'NAVIGATE'; payload: { route: string } }
  | { type: 'NOTIFY'; payload: { message: string; severity: 'info' | 'error' } }
  | { type: 'LOGOUT' };

export function matchAction<R>(
  action: Action,
  handlers: {
    NAVIGATE: (payload: { route: string }) => R;
    NOTIFY: (payload: { message: string; severity: 'info' | 'error' }) => R;
    LOGOUT: () => R;
  }
): R {
  switch (action.type) {
    case 'NAVIGATE': return handlers.NAVIGATE(action.payload);
    case 'NOTIFY': return handlers.NOTIFY(action.payload);
    case 'LOGOUT': return handlers.LOGOUT();
    default: {
      const _unreachable: never = action;
      throw new Error(`Unhandled action: ${_unreachable}`);
    }
  }
}

// =========================================================================
// 3. Type-Safe API Route & Client Builder with Template Literal Types
// =========================================================================
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = '/users' | '/orders' | '/analytics';

export type ApiRoute = `${HttpMethod} ${ApiEndpoint}`;

export interface EndpointContract<TReq, TRes> {
  request: TReq;
  response: TRes;
}

export type ApiSchema = {
  'GET /users': EndpointContract<void, { id: string; name: string }[]>;
  'POST /orders': EndpointContract<{ items: string[]; total: number }, { orderId: string; status: string }>;
};

export class TypeSafeApiClient {
  async call<Route extends keyof ApiSchema>(
    route: Route,
    req: ApiSchema[Route]['request']
  ): Promise<ApiSchema[Route]['response']> {
    const [method, path] = route.split(' ');
    console.log(`[API CALL] ${method} -> ${path}`, req);
    return {} as ApiSchema[Route]['response'];
  }
}
