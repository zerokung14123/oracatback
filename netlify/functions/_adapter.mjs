export async function runHandler(event, handler) {
  const request = toRequest(event);
  const response = await handler(request);
  return fromResponse(response);
}

function toRequest(event) {
  const headers = new Headers();
  Object.entries(event.headers || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) headers.set(key, value);
  });

  const origin = headers.get('origin') || siteOrigin(event);
  if (origin && !headers.has('origin')) headers.set('origin', origin);

  const method = event.httpMethod || 'GET';
  const body = ['GET', 'HEAD'].includes(method)
    ? undefined
    : event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64')
      : event.body || '';

  return new Request(event.rawUrl || requestUrl(event), {
    method,
    headers,
    body,
  });
}

async function fromResponse(response) {
  const headers = {};
  const multiValueHeaders = {};

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      multiValueHeaders['Set-Cookie'] = [value];
    } else {
      headers[key] = value;
    }
  });

  return {
    statusCode: response.status,
    headers,
    multiValueHeaders,
    body: await response.text(),
  };
}

function requestUrl(event) {
  const origin = siteOrigin(event) || 'https://localhost';
  return new URL(event.path || '/', origin).toString();
}

function siteOrigin(event) {
  const host = event.headers?.host || event.headers?.Host;
  return host ? `https://${host}` : '';
}
