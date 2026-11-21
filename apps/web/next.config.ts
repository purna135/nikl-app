import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Shared workspace packages ship TypeScript source, so Next compiles them.
  transpilePackages: ["@nikl/tokens", "@nikl/utils", "@nikl/validation", "@nikl/supabase"],
};

export default nextConfig;
