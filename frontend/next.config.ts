import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* This app is an auth-gated client-rendered SPA - every page depends on runtime
   * user/auth state, so static prerendering has nothing useful to cache. */
};

export default nextConfig;
