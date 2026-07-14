import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server actions default to a 1MB request body — a raw phone photo exceeds
    // that and is rejected before the action (and its try/catch) runs, which was
    // the avatar-upload crash. Client-side downscale keeps uploads well under
    // this, but the raised limit backstops the downscale-failure / HEIC path.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
