export const GRAPHQL_TRANSPORT_WS = 'graphql-transport-ws';

export function connectionInit(payload) {
  return {
    type: 'connection_init',
    payload: payload ?? {}
  };
}

export function subscribeMessage(id, query, variables, operationName) {
  const payload = { query };
  if (variables) payload.variables = variables;
  if (operationName) payload.operationName = operationName;
  return {
    id,
    type: 'subscribe',
    payload
  };
}
