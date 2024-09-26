import esbuild from "esbuild";
esbuild.buildSync({
  nodePaths: ["./node_modules"],
  platform: "node",
  entryPoints: ["src/forwarder.ts"],
  bundle: true,
  external: ["net", "fs"],
  outfile: ".build/forwarder.js",
});
