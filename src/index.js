export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    if (path === "/" || path === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "opencode-proxy" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let upstreamPath = path;
    if (upstreamPath.startsWith("/compat/")) {
      upstreamPath = upstreamPath.slice(7);
    } else if (upstreamPath === "/compat") {
      upstreamPath = "/";
    }
    if (!upstreamPath.startsWith("/")) {
      upstreamPath = "/" + upstreamPath;
    }

    const upstreamBase = "https://opencode.ai/zen/go";
    const upstreamUrl = upstreamBase + upstreamPath + url.search;

    const apiKey = env.OPENCODE_API_KEY;

    const upstreamHeaders = new Headers();
    upstreamHeaders.set("Content-Type", request.headers.get("Content-Type") || "application/json");
    upstreamHeaders.set("Authorization", "Bearer " + apiKey);
    upstreamHeaders.set("Accept", request.headers.get("Accept") || "application/json");
    upstreamHeaders.set("User-Agent", "opencode-proxy/1.0");

    const session = request.headers.get("x-opencode-session") || generateSessionId();
    upstreamHeaders.set("x-opencode-session", session);

    if (request.headers.get("Accept-Encoding")) {
      upstreamHeaders.set("Accept-Encoding", request.headers.get("Accept-Encoding"));
    }

    const init = {
      method: request.method,
      headers: upstreamHeaders,
    };

    if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
      init.body = await request.text();
    }

    try {
      const response = await fetch(upstreamUrl, init);
      const respHeaders = new Headers(response.headers);
      respHeaders.set("Access-Control-Allow-Origin", "*");

      const ct = response.headers.get("content-type") || "";
      if (ct.includes("text/html")) {
        const body = await response.text();
        return new Response(JSON.stringify({
          error: "upstream returned HTML (404)",
          upstreamUrl: upstreamUrl,
          upstreamStatus: response.status,
          session: session,
          bodyPreview: body.substring(0, 300)
        }, null, 2), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: respHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, upstreamUrl: upstreamUrl }, null, 2), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
