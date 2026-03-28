export const GRAPHQL_TRANSPORT_WS = 'graphql-transport-ws';

export function createConnectionInit(payload) {
  return { type: 'connection_init', payload };
}

export function createSubscribe({ id, query, variables, operationName }) {
  return {
    id,
    type: 'subscribe',
    payload: {
      query,
      ...(variables ? { variables } : {}),
      ...(operationName ? { operationName } : {})
    }
  };
}
