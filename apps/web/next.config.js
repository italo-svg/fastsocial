/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // konva resolve para um entrypoint Node ("canvas") mesmo quando so usado client-side
  // (react-konva com next/dynamic ssr:false) — ver spec 014, editor de slot map.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

module.exports = nextConfig;
