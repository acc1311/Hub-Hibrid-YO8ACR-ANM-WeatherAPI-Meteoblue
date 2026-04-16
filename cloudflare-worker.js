// ============================================================
// Cloudflare Worker — Proxy pentru meteoromania.ro (VERSIUNE LIVE)
// ============================================================

const TARGET_URL = "https://www.meteoromania.ro/wp-json/meteoapi/v2/starea-vremii";

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      // Forțăm cererea către ANM să ignore orice cache existent
      const response = await fetch(TARGET_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json, */*",
          "Referer": "https://www.meteoromania.ro/",
          "Cache-Control": "no-cache", // Spunem serverului ANM că vrem date noi
          "Pragma": "no-cache"
        },
        cf: {
          // MODIFICARE CRUCIALĂ: Setăm cache la 0 secunde
          cacheTtl: 0, 
          cacheEverything: false
        }
      });

      if (!response.ok) {
        return new Response(`Eroare ANM: HTTP ${response.status}`, { 
          status: response.status,
          headers: corsHeaders()
        });
      }

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json",
          // Spunem browserului tău să nu salveze datele mai mult de 30 secunde
          "Cache-Control": "public, no-cache, no-store, must-revalidate",
        }
      });

    } catch (err) {
      return new Response(`Eroare worker: ${err.message}`, { 
        status: 500,
        headers: corsHeaders()
      });
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}