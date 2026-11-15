// Next.js yalnızca arayüzü sunar. Video işleme, yapay zeka ve dosya işleri yerel Node API'de (server.js, 5179) kalır;
// aşağıdaki yönlendirmeler tarayıcıdan gelen /api, /output ve /work isteklerini oraya iletir.
const API = process.env.KESIT_API || "http://127.0.0.1:5179";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Büyük video yüklemeleri yönlendirmeden geçer; varsayılan 10 MB sınırını kaldır.
  experimental: {
    proxyClientMaxBodySize: "8gb",
    proxyTimeout: 2 * 60 * 60 * 1000,
  }, // indirme/render dakikalar sürer; varsayılan 30 sn'de "Internal Server Error" verir
  async rewrites() {
    return {
      // "/" tanıtım sitesi, "/app" Kesit stüdyosu (public/index.html)
      beforeFiles: [
        { source: "/", destination: "/landing.html" },
        { source: "/app", destination: "/index.html" },
        { source: "/login", destination: "/login.html" },
        { source: "/signup", destination: "/signup.html" },
        { source: "/forgot", destination: "/forgot.html" },
        { source: "/reset", destination: "/reset.html" },
        { source: "/legal/terms", destination: "/legal/terms.html" },
        { source: "/legal/privacy", destination: "/legal/privacy.html" },
        { source: "/legal/kvkk", destination: "/legal/kvkk.html" },
        { source: "/legal/cookies", destination: "/legal/cookies.html" },
        { source: "/legal/copyright", destination: "/legal/copyright.html" },
      ],
      afterFiles: [],
      fallback: [
        { source: "/api/:path*", destination: `${API}/api/:path*` },
        { source: "/output/:path*", destination: `${API}/output/:path*` },
        { source: "/work/:path*", destination: `${API}/work/:path*` },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};
export default nextConfig;
