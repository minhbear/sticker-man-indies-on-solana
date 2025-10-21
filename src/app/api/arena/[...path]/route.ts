import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.ARENA_DIRECT_API_URL || 'https://airdrop-arcade.onrender.com/api';

function buildTargetUrl(pathSegments: string[] = []): string {
  const cleanedSegments = pathSegments.filter(Boolean).join('/');
  return `${API_BASE_URL}/${cleanedSegments}`;
}

function cloneRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'host' || lowerKey === 'content-length' || lowerKey === 'connection') {
      return;
    }
    headers.set(key, value);
  });

  return headers;
}

async function proxy(request: NextRequest, method: string, pathSegments: string[] = []) {
  const targetUrl = buildTargetUrl(pathSegments);
  const headers = cloneRequestHeaders(request);

  try {
    const body =
      method === 'GET' || method === 'HEAD'
        ? undefined
        : await request.arrayBuffer();

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Arena proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Arena service unavailable' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, 'GET', path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, 'POST', path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, 'PUT', path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, 'PATCH', path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, 'DELETE', path);
}
